import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { MemoryService } from '../../src/services/memory';
import {
  MemoryType,
  MemoryImportance,
  MemoryStatus,
} from '../../src/types/memory';
import { NotFoundError, ValidationError } from '../../src/types';

// Mock dependencies
vi.mock('../../src/security/encryption', () => ({
  encrypt: vi.fn((value: string) => `encrypted_${value}`),
  decrypt: vi.fn((value: string) => value.replace('encrypted_', '')),
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('MemoryService', () => {
  let service: MemoryService;
  let mockDb: Pool;
  let mockRedis: Redis;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
    } as unknown as Pool;

    mockRedis = {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
    } as unknown as Redis;

    service = new MemoryService(mockDb, mockRedis);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Memory CRUD Tests
  // ==========================================================================

  describe('createMemory', () => {
    it('should create a new memory with encryption', async () => {
      const mockMemory = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_User likes blue',
        summary: 'Favorite color',
        importance: 2,
        status: 'active',
        tags: ['preferences', 'color'],
        metadata: {},
        source: 'conversation',
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(),
        last_accessed_at: null,
        access_count: 0,
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockMemory],
      } as never);
      vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce([]);

      const result = await service.createMemory({
        userId: 'user-123',
        type: MemoryType.FACT,
        content: 'User likes blue',
        summary: 'Favorite color',
        tags: ['preferences', 'color'],
      });

      expect(result.content).toBe('User likes blue');
      expect(result.type).toBe(MemoryType.FACT);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      await expect(
        service.createMemory({
          userId: '',
          type: MemoryType.FACT,
          content: 'Test',
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.createMemory({
          userId: 'user-123',
          type: MemoryType.FACT,
          content: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should enforce content length limits', async () => {
      await expect(
        service.createMemory({
          userId: 'user-123',
          type: MemoryType.FACT,
          content: 'x'.repeat(100001),
        })
      ).rejects.toThrow('Memory content too large');
    });

    it('should enforce summary length limits', async () => {
      await expect(
        service.createMemory({
          userId: 'user-123',
          type: MemoryType.FACT,
          content: 'Test',
          summary: 'x'.repeat(501),
        })
      ).rejects.toThrow('Memory summary too long');
    });

    it('should set default expiration based on memory type', async () => {
      const mockMemory = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_Test',
        summary: null,
        importance: 2,
        status: 'active',
        tags: [],
        metadata: {},
        source: null,
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        last_accessed_at: null,
        access_count: 0,
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockMemory],
      } as never);
      vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce([]);

      const result = await service.createMemory({
        userId: 'user-123',
        type: MemoryType.FACT,
        content: 'Test',
      });

      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('getMemoryById', () => {
    it('should retrieve memory from database', async () => {
      const mockMemory = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_Test content',
        summary: 'Test',
        importance: 3,
        status: 'active',
        tags: [],
        metadata: {},
        source: null,
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: null,
        last_accessed_at: null,
        access_count: 0,
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockMemory] } as never) // Get memory
        .mockResolvedValueOnce({ rows: [] } as never); // Update access

      const result = await service.getMemoryById('memory-123', 'user-123');

      expect(result.id).toBe('memory-123');
      expect(result.content).toBe('Test content');
      expect(mockRedis.setex).toHaveBeenCalled(); // Should cache
    });

    it('should retrieve memory from cache if available', async () => {
      const cachedMemory = {
        id: 'memory-123',
        userId: 'user-123',
        type: MemoryType.FACT,
        content: 'Test content',
        summary: 'Test',
        importance: MemoryImportance.HIGH,
        status: MemoryStatus.ACTIVE,
        tags: [],
        metadata: {},
        source: null,
        relatedMemoryIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        lastAccessedAt: null,
        accessCount: 0,
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(
        JSON.stringify(cachedMemory)
      );
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never); // Update access

      const result = await service.getMemoryById('memory-123', 'user-123');

      expect(result.id).toBe('memory-123');
      expect(mockDb.query).toHaveBeenCalledTimes(1); // Only access tracking
    });

    it('should throw NotFoundError for non-existent memory', async () => {
      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);

      await expect(
        service.getMemoryById('non-existent', 'user-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should update access tracking', async () => {
      const mockMemory = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_Test',
        summary: null,
        importance: 2,
        status: 'active',
        tags: [],
        metadata: {},
        source: null,
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: null,
        last_accessed_at: null,
        access_count: 0,
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockMemory] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      await service.getMemoryById('memory-123', 'user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('access_count = access_count + 1'),
        ['memory-123']
      );
    });
  });

  describe('updateMemory', () => {
    it('should update memory fields', async () => {
      const mockMemory = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_Updated content',
        summary: 'Updated',
        importance: 4,
        status: 'active',
        tags: ['new-tag'],
        metadata: {},
        source: null,
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: null,
        last_accessed_at: null,
        access_count: 0,
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockMemory],
      } as never);
      vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce([]);

      const result = await service.updateMemory('memory-123', 'user-123', {
        content: 'Updated content',
        importance: MemoryImportance.CRITICAL,
      });

      expect(result.content).toBe('Updated content');
      expect(result.importance).toBe(MemoryImportance.CRITICAL);
    });

    it('should return existing memory if no updates', async () => {
      const mockMemory = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_Test',
        summary: null,
        importance: 2,
        status: 'active',
        tags: [],
        metadata: {},
        source: null,
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: null,
        last_accessed_at: null,
        access_count: 0,
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockMemory] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await service.updateMemory('memory-123', 'user-123', {});

      expect(result.id).toBe('memory-123');
    });
  });

  describe('deleteMemory', () => {
    it('should soft delete memory', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);
      vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce([]);

      await service.deleteMemory('memory-123', 'user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'deleted'"),
        ['memory-123', 'user-123']
      );
    });
  });

  // ==========================================================================
  // Memory Search Tests
  // ==========================================================================

  describe('searchMemories', () => {
    it('should search memories with filters', async () => {
      const mockMemories = [
        {
          id: 'memory-1',
          user_id: 'user-123',
          type: 'fact',
          content: 'encrypted_Test 1',
          summary: 'Test 1',
          importance: 3,
          status: 'active',
          tags: ['test'],
          metadata: {},
          source: null,
          related_memory_ids: [],
          created_at: new Date(),
          updated_at: new Date(),
          expires_at: null,
          last_accessed_at: null,
          access_count: 5,
        },
      ];

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as never) // Count
        .mockResolvedValueOnce({ rows: mockMemories } as never); // Data

      const result = await service.searchMemories({
        userId: 'user-123',
        types: [MemoryType.FACT],
        tags: ['test'],
        limit: 10,
      });

      expect(result.memories).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should default to active status only', async () => {
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      await service.searchMemories({
        userId: 'user-123',
      });

      const callArgs = (mockDb.query as any).mock.calls[0][0];
      expect(callArgs).toContain("status = 'active'");
    });

    it('should support full-text search', async () => {
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      await service.searchMemories({
        userId: 'user-123',
        searchText: 'blue color',
      });

      const callArgs = (mockDb.query as any).mock.calls[0][0];
      expect(callArgs).toContain('to_tsvector');
      expect(callArgs).toContain('plainto_tsquery');
    });

    it('should support pagination', async () => {
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [{ total: '100' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await service.searchMemories({
        userId: 'user-123',
        limit: 20,
        offset: 40,
      });

      expect(result.hasMore).toBe(true);
    });
  });

  describe('getRelevantMemories', () => {
    it('should return memories with relevance scores', async () => {
      const mockMemories = [
        {
          id: 'memory-1',
          user_id: 'user-123',
          type: 'fact',
          content: 'encrypted_Blue is favorite',
          summary: 'favorite color blue',
          importance: 3,
          status: 'active',
          tags: ['preferences'],
          metadata: {},
          source: null,
          related_memory_ids: [],
          created_at: new Date(),
          updated_at: new Date(),
          expires_at: null,
          last_accessed_at: new Date(),
          access_count: 10,
        },
      ];

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as never)
        .mockResolvedValueOnce({ rows: mockMemories } as never);

      const result = await service.getRelevantMemories('user-123', {
        keywords: ['blue', 'color'],
        types: [MemoryType.FACT],
        limit: 5,
      });

      expect(result).toHaveLength(1);
      expect(result[0].relevanceScore).toBeGreaterThan(0);
      expect(result[0].relevanceScore).toBeLessThanOrEqual(1);
      expect(result[0].reasons).toBeInstanceOf(Array);
    });

    it('should filter by minimum importance', async () => {
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      await service.getRelevantMemories('user-123', {
        minImportance: MemoryImportance.HIGH,
      });

      const callArgs = (mockDb.query as any).mock.calls[0][0];
      expect(callArgs).toContain('importance');
    });
  });

  // ==========================================================================
  // Expiration & Archival Tests
  // ==========================================================================

  describe('archiveExpiredMemories', () => {
    it('should archive memories past expiration date', async () => {
      const mockExpiredMemories = [
        { id: 'memory-1', user_id: 'user-123' },
        { id: 'memory-2', user_id: 'user-123' },
      ];

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: mockExpiredMemories,
      } as never);
      vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce([]);

      const count = await service.archiveExpiredMemories();

      expect(count).toBe(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'archived'")
      );
    });

    it('should return 0 if no expired memories', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);

      const count = await service.archiveExpiredMemories();

      expect(count).toBe(0);
    });
  });

  describe('extendMemoryExpiration', () => {
    it('should extend memory expiration date', async () => {
      const mockMemory = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_Test',
        summary: null,
        importance: 2,
        status: 'active',
        tags: [],
        metadata: {},
        source: null,
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        last_accessed_at: null,
        access_count: 0,
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockMemory],
      } as never);
      vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce([]);

      const result = await service.extendMemoryExpiration(
        'memory-123',
        'user-123',
        30
      );

      expect(result.expiresAt).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("expires_at + INTERVAL '30 days'"),
        ['memory-123', 'user-123']
      );
    });
  });

  // ==========================================================================
  // Statistics Tests
  // ==========================================================================

  describe('getMemoryStats', () => {
    it('should return memory statistics', async () => {
      const mockStats = {
        total_memories: '25',
        by_type: { fact: 10, observation: 15 },
        by_importance: { 2: 15, 3: 10 },
        by_status: { active: 20, archived: 5 },
        oldest_memory: new Date('2024-01-01'),
        newest_memory: new Date(),
      };

      const mockMostAccessed = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_Most accessed',
        summary: 'Most accessed',
        importance: 3,
        status: 'active',
        tags: [],
        metadata: {},
        source: null,
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: null,
        last_accessed_at: new Date(),
        access_count: 50,
      };

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockStats] } as never)
        .mockResolvedValueOnce({ rows: [mockMostAccessed] } as never);

      const stats = await service.getMemoryStats('user-123');

      expect(stats.totalMemories).toBe(25);
      expect(stats.byType).toBeDefined();
      expect(stats.byImportance).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(stats.mostAccessedMemory).toBeDefined();
    });

    it('should handle users with no memories', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);

      const stats = await service.getMemoryStats('user-123');

      expect(stats.totalMemories).toBe(0);
    });
  });

  // ==========================================================================
  // Cache Tests
  // ==========================================================================

  describe('Caching', () => {
    it('should cache memory after retrieval', async () => {
      const mockMemory = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_Test',
        summary: null,
        importance: 2,
        status: 'active',
        tags: [],
        metadata: {},
        source: null,
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: null,
        last_accessed_at: null,
        access_count: 0,
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockMemory] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      await service.getMemoryById('memory-123', 'user-123');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'memory:memory-123',
        300,
        expect.any(String)
      );
    });

    it('should invalidate cache on update', async () => {
      const mockMemory = {
        id: 'memory-123',
        user_id: 'user-123',
        type: 'fact',
        content: 'encrypted_Updated',
        summary: null,
        importance: 2,
        status: 'active',
        tags: [],
        metadata: {},
        source: null,
        related_memory_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: null,
        last_accessed_at: null,
        access_count: 0,
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockMemory],
      } as never);
      vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce([]);

      await service.updateMemory('memory-123', 'user-123', {
        content: 'Updated',
      });

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });
});
