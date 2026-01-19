import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { UserProfileService } from '../../src/services/userProfile';
import {
  PreferenceCategory,
  PreferenceValueType,
} from '../../src/types/user';
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

describe('UserProfileService', () => {
  let service: UserProfileService;
  let mockDb: Pool;
  let mockRedis: Redis;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      query: vi.fn(),
    } as unknown as Pool;

    // Create mock Redis
    mockRedis = {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
    } as unknown as Redis;

    service = new UserProfileService(mockDb, mockRedis);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // User CRUD Tests
  // ==========================================================================

  describe('createUser', () => {
    it('should create a new user with valid phone number', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: false,
        timezone: 'UTC',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: null,
      };

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockUser] } as never) // User creation
        .mockResolvedValue({ rows: [] } as never); // Default preferences

      const result = await service.createUser({
        phoneNumber: '+1234567890',
      });

      expect(result.phoneNumber).toBe('+1234567890');
      expect(result.timezone).toBe('UTC');
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should reject invalid phone number format', async () => {
      await expect(
        service.createUser({ phoneNumber: '1234567890' })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.createUser({ phoneNumber: 'invalid' })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject duplicate phone number', async () => {
      const error = new Error('Duplicate') as Error & { code: string };
      error.code = '23505';

      vi.spyOn(mockDb, 'query').mockRejectedValueOnce(error);

      await expect(
        service.createUser({ phoneNumber: '+1234567890' })
      ).rejects.toThrow('Phone number already registered');
    });

    it('should use custom timezone if provided', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: false,
        timezone: 'America/New_York',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: null,
      };

      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockUser] } as never)
        .mockResolvedValue({ rows: [] } as never);

      const result = await service.createUser({
        phoneNumber: '+1234567890',
        timezone: 'America/New_York',
      });

      expect(result.timezone).toBe('America/New_York');
    });
  });

  describe('getUserById', () => {
    it('should retrieve user from database', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: true,
        timezone: 'UTC',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: new Date(),
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockUser],
      } as never);

      const result = await service.getUserById('user-123');

      expect(result.id).toBe('user-123');
      expect(result.phoneNumber).toBe('+1234567890');
      expect(mockRedis.setex).toHaveBeenCalled(); // Should cache
    });

    it('should retrieve user from cache if available', async () => {
      const cachedUser = {
        id: 'user-123',
        phoneNumber: '+1234567890',
        phoneVerified: true,
        timezone: 'UTC',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(
        JSON.stringify(cachedUser)
      );

      const result = await service.getUserById('user-123');

      expect(result.id).toBe('user-123');
      expect(mockDb.query).not.toHaveBeenCalled(); // Should not hit DB
    });

    it('should throw NotFoundError for non-existent user', async () => {
      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);

      await expect(service.getUserById('non-existent')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: true,
        timezone: 'America/Los_Angeles',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: new Date(),
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockUser],
      } as never);

      const result = await service.updateUser('user-123', {
        timezone: 'America/Los_Angeles',
        phoneVerified: true,
      });

      expect(result.timezone).toBe('America/Los_Angeles');
      expect(result.phoneVerified).toBe(true);
      expect(mockRedis.del).toHaveBeenCalled(); // Should invalidate cache
    });

    it('should validate phone number on update', async () => {
      await expect(
        service.updateUser('user-123', { phoneNumber: 'invalid' })
      ).rejects.toThrow(ValidationError);
    });

    it('should return existing user if no updates provided', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: true,
        timezone: 'UTC',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: new Date(),
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockUser],
      } as never);

      const result = await service.updateUser('user-123', {});

      expect(result.id).toBe('user-123');
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);
      vi.spyOn(mockRedis, 'keys').mockResolvedValueOnce([]);

      await service.deleteUser('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['user-123']
      );
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // User Settings Tests
  // ==========================================================================

  describe('getUserSetting', () => {
    it('should retrieve setting from database', async () => {
      const mockSetting = {
        value: 'true',
        value_type: 'boolean',
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockSetting],
      } as never);

      const result = await service.getUserSetting(
        'user-123',
        PreferenceCategory.NOTIFICATIONS,
        'enabled'
      );

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should retrieve setting from cache if available', async () => {
      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(JSON.stringify(true));

      const result = await service.getUserSetting(
        'user-123',
        PreferenceCategory.NOTIFICATIONS,
        'enabled'
      );

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return default value for non-existent setting', async () => {
      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);

      const result = await service.getUserSetting(
        'user-123',
        PreferenceCategory.NOTIFICATIONS,
        'enabled'
      );

      expect(result).toBe(true); // Default from schema
    });

    it('should parse JSON setting values', async () => {
      const mockSetting = {
        value: '[1,2,3,4,5]',
        value_type: 'json',
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockSetting],
      } as never);

      const result = await service.getUserSetting(
        'user-123',
        PreferenceCategory.SCHEDULING,
        'work_days'
      );

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('setUserSetting', () => {
    it('should create or update setting', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);

      await service.setUserSetting({
        userId: 'user-123',
        category: PreferenceCategory.NOTIFICATIONS,
        key: 'enabled',
        value: false,
        valueType: PreferenceValueType.BOOLEAN,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining(['user-123', 'notifications', 'enabled', 'false', 'boolean'])
      );
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should validate setting value', async () => {
      await expect(
        service.setUserSetting({
          userId: 'user-123',
          category: PreferenceCategory.NOTIFICATIONS,
          key: 'quiet_hours_start',
          value: 'invalid-time',
          valueType: PreferenceValueType.STRING,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should enforce min/max validation for numbers', async () => {
      await expect(
        service.setUserSetting({
          userId: 'user-123',
          category: PreferenceCategory.REMINDERS,
          key: 'default_reminder_minutes',
          value: 0, // Min is 1
          valueType: PreferenceValueType.NUMBER,
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.setUserSetting({
          userId: 'user-123',
          category: PreferenceCategory.REMINDERS,
          key: 'default_reminder_minutes',
          value: 2000, // Max is 1440
          valueType: PreferenceValueType.NUMBER,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should enforce allowed values validation', async () => {
      await expect(
        service.setUserSetting({
          userId: 'user-123',
          category: PreferenceCategory.GENERAL,
          key: 'theme',
          value: 'invalid-theme',
          valueType: PreferenceValueType.STRING,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should allow valid values within constraints', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);

      await expect(
        service.setUserSetting({
          userId: 'user-123',
          category: PreferenceCategory.REMINDERS,
          key: 'default_reminder_minutes',
          value: 30,
          valueType: PreferenceValueType.NUMBER,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getUserSettingsByCategory', () => {
    it('should retrieve all settings for a category', async () => {
      const mockSettings = [
        { key: 'enabled', value: 'true', value_type: 'boolean' },
        { key: 'sms_enabled', value: 'true', value_type: 'boolean' },
      ];

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: mockSettings,
      } as never);

      const result = await service.getUserSettingsByCategory(
        'user-123',
        PreferenceCategory.NOTIFICATIONS
      );

      expect(result.get('enabled')).toBe(true);
      expect(result.get('sms_enabled')).toBe(true);
    });

    it('should include default values for missing settings', async () => {
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({ rows: [] } as never);

      const result = await service.getUserSettingsByCategory(
        'user-123',
        PreferenceCategory.NOTIFICATIONS
      );

      // Should have defaults from schema
      expect(result.get('enabled')).toBe(true);
      expect(result.get('sms_enabled')).toBe(true);
    });
  });

  describe('getUserProfile', () => {
    it('should return user with all settings', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: true,
        timezone: 'UTC',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: new Date(),
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockUser] } as never)
        .mockResolvedValue({ rows: [] } as never);

      const result = await service.getUserProfile('user-123');

      expect(result.user.id).toBe('user-123');
      expect(result.settings).toBeDefined();
      expect(result.settings.size).toBeGreaterThan(0);
    });

    it('should filter settings by category', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: true,
        timezone: 'UTC',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: new Date(),
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query')
        .mockResolvedValueOnce({ rows: [mockUser] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const result = await service.getUserProfile('user-123', {
        categories: [PreferenceCategory.NOTIFICATIONS],
      });

      expect(result.user.id).toBe('user-123');
      // All settings should be from NOTIFICATIONS category
      for (const [key] of result.settings) {
        expect(key).toContain('notifications.');
      }
    });

    it('should exclude settings if requested', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: true,
        timezone: 'UTC',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: new Date(),
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockUser],
      } as never);

      const result = await service.getUserProfile('user-123', {
        includeSettings: false,
      });

      expect(result.user.id).toBe('user-123');
      expect(result.settings.size).toBe(0);
    });
  });

  // ==========================================================================
  // Cache Tests
  // ==========================================================================

  describe('Caching', () => {
    it('should cache user data after retrieval', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: true,
        timezone: 'UTC',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: new Date(),
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockUser],
      } as never);

      await service.getUserById('user-123');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'user:user-123:profile',
        300,
        expect.any(String)
      );
    });

    it('should invalidate user cache on update', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: 'encrypted_+1234567890',
        phone_verified: true,
        timezone: 'UTC',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: new Date(),
      };

      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockUser],
      } as never);

      await service.updateUser('user-123', { timezone: 'America/New_York' });

      expect(mockRedis.del).toHaveBeenCalledWith('user:user-123:profile');
    });

    it('should cache settings after retrieval', async () => {
      const mockSetting = {
        value: 'true',
        value_type: 'boolean',
      };

      vi.spyOn(mockRedis, 'get').mockResolvedValueOnce(null);
      vi.spyOn(mockDb, 'query').mockResolvedValueOnce({
        rows: [mockSetting],
      } as never);

      await service.getUserSetting(
        'user-123',
        PreferenceCategory.NOTIFICATIONS,
        'enabled'
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'user:user-123:setting:notifications:enabled',
        600,
        expect.any(String)
      );
    });
  });
});
