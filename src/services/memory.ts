/**
 * Memory Service
 *
 * Handles all memory storage, retrieval, and management operations
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import {
  Memory,
  MemoryType,
  MemoryImportance,
  MemoryStatus,
  CreateMemoryInput,
  UpdateMemoryInput,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryRelevance,
  MemoryStats,
  calculateExpirationDate,
  getExpirationPolicy,
} from '../types/memory.js';
import { NotFoundError, ValidationError } from '../types/index.js';
import { encrypt, decrypt } from '../security/encryption.js';
import { logger } from '../utils/logger.js';

export class MemoryService {
  constructor(
    private db: Pool,
    private redis: Redis
  ) {}

  // ==========================================================================
  // Memory CRUD Operations
  // ==========================================================================

  /**
   * Create a new memory
   */
  async createMemory(input: CreateMemoryInput): Promise<Memory> {
    this.validateMemoryInput(input);

    const encryptedContent = encrypt(input.content);
    const importance = input.importance || MemoryImportance.MEDIUM;
    const tags = input.tags || [];
    const metadata = input.metadata || {};
    const relatedMemoryIds = input.relatedMemoryIds || [];
    const expiresAt = input.expiresAt || calculateExpirationDate(input.type);

    const query = `
      INSERT INTO memories (
        user_id, type, content, summary, importance, tags, metadata,
        source, related_memory_ids, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, user_id, type, content, summary, importance, status, tags,
                metadata, source, related_memory_ids, created_at, updated_at,
                expires_at, last_accessed_at, access_count
    `;

    const result = await this.db.query(query, [
      input.userId,
      input.type,
      encryptedContent,
      input.summary || null,
      importance,
      tags,
      JSON.stringify(metadata),
      input.source || null,
      relatedMemoryIds,
      expiresAt,
    ]);

    const memory = this.mapRowToMemory(result.rows[0]);

    logger.info(
      `Memory created: ${memory.id} (type: ${memory.type}, user: ${memory.userId})`
    );

    // Invalidate user memory cache
    await this.invalidateMemoryCache(input.userId);

    return memory;
  }

  /**
   * Get memory by ID
   */
  async getMemoryById(memoryId: string, userId: string): Promise<Memory> {
    // Try cache first
    const cached = await this.getMemoryFromCache(memoryId);
    if (cached && cached.userId === userId) {
      // Update access tracking
      await this.updateAccessTracking(memoryId);
      return cached;
    }

    const query = `
      SELECT id, user_id, type, content, summary, importance, status, tags,
             metadata, source, related_memory_ids, created_at, updated_at,
             expires_at, last_accessed_at, access_count
      FROM memories
      WHERE id = $1 AND user_id = $2 AND status != 'deleted'
    `;

    const result = await this.db.query(query, [memoryId, userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Memory');
    }

    const memory = this.mapRowToMemory(result.rows[0]);

    // Cache memory
    await this.cacheMemory(memory);

    // Update access tracking
    await this.updateAccessTracking(memoryId);

    return memory;
  }

  /**
   * Update memory
   */
  async updateMemory(
    memoryId: string,
    userId: string,
    input: UpdateMemoryInput
  ): Promise<Memory> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(encrypt(input.content));
    }
    if (input.summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`);
      values.push(input.summary);
    }
    if (input.importance !== undefined) {
      updates.push(`importance = $${paramIndex++}`);
      values.push(input.importance);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(input.tags);
    }
    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }
    if (input.expiresAt !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(input.expiresAt);
    }

    if (updates.length === 0) {
      return this.getMemoryById(memoryId, userId);
    }

    values.push(memoryId, userId);

    const query = `
      UPDATE memories
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING id, user_id, type, content, summary, importance, status, tags,
                metadata, source, related_memory_ids, created_at, updated_at,
                expires_at, last_accessed_at, access_count
    `;

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('Memory');
    }

    const memory = this.mapRowToMemory(result.rows[0]);

    // Invalidate caches
    await this.invalidateMemoryCache(userId);
    await this.redis.del(this.getCacheKey(memoryId));

    logger.info(`Memory updated: ${memoryId}`);

    return memory;
  }

  /**
   * Delete memory (soft delete)
   */
  async deleteMemory(memoryId: string, userId: string): Promise<void> {
    const query = `
      UPDATE memories
      SET status = 'deleted'
      WHERE id = $1 AND user_id = $2
    `;

    await this.db.query(query, [memoryId, userId]);

    // Invalidate caches
    await this.invalidateMemoryCache(userId);
    await this.redis.del(this.getCacheKey(memoryId));

    logger.info(`Memory deleted: ${memoryId}`);
  }

  // ==========================================================================
  // Memory Search & Retrieval
  // ==========================================================================

  /**
   * Search memories with comprehensive filtering
   */
  async searchMemories(query: MemorySearchQuery): Promise<MemorySearchResult> {
    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [query.userId];
    let paramIndex = 2;

    // Type filter
    if (query.types && query.types.length > 0) {
      conditions.push(`type = ANY($${paramIndex++})`);
      values.push(query.types);
    }

    // Status filter (default to active only)
    if (query.status && query.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex++})`);
      values.push(query.status);
    } else {
      conditions.push(`status = 'active'`);
    }

    // Importance filter
    if (query.importance && query.importance.length > 0) {
      conditions.push(`importance = ANY($${paramIndex++})`);
      values.push(query.importance);
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}`);
      values.push(query.tags);
    }

    // Date range filters
    if (query.createdAfter) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(query.createdAfter);
    }
    if (query.createdBefore) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(query.createdBefore);
    }

    // Full-text search
    if (query.searchText) {
      conditions.push(
        `(to_tsvector('english', coalesce(summary, '')) @@ plainto_tsquery('english', $${paramIndex++}))`
      );
      values.push(query.searchText);
    }

    // Build ORDER BY clause
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    let orderByClause: string;

    switch (sortBy) {
      case 'relevance':
        orderByClause = query.searchText
          ? `ts_rank(to_tsvector('english', coalesce(summary, '')), plainto_tsquery('english', $${values.length})) DESC, importance DESC, created_at DESC`
          : 'importance DESC, created_at DESC';
        break;
      case 'importance':
        orderByClause = `importance ${sortOrder.toUpperCase()}, created_at DESC`;
        break;
      case 'accessCount':
        orderByClause = `access_count ${sortOrder.toUpperCase()}, created_at DESC`;
        break;
      case 'createdAt':
      default:
        orderByClause = `created_at ${sortOrder.toUpperCase()}`;
        break;
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM memories
      WHERE ${conditions.join(' AND ')}
    `;

    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query
    const dataQuery = `
      SELECT id, user_id, type, content, summary, importance, status, tags,
             metadata, source, related_memory_ids, created_at, updated_at,
             expires_at, last_accessed_at, access_count
      FROM memories
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const dataResult = await this.db.query(dataQuery, values);
    const memories = dataResult.rows.map((row) => this.mapRowToMemory(row));

    return {
      memories,
      total,
      hasMore: offset + memories.length < total,
    };
  }

  /**
   * Get memories by type
   */
  async getMemoriesByType(
    userId: string,
    type: MemoryType,
    limit = 50
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      userId,
      types: [type],
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return result.memories;
  }

  /**
   * Get most relevant memories for context
   */
  async getRelevantMemories(
    userId: string,
    context: {
      keywords?: string[];
      types?: MemoryType[];
      minImportance?: MemoryImportance;
      limit?: number;
    }
  ): Promise<MemoryRelevance[]> {
    const limit = context.limit || 10;

    // Build search query
    const searchQuery: MemorySearchQuery = {
      userId,
      types: context.types,
      importance: context.minImportance
        ? [
            MemoryImportance.CRITICAL,
            MemoryImportance.HIGH,
            ...(context.minImportance <= MemoryImportance.MEDIUM
              ? [MemoryImportance.MEDIUM]
              : []),
          ]
        : undefined,
      searchText: context.keywords?.join(' '),
      sortBy: 'relevance',
      limit,
    };

    const searchResult = await this.searchMemories(searchQuery);

    // Calculate relevance scores
    const relevantMemories: MemoryRelevance[] = searchResult.memories.map(
      (memory) => {
        const reasons: string[] = [];
        let baseScore = 0;

        // Importance contributes to relevance
        baseScore += memory.importance * 0.25;

        // Recent memories are more relevant
        const ageInDays =
          (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 1 - ageInDays / 365);
        baseScore += recencyScore * 0.25;

        if (recencyScore > 0.8) {
          reasons.push('Recent memory');
        }

        // Access frequency matters
        const accessScore = Math.min(1, memory.accessCount / 10);
        baseScore += accessScore * 0.15;

        if (memory.accessCount > 5) {
          reasons.push('Frequently accessed');
        }

        // Keywords match (if provided)
        if (context.keywords && context.keywords.length > 0) {
          const summaryLower = (memory.summary || '').toLowerCase();
          const matchingKeywords = context.keywords.filter((kw) =>
            summaryLower.includes(kw.toLowerCase())
          );
          const keywordScore = matchingKeywords.length / context.keywords.length;
          baseScore += keywordScore * 0.35;

          if (matchingKeywords.length > 0) {
            reasons.push(`Matches keywords: ${matchingKeywords.join(', ')}`);
          }
        } else {
          baseScore += 0.35; // No keyword filter, give neutral score
        }

        // Normalize to 0-1
        const relevanceScore = Math.min(1, baseScore);

        return {
          memory,
          relevanceScore,
          reasons,
        };
      }
    );

    // Sort by relevance score
    relevantMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return relevantMemories.slice(0, limit);
  }

  // ==========================================================================
  // Memory Expiration & Archival
  // ==========================================================================

  /**
   * Archive expired memories
   */
  async archiveExpiredMemories(): Promise<number> {
    const query = `
      UPDATE memories
      SET status = 'archived'
      WHERE status = 'active'
        AND expires_at < current_timestamp
        AND expires_at IS NOT NULL
      RETURNING id
    `;

    const result = await this.db.query(query);
    const archivedCount = result.rows.length;

    if (archivedCount > 0) {
      logger.info(`Archived ${archivedCount} expired memories`);

      // Clear caches for affected users
      const userIds = new Set(
        result.rows.map((row) => row.user_id).filter(Boolean)
      );
      for (const userId of userIds) {
        await this.invalidateMemoryCache(userId);
      }
    }

    return archivedCount;
  }

  /**
   * Delete memories based on expiration policy
   */
  async deleteExpiredMemories(): Promise<number> {
    const query = `
      UPDATE memories
      SET status = 'deleted'
      WHERE status = 'archived'
        AND updated_at < current_timestamp - INTERVAL '90 days'
      RETURNING id
    `;

    const result = await this.db.query(query);
    const deletedCount = result.rows.length;

    if (deletedCount > 0) {
      logger.info(`Deleted ${deletedCount} old archived memories`);
    }

    return deletedCount;
  }

  /**
   * Extend memory expiration
   */
  async extendMemoryExpiration(
    memoryId: string,
    userId: string,
    daysToExtend: number
  ): Promise<Memory> {
    const query = `
      UPDATE memories
      SET expires_at = expires_at + INTERVAL '${daysToExtend} days'
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, type, content, summary, importance, status, tags,
                metadata, source, related_memory_ids, created_at, updated_at,
                expires_at, last_accessed_at, access_count
    `;

    const result = await this.db.query(query, [memoryId, userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Memory');
    }

    const memory = this.mapRowToMemory(result.rows[0]);

    await this.invalidateMemoryCache(userId);

    logger.info(`Memory expiration extended: ${memoryId} (+${daysToExtend} days)`);

    return memory;
  }

  // ==========================================================================
  // Memory Statistics
  // ==========================================================================

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string): Promise<MemoryStats> {
    const query = `
      SELECT
        COUNT(*) as total_memories,
        json_object_agg(type, type_count) as by_type,
        json_object_agg(importance, importance_count) as by_importance,
        json_object_agg(status, status_count) as by_status,
        MIN(created_at) as oldest_memory,
        MAX(created_at) as newest_memory
      FROM (
        SELECT
          type,
          importance,
          status,
          created_at,
          COUNT(*) OVER (PARTITION BY type) as type_count,
          COUNT(*) OVER (PARTITION BY importance) as importance_count,
          COUNT(*) OVER (PARTITION BY status) as status_count
        FROM memories
        WHERE user_id = $1
      ) subquery
      GROUP BY 1
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      return {
        userId,
        totalMemories: 0,
        byType: {} as Record<MemoryType, number>,
        byImportance: {} as Record<MemoryImportance, number>,
        byStatus: {} as Record<MemoryStatus, number>,
      };
    }

    const row = result.rows[0];

    // Get most accessed memory
    const mostAccessedQuery = `
      SELECT *
      FROM memories
      WHERE user_id = $1 AND access_count > 0
      ORDER BY access_count DESC
      LIMIT 1
    `;

    const mostAccessedResult = await this.db.query(mostAccessedQuery, [userId]);
    const mostAccessedMemory = mostAccessedResult.rows[0]
      ? this.mapRowToMemory(mostAccessedResult.rows[0])
      : undefined;

    return {
      userId,
      totalMemories: parseInt(row.total_memories, 10),
      byType: row.by_type || {},
      byImportance: row.by_importance || {},
      byStatus: row.by_status || {},
      oldestMemory: row.oldest_memory,
      newestMemory: row.newest_memory,
      mostAccessedMemory,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Map database row to Memory object
   */
  private mapRowToMemory(row: any): Memory {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as MemoryType,
      content: decrypt(row.content),
      summary: row.summary,
      importance: row.importance as MemoryImportance,
      status: row.status as MemoryStatus,
      tags: row.tags || [],
      metadata: row.metadata || {},
      source: row.source,
      relatedMemoryIds: row.related_memory_ids || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
      lastAccessedAt: row.last_accessed_at,
      accessCount: row.access_count || 0,
    };
  }

  /**
   * Validate memory input
   */
  private validateMemoryInput(input: CreateMemoryInput): void {
    if (!input.userId || input.userId.trim() === '') {
      throw new ValidationError('User ID is required');
    }

    if (!input.content || input.content.trim() === '') {
      throw new ValidationError('Memory content is required');
    }

    if (input.content.length > 100000) {
      throw new ValidationError('Memory content too large (max 100,000 characters)');
    }

    if (input.summary && input.summary.length > 500) {
      throw new ValidationError('Memory summary too long (max 500 characters)');
    }

    if (input.tags && input.tags.length > 50) {
      throw new ValidationError('Too many tags (max 50)');
    }
  }

  /**
   * Update access tracking for a memory
   */
  private async updateAccessTracking(memoryId: string): Promise<void> {
    const query = `
      UPDATE memories
      SET access_count = access_count + 1,
          last_accessed_at = current_timestamp
      WHERE id = $1
    `;

    await this.db.query(query, [memoryId]);
  }

  // ==========================================================================
  // Cache Methods
  // ==========================================================================

  private getCacheKey(memoryId: string): string {
    return `memory:${memoryId}`;
  }

  private getUserMemoriesCacheKey(userId: string): string {
    return `user:${userId}:memories:*`;
  }

  private async cacheMemory(memory: Memory): Promise<void> {
    const key = this.getCacheKey(memory.id);
    await this.redis.setex(key, 300, JSON.stringify(memory)); // 5 minutes
  }

  private async getMemoryFromCache(memoryId: string): Promise<Memory | null> {
    const key = this.getCacheKey(memoryId);
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async invalidateMemoryCache(userId: string): Promise<void> {
    const pattern = this.getUserMemoriesCacheKey(userId);
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
