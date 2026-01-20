/**
 * Context Service Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Pool } from "pg";
import { ContextService } from "../../src/services/context.js";
import { MemoryService } from "../../src/services/memory.js";
import { PatternService } from "../../src/services/pattern.js";
import {
  ContextCategory,
  ContextRelevance,
  ContextTimeWindow,
  getTimeWindowForDate,
  getRelevanceLevelFromScore,
  isContextExpired,
  getDefaultExpiry,
  calculateRelevanceScore,
  calculateRecencyScore,
  getTimeOfDay,
} from "../../src/types/context.js";
import { MemoryType } from "../../src/types/memory.js";
import { PatternType } from "../../src/types/pattern.js";

describe("ContextService", () => {
  let contextService: ContextService;
  let mockDb: Pool;
  let mockMemoryService: MemoryService;
  let mockPatternService: PatternService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock database
    mockDb = {
      query: vi.fn(),
    } as unknown as Pool;

    // Mock services
    mockMemoryService = {
      searchMemories: vi.fn(),
    } as unknown as MemoryService;

    mockPatternService = {
      getPatterns: vi.fn(),
    } as unknown as PatternService;

    contextService = new ContextService(
      mockDb,
      mockMemoryService,
      mockPatternService
    );
  });

  describe("createContextItem", () => {
    it("should create a new context item", async () => {
      const mockResult = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        user_id: "user-123",
        category: "current_state",
        relevance: "high",
        relevance_score: "0.75",
        time_window: "now",
        timestamp: new Date(),
        expires_at: new Date(Date.now() + 3600000),
        metadata: JSON.stringify({ state: { activity: "working" } }),
        created_at: new Date(),
      };

      vi.spyOn(mockDb, "query").mockResolvedValueOnce({
        rows: [mockResult],
      } as never);

      const result = await contextService.createContextItem({
        userId: "user-123",
        category: ContextCategory.CURRENT_STATE,
        metadata: { state: { activity: "working" } },
      });

      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(result.category).toBe(ContextCategory.CURRENT_STATE);
      expect(result.relevance).toBe("high");
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe("getContextItem", () => {
    it("should retrieve a context item by ID", async () => {
      const mockResult = {
        id: "ctx-1",
        user_id: "user-123",
        category: "recent_activity",
        relevance: "medium",
        relevance_score: "0.55",
        time_window: "recent",
        timestamp: new Date(),
        metadata: JSON.stringify({ memory: { memoryId: "mem-1" } }),
      };

      vi.spyOn(mockDb, "query").mockResolvedValueOnce({
        rows: [mockResult],
      } as never);

      const result = await contextService.getContextItem("ctx-1");

      expect(result.id).toBe("ctx-1");
      expect(result.metadata.memory?.memoryId).toBe("mem-1");
    });

    it("should throw NotFoundError if context item not found", async () => {
      vi.spyOn(mockDb, "query").mockResolvedValueOnce({
        rows: [],
      } as never);

      await expect(
        contextService.getContextItem("nonexistent")
      ).rejects.toThrow("Context item not found");
    });
  });

  describe("cleanupExpiredContext", () => {
    it("should delete expired context items", async () => {
      vi.spyOn(mockDb, "query").mockResolvedValueOnce({
        rowCount: 5,
      } as never);

      const deletedCount =
        await contextService.cleanupExpiredContext("user-123");

      expect(deletedCount).toBe(5);
      expect(mockDb.query).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM context_items"),
        expect.any(Array)
      );
    });
  });

  describe("aggregateContext", () => {
    it("should aggregate context from all sources", async () => {
      const now = new Date();

      // Mock memory search
      const mockMemories = [
        {
          id: "mem-1",
          userId: "user-123",
          type: MemoryType.CONVERSATION,
          content: "Had breakfast at 8am",
          importance: 3,
          status: "active" as const,
          tags: [],
          metadata: {},
          relatedMemoryIds: [],
          accessCount: 0,
          createdAt: new Date(now.getTime() - 3600000),
          updatedAt: now,
        },
      ];

      vi.spyOn(mockMemoryService, "searchMemories").mockResolvedValueOnce({
        memories: mockMemories,
        total: mockMemories.length,
        hasMore: false,
      });

      // Mock pattern search
      const mockPatterns = [
        {
          id: "pat-1",
          userId: "user-123",
          type: PatternType.SLEEP_WAKE,
          name: "Daily Sleep Pattern",
          description: "Sleeps at 11pm",
          recurrence: "daily" as const,
          confidence: 0.85,
          dataPoints: 20,
          metadata: {
            sleepWake: {
              averageSleepTime: "23:00",
              averageWakeTime: "07:00",
              averageSleepDuration: 480,
              varianceMinutes: 30,
            },
          },
          active: true,
          createdAt: now,
          updatedAt: now,
          lastObservedAt: new Date(now.getTime() - 86400000),
        },
      ];

      vi.spyOn(mockPatternService, "getPatterns").mockResolvedValueOnce(
        mockPatterns
      );

      // Mock database queries
      // Order: DELETE (cleanup), INSERT (memory), INSERT (pattern), SELECT (stored)
      const mockMemoryContextItem = {
        id: "ctx-generated-1",
        user_id: "user-123",
        category: "recent_activity",
        relevance: "medium",
        relevance_score: "0.70",
        time_window: "recent",
        timestamp: now,
        expires_at: new Date(now.getTime() + 3600000),
        metadata: JSON.stringify({
          memory: {
            memoryId: "mem-1",
            memoryType: "CONVERSATION",
            content: "Had breakfast at 8am",
          },
        }),
        created_at: now,
      };

      const mockPatternContextItem = {
        id: "ctx-generated-2",
        user_id: "user-123",
        category: "patterns",
        relevance: "high",
        relevance_score: "0.85",
        time_window: "recent",
        timestamp: now,
        expires_at: new Date(now.getTime() + 3600000),
        metadata: JSON.stringify({
          pattern: {
            patternId: "pat-1",
            patternType: "sleep_wake",
            name: "Daily Sleep Pattern",
            confidence: 0.85,
          },
        }),
        created_at: now,
      };

      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({ rowCount: 0 } as never) // Cleanup (DELETE)
        .mockResolvedValueOnce({ rows: [mockMemoryContextItem] } as never) // Memory context (INSERT)
        .mockResolvedValueOnce({ rows: [mockPatternContextItem] } as never) // Pattern context (INSERT)
        .mockResolvedValueOnce({ rows: [] } as never); // Stored context (SELECT)

      const result = await contextService.aggregateContext({
        userId: "user-123",
        timeWindow: ContextTimeWindow.NOW,
        includeMemories: true,
        includePatterns: true,
      });

      expect(result.userId).toBe("user-123");
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.summary.keyInsights.length).toBeGreaterThan(0);
    });

    it("should filter by minimum relevance", async () => {
      // Mock cleanup
      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({ rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      vi.spyOn(mockMemoryService, "searchMemories").mockResolvedValueOnce({
        memories: [],
        total: 0,
        hasMore: false,
      });
      vi.spyOn(mockPatternService, "getPatterns").mockResolvedValueOnce([]);

      const result = await contextService.aggregateContext({
        userId: "user-123",
        minRelevance: ContextRelevance.HIGH,
      });

      // All items should have HIGH relevance or better
      const hasLowRelevance = result.items.some(
        (item) =>
          item.relevance === ContextRelevance.LOW ||
          item.relevance === ContextRelevance.MINIMAL
      );

      expect(hasLowRelevance).toBe(false);
    });
  });

  describe("queryContext", () => {
    it("should query context with keywords", async () => {
      const now = new Date();

      // Mock aggregateContext (cleanup, memory context, pattern context, stored context)
      const mockAggregatedItem = {
        id: "ctx-agg-1",
        user_id: "user-123",
        category: "recent_activity",
        relevance: "medium",
        relevance_score: "0.80",
        time_window: "recent",
        timestamp: now,
        expires_at: new Date(now.getTime() + 3600000),
        metadata: JSON.stringify({
          memory: {
            memoryId: "mem-1",
            memoryType: "CONVERSATION",
            content: "Morning workout at the gym",
          },
        }),
        created_at: now,
      };

      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({ rowCount: 0 } as never) // Cleanup (DELETE)
        .mockResolvedValueOnce({ rows: [mockAggregatedItem] } as never) // Memory context (INSERT)
        .mockResolvedValueOnce({ rows: [] } as never); // Stored context (SELECT)

      vi.spyOn(mockMemoryService, "searchMemories").mockResolvedValueOnce({
        memories: [
          {
            id: "mem-1",
            userId: "user-123",
            type: MemoryType.CONVERSATION,
            content: "Morning workout at the gym",
            importance: 4,
            status: "active" as const,
            tags: [],
            metadata: {},
            relatedMemoryIds: [],
            accessCount: 0,
            createdAt: now,
            updatedAt: now,
          },
        ],
        total: 1,
        hasMore: false,
      });

      vi.spyOn(mockPatternService, "getPatterns").mockResolvedValueOnce([]);

      const results = await contextService.queryContext({
        userId: "user-123",
        keywords: ["workout", "gym"],
        limit: 10,
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      // Results should have score and explanation
      results.forEach((result) => {
        expect(result).toHaveProperty("item");
        expect(result).toHaveProperty("score");
        expect(result).toHaveProperty("explanation");
      });
    });
  });

  describe("updateCurrentState", () => {
    it("should create new current state if none exists", async () => {
      const mockNewState = {
        id: "ctx-new",
        user_id: "user-123",
        category: "current_state",
        relevance: "critical",
        relevance_score: "0.95",
        time_window: "now",
        timestamp: new Date(),
        expires_at: new Date(Date.now() + 3600000),
        metadata: JSON.stringify({
          state: { activity: "exercising", energyLevel: "high" },
        }),
      };

      // Mock finding no existing state, then creating new state
      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({ rows: [] } as never) // Find existing
        .mockResolvedValueOnce({ rows: [mockNewState] } as never); // Create new

      const result = await contextService.updateCurrentState("user-123", {
        activity: "exercising",
        energyLevel: "high",
      });

      expect(result.category).toBe(ContextCategory.CURRENT_STATE);
      expect(result.metadata.state?.activity).toBe("exercising");
    });

    it("should update existing current state", async () => {
      const existingState = {
        id: "ctx-existing",
        user_id: "user-123",
        category: "current_state",
        relevance: "critical",
        relevance_score: "0.95",
        time_window: "now",
        timestamp: new Date(),
        expires_at: new Date(Date.now() + 3600000),
        metadata: JSON.stringify({ state: { activity: "working" } }),
      };

      // Mock updating state
      const updatedState = {
        ...existingState,
        metadata: JSON.stringify({ state: { activity: "taking break" } }),
      };

      // Mock finding existing state, then updating it
      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({ rows: [existingState] } as never) // Find existing
        .mockResolvedValueOnce({ rows: [updatedState] } as never); // Update

      const result = await contextService.updateCurrentState("user-123", {
        activity: "taking break",
      });

      expect(result.id).toBe("ctx-existing");
      expect(result.metadata.state?.activity).toBe("taking break");
    });
  });
});

describe("Context Helper Functions", () => {
  describe("getTimeWindowForDate", () => {
    it("should return NOW for very recent dates", () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

      expect(getTimeWindowForDate(recent, now)).toBe(ContextTimeWindow.NOW);
    });

    it("should return RECENT for last few hours", () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago

      expect(getTimeWindowForDate(recent, now)).toBe(ContextTimeWindow.RECENT);
    });

    it("should return TODAY for earlier today", () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      expect(getTimeWindowForDate(earlier, now)).toBe(ContextTimeWindow.TODAY);
    });

    it("should return THIS_WEEK for days ago", () => {
      const now = new Date();
      const daysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      expect(getTimeWindowForDate(daysAgo, now)).toBe(
        ContextTimeWindow.THIS_WEEK
      );
    });
  });

  describe("getRelevanceLevelFromScore", () => {
    it("should return CRITICAL for very high scores", () => {
      expect(getRelevanceLevelFromScore(0.95)).toBe(ContextRelevance.CRITICAL);
    });

    it("should return HIGH for high scores", () => {
      expect(getRelevanceLevelFromScore(0.75)).toBe(ContextRelevance.HIGH);
    });

    it("should return MEDIUM for medium scores", () => {
      expect(getRelevanceLevelFromScore(0.55)).toBe(ContextRelevance.MEDIUM);
    });

    it("should return LOW for low scores", () => {
      expect(getRelevanceLevelFromScore(0.35)).toBe(ContextRelevance.LOW);
    });

    it("should return MINIMAL for very low scores", () => {
      expect(getRelevanceLevelFromScore(0.1)).toBe(ContextRelevance.MINIMAL);
    });
  });

  describe("isContextExpired", () => {
    it("should return false if no expiry set", () => {
      const item = {
        id: "1",
        category: ContextCategory.PATTERNS,
        relevance: ContextRelevance.MEDIUM,
        relevanceScore: 0.5,
        timeWindow: ContextTimeWindow.NOW,
        timestamp: new Date(),
        metadata: {},
      };

      expect(isContextExpired(item)).toBe(false);
    });

    it("should return true if expired", () => {
      const item = {
        id: "1",
        category: ContextCategory.CURRENT_STATE,
        relevance: ContextRelevance.MEDIUM,
        relevanceScore: 0.5,
        timeWindow: ContextTimeWindow.NOW,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() - 1000),
        metadata: {},
      };

      expect(isContextExpired(item)).toBe(true);
    });

    it("should return false if not yet expired", () => {
      const item = {
        id: "1",
        category: ContextCategory.CURRENT_STATE,
        relevance: ContextRelevance.MEDIUM,
        relevanceScore: 0.5,
        timeWindow: ContextTimeWindow.NOW,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        metadata: {},
      };

      expect(isContextExpired(item)).toBe(false);
    });
  });

  describe("getTimeOfDay", () => {
    it("should return morning for early hours", () => {
      const morning = new Date("2025-01-19T08:00:00");
      expect(getTimeOfDay(morning)).toBe("morning");
    });

    it("should return afternoon for midday", () => {
      const afternoon = new Date("2025-01-19T14:00:00");
      expect(getTimeOfDay(afternoon)).toBe("afternoon");
    });

    it("should return evening for late afternoon", () => {
      const evening = new Date("2025-01-19T19:00:00");
      expect(getTimeOfDay(evening)).toBe("evening");
    });

    it("should return night for late hours", () => {
      const night = new Date("2025-01-19T23:00:00");
      expect(getTimeOfDay(night)).toBe("night");
    });
  });

  describe("calculateRecencyScore", () => {
    it("should return high score for very recent timestamps", () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 60000); // 1 minute ago

      const score = calculateRecencyScore(recent, now);
      expect(score).toBeGreaterThan(0.99);
    });

    it("should return lower score for older timestamps", () => {
      const now = new Date();
      const old = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      const score = calculateRecencyScore(old, now);
      // With half-life of 24 hours: e^(-24/24) = e^(-1) ≈ 0.368
      expect(score).toBeCloseTo(0.368, 2);
    });

    it("should return very low score for very old timestamps", () => {
      const now = new Date();
      const veryOld = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const score = calculateRecencyScore(veryOld, now);
      expect(score).toBeLessThan(0.1);
    });
  });

  describe("getDefaultExpiry", () => {
    it("should return 1 hour for CURRENT_STATE", () => {
      const now = new Date();
      const expiry = getDefaultExpiry(ContextCategory.CURRENT_STATE, now);
      const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(diffHours).toBeCloseTo(1, 0);
    });

    it("should return 6 hours for RECENT_ACTIVITY", () => {
      const now = new Date();
      const expiry = getDefaultExpiry(ContextCategory.RECENT_ACTIVITY, now);
      const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(diffHours).toBeCloseTo(6, 0);
    });

    it("should return 30 days for PATTERNS", () => {
      const now = new Date();
      const expiry = getDefaultExpiry(ContextCategory.PATTERNS, now);
      const diffDays =
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(30, 0);
    });
  });

  describe("calculateRelevanceScore", () => {
    it("should calculate weighted score from factors", () => {
      const factors = {
        recency: 0.9,
        similarity: 0.8,
        frequency: 0.7,
      };

      const score = calculateRelevanceScore(factors);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should handle partial factors", () => {
      const factors = {
        recency: 1.0,
      };

      const score = calculateRelevanceScore(factors);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should return 0 for empty factors", () => {
      const score = calculateRelevanceScore({});

      expect(score).toBe(0);
    });
  });
});
