/**
 * Context Service
 *
 * Aggregates context from multiple sources (memory, patterns, user state)
 * and provides context-aware querying capabilities
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import {
  ContextItem,
  ContextCategory,
  ContextRelevance,
  ContextTimeWindow,
  ContextMetadata,
  UserContext,
  ContextSummary,
  ContextAggregationOptions,
  ContextQuery,
  ContextSearchResult,
  UpdateContextInput,
  RelevanceFactors,
  getTimeWindowForDate,
  getRelevanceLevelFromScore,
  isContextExpired,
  getTimeOfDay,
  calculateRecencyScore,
  getDefaultExpiry,
  calculateRelevanceScore,
  detectPatternDeviation,
  StateContextData,
  EnvironmentContextData,
} from '../types/context.js';
import { MemoryService } from './memory.js';
import { PatternService } from './pattern.js';
import { MemoryType, MemorySearchQuery } from '../types/memory.js';
import { PatternType, Pattern } from '../types/pattern.js';
import { NotFoundError } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ContextService {
  constructor(
    private db: Pool,
    private memoryService: MemoryService,
    private patternService: PatternService
  ) {}

  // ==========================================================================
  // Context CRUD Operations
  // ==========================================================================

  /**
   * Create a new context item
   */
  async createContextItem(input: UpdateContextInput): Promise<ContextItem> {
    const now = new Date();
    const relevance = input.relevance || ContextRelevance.MEDIUM;
    const expiresAt = input.expiresAt || getDefaultExpiry(input.category, now);

    // Calculate initial relevance score
    const relevanceScore = this.getScoreForRelevanceLevel(relevance);

    const timeWindow = getTimeWindowForDate(now, now);

    const query = `
      INSERT INTO context_items
        (user_id, category, relevance, relevance_score, time_window,
         timestamp, expires_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      input.userId,
      input.category,
      relevance,
      relevanceScore,
      timeWindow,
      now,
      expiresAt,
      JSON.stringify(input.metadata),
    ]);

    return this.mapRowToContextItem(result.rows[0]);
  }

  /**
   * Get context item by ID
   */
  async getContextItem(id: string): Promise<ContextItem> {
    const query = `
      SELECT * FROM context_items
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Context item');
    }

    return this.mapRowToContextItem(result.rows[0]);
  }

  /**
   * Update context item relevance score
   */
  async updateContextRelevance(
    id: string,
    relevanceScore: number,
    relevance?: ContextRelevance
  ): Promise<void> {
    const updates: string[] = ['relevance_score = $2'];
    const values: unknown[] = [id, relevanceScore];
    let paramIndex = 3;

    if (relevance) {
      updates.push(`relevance = $${paramIndex++}`);
      values.push(relevance);
    }

    const query = `
      UPDATE context_items
      SET ${updates.join(', ')}
      WHERE id = $1
    `;

    await this.db.query(query, values);
  }

  /**
   * Delete expired context items
   */
  async cleanupExpiredContext(userId: string): Promise<number> {
    const query = `
      DELETE FROM context_items
      WHERE user_id = $1 AND expires_at < NOW()
    `;

    const result = await this.db.query(query, [userId]);
    const deletedCount = result.rowCount || 0;

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} expired context items for user ${userId}`);
    }

    return deletedCount;
  }

  // ==========================================================================
  // Context Aggregation
  // ==========================================================================

  /**
   * Aggregate full user context from all sources
   */
  async aggregateContext(options: ContextAggregationOptions): Promise<UserContext> {
    const {
      userId,
      timeWindow = ContextTimeWindow.NOW,
      categories,
      minRelevance,
      includeMemories = true,
      includePatterns = true,
      maxItems = 100,
    } = options;

    // Clean up expired context first
    await this.cleanupExpiredContext(userId);

    const items: ContextItem[] = [];
    const now = new Date();

    // Get current environment context
    const envContext = await this.getEnvironmentContext(userId);
    items.push(envContext);

    // Aggregate from different sources
    if (includeMemories) {
      const memoryContexts = await this.getMemoryBasedContext(userId, timeWindow, maxItems);
      items.push(...memoryContexts);
    }

    if (includePatterns) {
      const patternContexts = await this.getPatternBasedContext(userId);
      items.push(...patternContexts);
    }

    // Get stored context items
    const storedContexts = await this.getStoredContext(userId, {
      categories,
      minRelevance,
      timeWindow,
    });
    items.push(...storedContexts);

    // Filter and sort by relevance
    let filteredItems = items.filter((item) => !isContextExpired(item, now));

    if (minRelevance) {
      const minScore = this.getScoreForRelevanceLevel(minRelevance);
      filteredItems = filteredItems.filter((item) => item.relevanceScore >= minScore);
    }

    // Sort by relevance score descending
    filteredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Limit results
    filteredItems = filteredItems.slice(0, maxItems);

    // Generate summary
    const summary = this.generateContextSummary(filteredItems);

    return {
      userId,
      generatedAt: now,
      timeWindow,
      items: filteredItems,
      summary,
    };
  }

  /**
   * Get environment context (time, day, etc.)
   */
  private async getEnvironmentContext(userId: string): Promise<ContextItem> {
    const now = new Date();

    // Get user timezone (would normally fetch from user profile)
    const timezone = 'UTC'; // TODO: Get from user profile

    const environmentData: EnvironmentContextData = {
      timeOfDay: getTimeOfDay(now),
      dayOfWeek: now.getDay(),
      isWeekday: now.getDay() >= 1 && now.getDay() <= 5,
      timezone,
    };

    return {
      id: randomUUID(),
      category: ContextCategory.ENVIRONMENT,
      relevance: ContextRelevance.HIGH,
      relevanceScore: 0.8,
      timeWindow: ContextTimeWindow.NOW,
      timestamp: now,
      metadata: {
        environment: environmentData,
      },
    };
  }

  /**
   * Get memory-based context
   */
  private async getMemoryBasedContext(
    userId: string,
    timeWindow: ContextTimeWindow,
    limit: number
  ): Promise<ContextItem[]> {
    const searchQuery: MemorySearchQuery = {
      userId,
      sortBy: 'timestamp',
      limit,
    };

    // Adjust query based on time window
    if (timeWindow === ContextTimeWindow.NOW || timeWindow === ContextTimeWindow.RECENT) {
      searchQuery.types = [MemoryType.EPISODIC, MemoryType.WORKING];
    }

    const memories = await this.memoryService.searchMemories(searchQuery);
    const now = new Date();

    return memories.map((memory) => {
      const recencyScore = calculateRecencyScore(memory.timestamp, now);
      const importanceScore = memory.importance;
      const relevanceScore = (recencyScore + importanceScore) / 2;

      return {
        id: randomUUID(),
        category: ContextCategory.RECENT_ACTIVITY,
        relevance: getRelevanceLevelFromScore(relevanceScore),
        relevanceScore,
        timeWindow: getTimeWindowForDate(memory.timestamp, now),
        timestamp: memory.timestamp,
        expiresAt: this.getMemoryExpiry(memory.type),
        metadata: {
          memory: {
            memoryId: memory.id,
            memoryType: memory.type,
            content: memory.content,
            embedding: memory.embedding,
          },
        },
      };
    });
  }

  /**
   * Get pattern-based context
   */
  private async getPatternBasedContext(userId: string): Promise<ContextItem[]> {
    const patterns = await this.patternService.searchPatterns({
      userId,
      active: true,
      minConfidence: 0.5,
    });

    const now = new Date();
    const items: ContextItem[] = [];

    for (const pattern of patterns) {
      // Check for pattern deviations
      const deviationDetected = detectPatternDeviation(pattern, now);

      // Calculate relevance based on confidence and recency
      const recencyScore = calculateRecencyScore(pattern.lastObservedAt, now);
      const confidenceScore = pattern.confidence;
      const relevanceScore = (recencyScore * 0.4 + confidenceScore * 0.6);

      items.push({
        id: randomUUID(),
        category: ContextCategory.PATTERNS,
        relevance: getRelevanceLevelFromScore(relevanceScore),
        relevanceScore,
        timeWindow: ContextTimeWindow.LONGER_TERM,
        timestamp: pattern.lastObservedAt,
        metadata: {
          pattern: {
            patternId: pattern.id,
            patternType: pattern.type,
            name: pattern.name,
            confidence: pattern.confidence,
            deviationDetected,
          },
        },
      });
    }

    return items;
  }

  /**
   * Get stored context items
   */
  private async getStoredContext(
    userId: string,
    filters: {
      categories?: ContextCategory[];
      minRelevance?: ContextRelevance;
      timeWindow?: ContextTimeWindow;
    }
  ): Promise<ContextItem[]> {
    const conditions: string[] = ['user_id = $1', 'expires_at > NOW()'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (filters.categories && filters.categories.length > 0) {
      conditions.push(`category = ANY($${paramIndex++})`);
      values.push(filters.categories);
    }

    if (filters.minRelevance) {
      const minScore = this.getScoreForRelevanceLevel(filters.minRelevance);
      conditions.push(`relevance_score >= $${paramIndex++}`);
      values.push(minScore);
    }

    if (filters.timeWindow) {
      conditions.push(`time_window = $${paramIndex++}`);
      values.push(filters.timeWindow);
    }

    const query = `
      SELECT * FROM context_items
      WHERE ${conditions.join(' AND ')}
      ORDER BY relevance_score DESC
    `;

    const result = await this.db.query(query, values);
    return result.rows.map((row) => this.mapRowToContextItem(row));
  }

  /**
   * Generate context summary
   */
  private generateContextSummary(items: ContextItem[]): ContextSummary {
    const criticalItems = items.filter((i) => i.relevance === ContextRelevance.CRITICAL);
    const patternDeviations = items.filter(
      (i) => i.metadata.pattern?.deviationDetected
    );

    // Extract key insights
    const keyInsights: string[] = [];

    // Current state insights
    const currentState = items.find((i) => i.category === ContextCategory.CURRENT_STATE);
    if (currentState?.metadata.state) {
      const state = currentState.metadata.state;
      if (state.activity) {
        keyInsights.push(`Currently: ${state.activity}`);
      }
      if (state.mood) {
        keyInsights.push(`Mood: ${state.mood}`);
      }
    }

    // Pattern deviation insights
    if (patternDeviations.length > 0) {
      keyInsights.push(`${patternDeviations.length} pattern deviation(s) detected`);
    }

    // Environment insights
    const envContext = items.find((i) => i.category === ContextCategory.ENVIRONMENT);
    if (envContext?.metadata.environment) {
      const env = envContext.metadata.environment;
      keyInsights.push(`${env.timeOfDay}, ${env.isWeekday ? 'weekday' : 'weekend'}`);
    }

    return {
      upcomingEvents: items.filter((i) => i.category === ContextCategory.SCHEDULE).length,
      activeGoals: items.filter((i) => i.category === ContextCategory.GOALS).length,
      recentPatternDeviations: patternDeviations.length,
      criticalItems: criticalItems.length,
      keyInsights,
    };
  }

  // ==========================================================================
  // Context Querying
  // ==========================================================================

  /**
   * Query context with natural language or keywords
   */
  async queryContext(query: ContextQuery): Promise<ContextSearchResult[]> {
    const {
      userId,
      keywords = [],
      categories,
      timeWindow,
      minRelevance,
      limit = 20,
    } = query;

    // Get aggregated context
    const context = await this.aggregateContext({
      userId,
      timeWindow,
      categories,
      minRelevance,
      maxItems: 100,
    });

    let results: ContextSearchResult[] = context.items.map((item) => ({
      item,
      score: item.relevanceScore,
      explanation: this.generateRelevanceExplanation(item),
    }));

    // If keywords provided, re-score based on keyword matching
    if (keywords.length > 0) {
      results = results.map((result) => {
        const keywordScore = this.calculateKeywordMatchScore(result.item, keywords);
        const combinedScore = (result.score + keywordScore) / 2;

        return {
          ...result,
          score: combinedScore,
        };
      });
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Update current state context
   */
  async updateCurrentState(userId: string, state: StateContextData): Promise<ContextItem> {
    // Find existing current state context or create new
    const existing = await this.findCurrentStateContext(userId);

    if (existing) {
      // Update metadata
      const query = `
        UPDATE context_items
        SET metadata = $2, timestamp = NOW(), expires_at = NOW() + INTERVAL '1 hour'
        WHERE id = $1
        RETURNING *
      `;

      const result = await this.db.query(query, [
        existing.id,
        JSON.stringify({ state }),
      ]);

      return this.mapRowToContextItem(result.rows[0]);
    }

    // Create new current state
    return this.createContextItem({
      userId,
      category: ContextCategory.CURRENT_STATE,
      metadata: { state },
      relevance: ContextRelevance.CRITICAL,
    });
  }

  /**
   * Find existing current state context
   */
  private async findCurrentStateContext(userId: string): Promise<ContextItem | null> {
    const query = `
      SELECT * FROM context_items
      WHERE user_id = $1
        AND category = $2
        AND expires_at > NOW()
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId, ContextCategory.CURRENT_STATE]);

    return result.rows.length > 0 ? this.mapRowToContextItem(result.rows[0]) : null;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Map database row to ContextItem
   */
  private mapRowToContextItem(row: Record<string, unknown>): ContextItem {
    return {
      id: row.id as string,
      category: row.category as ContextCategory,
      relevance: row.relevance as ContextRelevance,
      relevanceScore: parseFloat(row.relevance_score as string),
      timeWindow: row.time_window as ContextTimeWindow,
      timestamp: row.timestamp as Date,
      expiresAt: row.expires_at as Date | undefined,
      metadata: (typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata) as ContextMetadata,
    };
  }

  /**
   * Get relevance score for relevance level
   */
  private getScoreForRelevanceLevel(relevance: ContextRelevance): number {
    const scores: Record<ContextRelevance, number> = {
      [ContextRelevance.CRITICAL]: 0.95,
      [ContextRelevance.HIGH]: 0.75,
      [ContextRelevance.MEDIUM]: 0.55,
      [ContextRelevance.LOW]: 0.35,
      [ContextRelevance.MINIMAL]: 0.15,
    };
    return scores[relevance];
  }

  /**
   * Get expiry time for memory type
   */
  private getMemoryExpiry(memoryType: MemoryType): Date {
    const expiry = new Date();

    switch (memoryType) {
      case MemoryType.WORKING:
        expiry.setHours(expiry.getHours() + 2);
        break;
      case MemoryType.EPISODIC:
        expiry.setDate(expiry.getDate() + 7);
        break;
      default:
        expiry.setDate(expiry.getDate() + 30);
    }

    return expiry;
  }

  /**
   * Generate relevance explanation
   */
  private generateRelevanceExplanation(item: ContextItem): string {
    const parts: string[] = [];

    parts.push(`${item.relevance} relevance`);
    parts.push(`from ${item.timeWindow}`);

    if (item.metadata.memory) {
      parts.push(`(memory: ${item.metadata.memory.memoryType})`);
    } else if (item.metadata.pattern) {
      parts.push(
        `(pattern: ${item.metadata.pattern.patternType}, confidence: ${item.metadata.pattern.confidence.toFixed(2)})`
      );
    } else if (item.metadata.state) {
      parts.push('(current state)');
    }

    return parts.join(' ');
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordMatchScore(item: ContextItem, keywords: string[]): number {
    const searchableText = this.getSearchableText(item).toLowerCase();
    const matches = keywords.filter((keyword) =>
      searchableText.includes(keyword.toLowerCase())
    );

    return keywords.length > 0 ? matches.length / keywords.length : 0;
  }

  /**
   * Get searchable text from context item
   */
  private getSearchableText(item: ContextItem): string {
    const parts: string[] = [item.category];

    if (item.metadata.memory) {
      parts.push(item.metadata.memory.content);
    }
    if (item.metadata.pattern) {
      parts.push(item.metadata.pattern.name);
    }
    if (item.metadata.state) {
      const state = item.metadata.state;
      if (state.activity) parts.push(state.activity);
      if (state.location) parts.push(state.location);
      if (state.mood) parts.push(state.mood);
    }

    return parts.join(' ');
  }
}
