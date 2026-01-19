import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Pool } from 'pg';
import { PatternService } from '../../src/services/pattern';
import {
  PatternType,
  RecurrenceType,
  DayOfWeek,
} from '../../src/types/pattern';
import { NotFoundError } from '../../src/types';

// Mock dependencies
vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('PatternService', () => {
  let service: PatternService;
  let mockDb: Pool;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
    } as unknown as Pool;

    service = new PatternService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Sleep/Wake Log Tests
  // ==========================================================================

  describe('createSleepWakeLog', () => {
    it('should create a sleep/wake log entry', async () => {
      const mockLog = {
        id: 'log-123',
        user_id: 'user-123',
        sleep_time: new Date('2024-01-15T23:00:00Z'),
        wake_time: new Date('2024-01-16T07:00:00Z'),
        duration: 480, // 8 hours
        quality: 0.85,
        notes: 'Good sleep',
        created_at: new Date(),
      };

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockLog] } as never) // Create log
        .mockResolvedValueOnce({ rows: [] } as never); // Get logs for pattern detection

      const result = await service.createSleepWakeLog({
        userId: 'user-123',
        sleepTime: new Date('2024-01-15T23:00:00Z'),
        wakeTime: new Date('2024-01-16T07:00:00Z'),
        quality: 0.85,
        notes: 'Good sleep',
      });

      expect(result.id).toBe('log-123');
      expect(result.duration).toBe(480);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should calculate duration automatically', async () => {
      const sleepTime = new Date('2024-01-15T23:00:00Z');
      const wakeTime = new Date('2024-01-16T07:30:00Z');
      const expectedDuration = 510; // 8.5 hours = 510 minutes

      const mockLog = {
        id: 'log-123',
        user_id: 'user-123',
        sleep_time: sleepTime,
        wake_time: wakeTime,
        duration: expectedDuration,
        quality: null,
        notes: null,
        created_at: new Date(),
      };

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockLog] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await service.createSleepWakeLog({
        userId: 'user-123',
        sleepTime,
        wakeTime,
      });

      expect(result.duration).toBe(expectedDuration);
    });
  });

  describe('getSleepWakeLogs', () => {
    it('should retrieve sleep/wake logs for a user', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'user-123',
          sleep_time: new Date('2024-01-15T23:00:00Z'),
          wake_time: new Date('2024-01-16T07:00:00Z'),
          duration: 480,
          quality: 0.85,
          notes: null,
          created_at: new Date(),
        },
        {
          id: 'log-2',
          user_id: 'user-123',
          sleep_time: new Date('2024-01-14T22:30:00Z'),
          wake_time: new Date('2024-01-15T06:45:00Z'),
          duration: 495,
          quality: 0.9,
          notes: null,
          created_at: new Date(),
        },
      ];

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: mockLogs,
      } as never);

      const result = await service.getSleepWakeLogs('user-123', 10);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('log-1');
      expect(result[1].id).toBe('log-2');
    });
  });

  // ==========================================================================
  // Activity Log Tests
  // ==========================================================================

  describe('createActivityLog', () => {
    it('should create an activity log entry', async () => {
      const mockLog = {
        id: 'activity-123',
        user_id: 'user-123',
        activity_type: 'exercise',
        start_time: new Date('2024-01-16T08:00:00Z'),
        end_time: new Date('2024-01-16T09:00:00Z'),
        duration: 60,
        location: 'gym',
        intensity: 'high',
        notes: 'Morning workout',
        created_at: new Date(),
      };

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockLog] } as never) // Create log
        .mockResolvedValueOnce({ rows: [] } as never); // Get logs for pattern detection

      const result = await service.createActivityLog({
        userId: 'user-123',
        activityType: 'exercise',
        startTime: new Date('2024-01-16T08:00:00Z'),
        endTime: new Date('2024-01-16T09:00:00Z'),
        location: 'gym',
        intensity: 'high',
        notes: 'Morning workout',
      });

      expect(result.id).toBe('activity-123');
      expect(result.activityType).toBe('exercise');
      expect(result.duration).toBe(60);
    });

    it('should handle activities without end time', async () => {
      const mockLog = {
        id: 'activity-123',
        user_id: 'user-123',
        activity_type: 'work',
        start_time: new Date('2024-01-16T09:00:00Z'),
        end_time: null,
        duration: null,
        location: 'office',
        intensity: null,
        notes: null,
        created_at: new Date(),
      };

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockLog] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await service.createActivityLog({
        userId: 'user-123',
        activityType: 'work',
        startTime: new Date('2024-01-16T09:00:00Z'),
        location: 'office',
      });

      expect(result.duration).toBeNull();
      expect(result.endTime).toBeNull();
    });
  });

  describe('getActivityLogs', () => {
    it('should retrieve all activity logs for a user', async () => {
      const mockLogs = [
        {
          id: 'activity-1',
          user_id: 'user-123',
          activity_type: 'exercise',
          start_time: new Date(),
          end_time: new Date(),
          duration: 60,
          location: 'gym',
          intensity: 'high',
          notes: null,
          created_at: new Date(),
        },
      ];

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: mockLogs,
      } as never);

      const result = await service.getActivityLogs('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].activityType).toBe('exercise');
    });

    it('should filter activity logs by type', async () => {
      const mockLogs = [
        {
          id: 'activity-1',
          user_id: 'user-123',
          activity_type: 'exercise',
          start_time: new Date(),
          end_time: new Date(),
          duration: 60,
          location: null,
          intensity: null,
          notes: null,
          created_at: new Date(),
        },
      ];

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: mockLogs,
      } as never);

      const result = await service.getActivityLogs('user-123', 'exercise');

      expect(result).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('activity_type = $2'),
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // Pattern Detection Tests
  // ==========================================================================

  describe('detectSleepWakePatterns', () => {
    it('should return empty array if insufficient data', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [],
      } as never);

      const result = await service.detectSleepWakePatterns('user-123');

      expect(result).toEqual([]);
    });

    it('should detect patterns with sufficient data', async () => {
      const mockLogs = Array.from({ length: 10 }, (_, i) => ({
        id: `log-${i}`,
        user_id: 'user-123',
        sleep_time: new Date(`2024-01-${10 + i}T23:00:00Z`),
        wake_time: new Date(`2024-01-${11 + i}T07:00:00Z`),
        duration: 480,
        quality: 0.8,
        notes: null,
        created_at: new Date(),
      }));

      const mockPattern = {
        id: 'pattern-1',
        user_id: 'user-123',
        type: 'sleep_wake',
        name: 'Daily Sleep Pattern',
        description: 'Test',
        recurrence: 'daily',
        confidence: 0.85,
        data_points: 10,
        metadata: {},
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_observed_at: new Date(),
      };

      // Mock get logs and pattern operations
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: mockLogs } as never) // Get logs
        .mockResolvedValueOnce({ rows: [] } as never) // Find existing daily pattern
        .mockResolvedValueOnce({ rows: [mockPattern] } as never) // Create daily pattern
        .mockResolvedValueOnce({ rows: [] } as never) // Find existing weekday pattern
        .mockResolvedValueOnce({ rows: [mockPattern] } as never) // Create weekday pattern
        .mockResolvedValueOnce({ rows: [] } as never) // Find existing weekend pattern
        .mockResolvedValueOnce({ rows: [mockPattern] } as never); // Create weekend pattern

      const result = await service.detectSleepWakePatterns('user-123');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].pattern).toBeDefined();
      expect(result[0].isNew).toBeDefined();
      expect(result[0].insights).toBeDefined();
    });
  });

  describe('detectActivityPatterns', () => {
    it('should return empty array if insufficient data', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [],
      } as never);

      const result = await service.detectActivityPatterns('user-123', 'exercise');

      expect(result).toEqual([]);
    });

    it('should detect activity patterns with sufficient data', async () => {
      const mockLogs = Array.from({ length: 10 }, (_, i) => ({
        id: `activity-${i}`,
        user_id: 'user-123',
        activity_type: 'exercise',
        start_time: new Date(`2024-01-${10 + i}T08:00:00Z`),
        end_time: new Date(`2024-01-${10 + i}T09:00:00Z`),
        duration: 60,
        location: 'gym',
        intensity: 'high',
        notes: null,
        created_at: new Date(),
      }));

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: mockLogs } as never) // Get logs
        .mockResolvedValueOnce({ rows: [] } as never) // Find existing pattern
        .mockResolvedValueOnce({
          // Create pattern
          rows: [
            {
              id: 'pattern-1',
              user_id: 'user-123',
              type: 'activity',
              name: 'exercise Pattern',
              description: 'Test',
              recurrence: 'daily',
              confidence: 0.8,
              data_points: 10,
              metadata: {},
              active: true,
              created_at: new Date(),
              updated_at: new Date(),
              last_observed_at: new Date(),
            },
          ],
        } as never);

      const result = await service.detectActivityPatterns('user-123', 'exercise');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].pattern.type).toBe(PatternType.ACTIVITY);
    });
  });

  // ==========================================================================
  // Pattern CRUD Tests
  // ==========================================================================

  describe('createPattern', () => {
    it('should create a new pattern', async () => {
      const mockPattern = {
        id: 'pattern-123',
        user_id: 'user-123',
        type: 'sleep_wake',
        name: 'Daily Sleep Pattern',
        description: 'Sleeps at 23:00, wakes at 07:00',
        recurrence: 'daily',
        confidence: 0.85,
        data_points: 0,
        metadata: { sleepWake: {} },
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_observed_at: new Date(),
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockPattern],
      } as never);

      const result = await service.createPattern({
        userId: 'user-123',
        type: PatternType.SLEEP_WAKE,
        name: 'Daily Sleep Pattern',
        description: 'Sleeps at 23:00, wakes at 07:00',
        recurrence: RecurrenceType.DAILY,
        metadata: { sleepWake: {} },
      });

      expect(result.id).toBe('pattern-123');
      expect(result.type).toBe(PatternType.SLEEP_WAKE);
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('updatePattern', () => {
    it('should update pattern fields', async () => {
      const mockPattern = {
        id: 'pattern-123',
        user_id: 'user-123',
        type: 'sleep_wake',
        name: 'Updated Pattern',
        description: 'Updated description',
        recurrence: 'daily',
        confidence: 0.9,
        data_points: 20,
        metadata: {},
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_observed_at: new Date(),
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockPattern],
      } as never);

      const result = await service.updatePattern('pattern-123', 'user-123', {
        name: 'Updated Pattern',
        confidence: 0.9,
        dataPoints: 20,
      });

      expect(result.name).toBe('Updated Pattern');
      expect(result.confidence).toBe(0.9);
      expect(result.dataPoints).toBe(20);
    });

    it('should return existing pattern if no updates', async () => {
      const mockPattern = {
        id: 'pattern-123',
        user_id: 'user-123',
        type: 'sleep_wake',
        name: 'Existing Pattern',
        description: 'Description',
        recurrence: 'daily',
        confidence: 0.85,
        data_points: 10,
        metadata: {},
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_observed_at: new Date(),
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockPattern],
      } as never);

      const result = await service.updatePattern('pattern-123', 'user-123', {});

      expect(result.id).toBe('pattern-123');
    });

    it('should throw NotFoundError for non-existent pattern', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [],
      } as never);

      await expect(
        service.updatePattern('non-existent', 'user-123', { name: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getPatterns', () => {
    it('should retrieve patterns for a user', async () => {
      const mockPatterns = [
        {
          id: 'pattern-1',
          user_id: 'user-123',
          type: 'sleep_wake',
          name: 'Sleep Pattern',
          description: 'Test',
          recurrence: 'daily',
          confidence: 0.85,
          data_points: 10,
          metadata: {},
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
          last_observed_at: new Date(),
        },
      ];

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: mockPatterns,
      } as never);

      const result = await service.getPatterns({
        userId: 'user-123',
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(PatternType.SLEEP_WAKE);
    });

    it('should filter patterns by type', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [],
      } as never);

      await service.getPatterns({
        userId: 'user-123',
        types: [PatternType.SLEEP_WAKE],
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('type = ANY'),
        expect.any(Array)
      );
    });

    it('should filter patterns by minimum confidence', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [],
      } as never);

      await service.getPatterns({
        userId: 'user-123',
        minConfidence: 0.8,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('confidence >='),
        expect.any(Array)
      );
    });

    it('should filter patterns by active status', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [],
      } as never);

      await service.getPatterns({
        userId: 'user-123',
        active: true,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('active ='),
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // Pattern Statistics Tests
  // ==========================================================================

  describe('getPatternStats', () => {
    it('should return pattern statistics', async () => {
      const mockStats = {
        total_patterns: '5',
        avg_confidence: '0.82',
      };

      const mockByType = [
        { type: 'sleep_wake', count: '2' },
        { type: 'activity', count: '3' },
      ];

      const mockByRecurrence = [
        { recurrence: 'daily', count: '3' },
        { recurrence: 'weekday', count: '2' },
      ];

      const mockMostReliable = {
        id: 'pattern-1',
        user_id: 'user-123',
        type: 'sleep_wake',
        name: 'Most Reliable',
        description: 'Test',
        recurrence: 'daily',
        confidence: 0.95,
        data_points: 30,
        metadata: {},
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_observed_at: new Date(),
      };

      const mockLeastReliable = {
        id: 'pattern-2',
        user_id: 'user-123',
        type: 'activity',
        name: 'Least Reliable',
        description: 'Test',
        recurrence: 'daily',
        confidence: 0.6,
        data_points: 5,
        metadata: {},
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_observed_at: new Date(),
      };

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockStats] } as never)
        .mockResolvedValueOnce({ rows: mockByType } as never)
        .mockResolvedValueOnce({ rows: mockByRecurrence } as never)
        .mockResolvedValueOnce({ rows: [mockMostReliable] } as never)
        .mockResolvedValueOnce({ rows: [mockLeastReliable] } as never);

      const result = await service.getPatternStats('user-123');

      expect(result.totalPatterns).toBe(5);
      expect(result.averageConfidence).toBe(0.82);
      expect(result.byType).toBeDefined();
      expect(result.byRecurrence).toBeDefined();
      expect(result.mostReliablePattern).toBeDefined();
      expect(result.leastReliablePattern).toBeDefined();
    });

    it('should handle users with no patterns', async () => {
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({
          rows: [{ total_patterns: '0', avg_confidence: null }],
        } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await service.getPatternStats('user-123');

      expect(result.totalPatterns).toBe(0);
      expect(result.averageConfidence).toBe(0);
    });
  });
});
