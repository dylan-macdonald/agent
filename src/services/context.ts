/**
 * Context Service
 *
 * Aggregates context from memory, patterns, user state,
 * and other sources to enable context-aware AI interactions
 */

import type { Pool } from "pg";

import {
  ContextItem,
  ContextCategory,
  ContextRelevance,
  ContextTimeWindow,
  UserContext,
  ContextSummary,
  ContextAggregationOptions,
  ContextQuery,
  ContextSearchResult,
  UpdateContextInput,
  getTimeWindowForDate,
  getRelevanceLevelFromScore,
  getDefaultExpiry,
  calculateRecencyScore,
} from "../types/context.js";
import { NotFoundError } from "../types/index.js";
import { MemoryImportance } from "../types/memory.js";

import type { MemoryService } from "./memory.js";
import type { PatternService } from "./pattern.js";

type ContextItemWithoutExpiresAt = Omit<ContextItem, "expiresAt">;

interface ContextItemRow {
  id: string;
  user_id: string;
  category: string;
  relevance: string;
  relevance_score: string;
  time_window: string;
  timestamp: Date;
  expires_at: Date | null;
  metadata: string;
  created_at: Date;
}

export class ContextService {
  constructor(
    private db: Pool,
    private memoryService: MemoryService,
    private patternService: PatternService
  ) {}

  /**
   * Create a new context item
   */
  async createContextItem(input: UpdateContextInput): Promise<ContextItem> {
    const now = new Date();
    const expiresAt = input.expiresAt ?? getDefaultExpiry(input.category, now);

    const relevance = input.relevance ?? ContextRelevance.MEDIUM;
    const relevanceScore = this.calculateDefaultRelevance(
      input.category,
      input.metadata
    );

    const timeWindow = getTimeWindowForDate(now, now);

    const query = `
      INSERT INTO context_items (
        user_id, category, relevance, relevance_score, time_window,
        timestamp, expires_at, metadata
      )
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

    if (!result.rows[0]) {
      throw new Error("Failed to create context item");
    }

    return this.mapRowToContextItem(result.rows[0] as ContextItemRow);
  }

  /**
   * Get a context item by ID
   */
  async getContextItem(id: string): Promise<ContextItem> {
    const query = "SELECT * FROM context_items WHERE id = $1";
    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Context item");
    }

    return this.mapRowToContextItem(result.rows[0] as ContextItemRow);
  }

  /**
   * Cleanup expired context items for a user
   */
  async cleanupExpiredContext(userId: string): Promise<number> {
    const now = new Date();
    const query = `
      DELETE FROM context_items
      WHERE user_id = $1 AND (expires_at IS NULL OR expires_at < $2)
      RETURNING id
    `;

    const result = await this.db.query(query, [userId, now]);
    return result.rowCount ?? 0;
  }

  /**
   * Aggregate context from all sources
   */
  async aggregateContext(
    options: ContextAggregationOptions
  ): Promise<UserContext> {
    await this.cleanupExpiredContext(options.userId);

    const contextItems: ContextItem[] = [];

    if (options.includeMemories ?? true) {
      const memoryResult = await this.memoryService.searchMemories({
        userId: options.userId,
        limit: options.maxItems ?? 20,
        importance: [MemoryImportance.HIGH, MemoryImportance.CRITICAL],
      });

      for (const memory of memoryResult.memories) {
        const memoryContextItem = await this.createContextItem({
          userId: options.userId,
          category: ContextCategory.RECENT_ACTIVITY,
          metadata: {
            memory: {
              memoryId: memory.id,
              memoryType: memory.type,
              content: memory.content,
            },
          },
          relevance: getRelevanceLevelFromScore(memory.importance / 5),
        });
        contextItems.push(memoryContextItem);
      }
    }

    if (options.includePatterns ?? true) {
      const patternQuery = {
        userId: options.userId,
      };
      const patterns = await this.patternService.getPatterns(patternQuery);

      for (const pattern of patterns) {
        if (!pattern.active) {
          continue;
        }

        const patternContextItem = await this.createContextItem({
          userId: options.userId,
          category: ContextCategory.PATTERNS,
          metadata: {
            pattern: {
              patternId: pattern.id,
              patternType: pattern.type,
              name: pattern.name,
              confidence: pattern.confidence,
            },
          },
          relevance: getRelevanceLevelFromScore(pattern.confidence),
        });
        contextItems.push(patternContextItem);
      }
    }

    const storedContextQuery = `
      SELECT * FROM context_items
      WHERE user_id = $1
        AND (expires_at IS NULL OR expires_at > $2)
      ORDER BY relevance_score DESC, timestamp DESC
    `;

    const storedResult = await this.db.query(storedContextQuery, [
      options.userId,
      new Date(),
    ]);

    for (const row of storedResult.rows) {
      contextItems.push(this.mapRowToContextItem(row as ContextItemRow));
    }

    let filteredItems = contextItems;
    if (options.minRelevance) {
      const minScore = this.getRelevanceScoreValue(options.minRelevance);
      filteredItems = filteredItems.filter(
        (item) => item.relevanceScore >= minScore
      );
    }

    if (options.categories && options.categories.length > 0) {
      filteredItems = filteredItems.filter((item) =>
        options.categories!.includes(item.category)
      );
    }

    const maxItems = options.maxItems ?? 50;
    const finalItems = filteredItems.slice(0, maxItems);

    const summary = this.generateSummary(finalItems);
    const aggregationTimeWindow =
      options.timeWindow ?? ContextTimeWindow.THIS_WEEK;

    return {
      userId: options.userId,
      generatedAt: new Date(),
      timeWindow: aggregationTimeWindow,
      items: finalItems,
      summary,
    };
  }

  /**
   * Query context for relevant items
   */
  async queryContext(query: ContextQuery): Promise<ContextSearchResult[]> {
    const aggregationOptions: ContextAggregationOptions = {
      userId: query.userId,
      maxItems: query.limit ?? 20,
    };

    if (query.categories !== undefined) {
      aggregationOptions.categories = query.categories;
    }

    if (query.timeWindow !== undefined) {
      aggregationOptions.timeWindow = query.timeWindow;
    }

    const context = await this.aggregateContext(aggregationOptions);

    const keywords = query.keywords ?? this.extractKeywords(query.query ?? "");

    const results: ContextSearchResult[] = [];

    for (const item of context.items) {
      const _itemScore = this.calculateItemScore(item, keywords, query);
      if (_itemScore > 0) {
        const explanation = this.generateScoreExplanation(
          item,
          _itemScore,
          keywords
        );
        results.push({ item, score: _itemScore, explanation });
      }
    }

    results.sort((a, b) => b.score - a.score);

    const limit = query.limit ?? 20;
    return results.slice(0, limit);
  }

  /**
   * Update or create current state for a user
   */
  async updateCurrentState(
    userId: string,
    state: Partial<{
      activity: string;
      location: string;
      mood: string;
      energyLevel: "low" | "medium" | "high";
      focusLevel: "low" | "medium" | "high";
      availability: "available" | "busy" | "do_not_disturb";
      deviceType: "mobile" | "desktop" | "other";
    }>
  ): Promise<ContextItem> {
    const now = new Date();

    const existingQuery = `
      SELECT * FROM context_items
      WHERE user_id = $1 AND category = $2
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const existingResult = await this.db.query(existingQuery, [
      userId,
      ContextCategory.CURRENT_STATE,
    ]);

    const metadata = { state };

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0] as ContextItemRow;
      const updateQuery = `
        UPDATE context_items
        SET metadata = $1, timestamp = $2, expires_at = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const result = await this.db.query(updateQuery, [
        JSON.stringify(metadata),
        now,
        getDefaultExpiry(ContextCategory.CURRENT_STATE, now),
        existing.id,
      ]);

      return this.mapRowToContextItem(result.rows[0] as ContextItemRow);
    }

    return await this.createContextItem({
      userId,
      category: ContextCategory.CURRENT_STATE,
      metadata,
      relevance: ContextRelevance.CRITICAL,
    });
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Calculate default relevance score for a context item
   */
  private calculateDefaultRelevance(
    category: ContextCategory,
    _metadata: { state?: unknown; memory?: unknown; pattern?: unknown }
  ): number {
    switch (category) {
      case ContextCategory.CURRENT_STATE:
        return 0.95;
      case ContextCategory.RECENT_ACTIVITY:
        return 0.75;
      case ContextCategory.PATTERNS:
        return 0.65;
      case ContextCategory.GOALS:
        return 0.8;
      case ContextCategory.SCHEDULE:
        return 0.85;
      default:
        return 0.5;
    }
  }

  /**
   * Get numeric score value from relevance level
   */
  private getRelevanceScoreValue(relevance: ContextRelevance): number {
    const values = {
      [ContextRelevance.CRITICAL]: 0.9,
      [ContextRelevance.HIGH]: 0.7,
      [ContextRelevance.MEDIUM]: 0.5,
      [ContextRelevance.LOW]: 0.3,
      [ContextRelevance.MINIMAL]: 0.1,
    };
    return values[relevance] ?? 0.5;
  }

  /**
   * Calculate search score for a context item
   */
  private calculateItemScore(
    item: ContextItem,
    keywords: string[],
    _query: ContextQuery
  ): number {
    let _itemScore = item.relevanceScore;

    if (keywords.length > 0) {
      const metadataStr = JSON.stringify(item.metadata).toLowerCase();
      let keywordMatches = 0;

      for (const keyword of keywords) {
        if (metadataStr.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      }

      const keywordScore =
        keywords.length > 0 ? keywordMatches / keywords.length : 0;
      _itemScore += keywordScore * 0.3;
    }

    const recencyScore = calculateRecencyScore(item.timestamp);
    _itemScore += recencyScore * 0.2;

    return Math.min(_itemScore, 1);
  }

  /**
   * Generate explanation for search score
   */
  private generateScoreExplanation(
    item: ContextItem,
    _score: number,
    keywords: string[]
  ): string {
    const parts: string[] = [];

    if (keywords.length > 0) {
      const metadataStr = JSON.stringify(item.metadata).toLowerCase();
      const matchedKeywords = keywords.filter((k) =>
        metadataStr.includes(k.toLowerCase())
      );
      if (matchedKeywords.length > 0) {
        parts.push(`matches keywords: ${matchedKeywords.join(", ")}`);
      }
    }

    if (item.relevance === ContextRelevance.CRITICAL) {
      parts.push("critical relevance");
    }

    const timeWindowStr = getTimeWindowForDate(item.timestamp);
    if (timeWindowStr === ContextTimeWindow.NOW) {
      parts.push("recent");
    }

    return parts.length > 0 ? parts.join(", ") : "default relevance";
  }

  /**
   * Extract keywords from a query string
   */
  private extractKeywords(query: string): string[] {
    if (!query) {
      return [];
    }

    const stopWords = new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "should",
      "could",
      "may",
      "might",
      "must",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "what",
      "which",
      "that",
      "this",
      "these",
      "those",
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Generate context summary
   */
  private generateSummary(items: ContextItem[]): ContextSummary {
    let primaryActivity: string | undefined;
    let criticalCount = 0;
    let activeGoals = 0;
    const keyInsights: string[] = [];

    for (const item of items) {
      if (item.category === ContextCategory.CURRENT_STATE) {
        const activity = item.metadata.state?.activity;
        if (activity && typeof activity === "string") {
          primaryActivity = activity;
        }
      }

      if (item.category === ContextCategory.GOALS) {
        activeGoals++;
      }

      if (item.relevance === ContextRelevance.CRITICAL) {
        criticalCount++;
      }

      if (item.category === ContextCategory.PATTERNS) {
        const pattern = item.metadata.pattern;
        if (pattern && typeof pattern === "object") {
          const name = "name" in pattern ? String(pattern.name) : "";
          if (name && name.length > 0) {
            keyInsights.push(`Pattern: ${name}`);
          }
        }
      }
    }

    const summary: ContextSummary = {
      upcomingEvents: 0,
      activeGoals,
      recentPatternDeviations: 0,
      criticalItems: criticalCount,
      keyInsights: keyInsights.slice(0, 5),
    };

    if (primaryActivity !== undefined) {
      summary.primaryActivity = primaryActivity;
    }

    return summary;
  }

  /**
   * Map database row to ContextItem
   */
  private mapRowToContextItem(row: ContextItemRow): ContextItem {
    const baseItem: ContextItemWithoutExpiresAt = {
      id: row.id,
      category: row.category as ContextCategory,
      relevance: row.relevance as ContextRelevance,
      relevanceScore: parseFloat(row.relevance_score),
      timeWindow: row.time_window as ContextTimeWindow,
      timestamp: row.timestamp,
      metadata:
        typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : row.metadata,
    };

    if (row.expires_at !== null) {
      return { ...baseItem, expiresAt: row.expires_at };
    }

    return baseItem as ContextItem;
  }
}
