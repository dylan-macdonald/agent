/**
 * User Profile Service
 *
 * Handles all user profile and preference management with caching
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  CreateUserSettingInput,
  PreferenceCategory,
  PreferenceValueType,
  UserProfile,
  GetUserProfileOptions,
  getPreferenceSchema,
  PREFERENCE_SCHEMAS,
} from '../types/user.js';
import { NotFoundError, ValidationError } from '../types/index.js';
import { encrypt, decrypt } from '../security/encryption.js';
import { logger } from '../utils/logger.js';

export class UserProfileService {
  constructor(
    private db: Pool,
    private redis: Redis
  ) {}

  // ==========================================================================
  // User CRUD Operations
  // ==========================================================================

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    this.validatePhoneNumber(input.phoneNumber);

    const encryptedPhone = encrypt(input.phoneNumber);
    const timezone = input.timezone || 'UTC';

    const query = `
      INSERT INTO users (phone_number, timezone)
      VALUES ($1, $2)
      RETURNING id, phone_number, phone_verified, timezone, active,
                created_at, updated_at, last_active_at
    `;

    try {
      const result = await this.db.query(query, [encryptedPhone, timezone]);
      const row = result.rows[0];

      const user: User = {
        id: row.id,
        phoneNumber: decrypt(row.phone_number),
        phoneVerified: row.phone_verified,
        timezone: row.timezone,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastActiveAt: row.last_active_at,
      };

      // Initialize default preferences
      await this.initializeDefaultPreferences(user.id);

      logger.info(`User created: ${user.id}`);
      return user;
    } catch (error) {
      if ((error as Error & { code: string }).code === '23505') {
        throw new ValidationError('Phone number already registered');
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    // Try cache first
    const cached = await this.getUserFromCache(userId);
    if (cached) {
      return cached;
    }

    const query = `
      SELECT id, phone_number, phone_verified, timezone, active,
             created_at, updated_at, last_active_at
      FROM users
      WHERE id = $1 AND active = true
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const row = result.rows[0];
    const user: User = {
      id: row.id,
      phoneNumber: decrypt(row.phone_number),
      phoneVerified: row.phone_verified,
      timezone: row.timezone,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    };

    // Cache user
    await this.cacheUser(user);

    return user;
  }

  /**
   * Get user by phone number
   */
  async getUserByPhoneNumber(phoneNumber: string): Promise<User> {
    this.validatePhoneNumber(phoneNumber);

    const encryptedPhone = encrypt(phoneNumber);

    const query = `
      SELECT id, phone_number, phone_verified, timezone, active,
             created_at, updated_at, last_active_at
      FROM users
      WHERE phone_number = $1 AND active = true
    `;

    const result = await this.db.query(query, [encryptedPhone]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const row = result.rows[0];
    const user: User = {
      id: row.id,
      phoneNumber: decrypt(row.phone_number),
      phoneVerified: row.phone_verified,
      timezone: row.timezone,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    };

    // Cache user
    await this.cacheUser(user);

    return user;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, input: UpdateUserInput): Promise<User> {
    if (input.phoneNumber) {
      this.validatePhoneNumber(input.phoneNumber);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(encrypt(input.phoneNumber));
    }
    if (input.phoneVerified !== undefined) {
      updates.push(`phone_verified = $${paramIndex++}`);
      values.push(input.phoneVerified);
    }
    if (input.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(input.timezone);
    }
    if (input.active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      values.push(input.active);
    }
    if (input.lastActiveAt !== undefined) {
      updates.push(`last_active_at = $${paramIndex++}`);
      values.push(input.lastActiveAt);
    }

    if (updates.length === 0) {
      return this.getUserById(userId);
    }

    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, phone_number, phone_verified, timezone, active,
                created_at, updated_at, last_active_at
    `;

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const row = result.rows[0];
    const user: User = {
      id: row.id,
      phoneNumber: decrypt(row.phone_number),
      phoneVerified: row.phone_verified,
      timezone: row.timezone,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    };

    // Invalidate cache
    await this.invalidateUserCache(userId);

    logger.info(`User updated: ${userId}`);
    return user;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET active = false
      WHERE id = $1
    `;

    await this.db.query(query, [userId]);

    // Invalidate all caches
    await this.invalidateUserCache(userId);
    await this.invalidateUserSettingsCache(userId);

    logger.info(`User deleted (soft): ${userId}`);
  }

  // ==========================================================================
  // User Settings/Preferences CRUD
  // ==========================================================================

  /**
   * Get user setting
   */
  async getUserSetting(
    userId: string,
    category: PreferenceCategory,
    key: string
  ): Promise<unknown> {
    // Try cache first
    const cached = await this.getSettingFromCache(userId, category, key);
    if (cached !== null) {
      return cached;
    }

    const query = `
      SELECT value, value_type
      FROM user_settings
      WHERE user_id = $1 AND category = $2 AND key = $3
    `;

    const result = await this.db.query(query, [userId, category, key]);

    if (result.rows.length === 0) {
      // Return default value from schema
      const schema = getPreferenceSchema(category, key);
      return schema?.defaultValue;
    }

    const row = result.rows[0];
    const value = this.parseSettingValue(
      row.value,
      row.value_type as PreferenceValueType
    );

    // Cache setting
    await this.cacheUserSetting(userId, category, key, value);

    return value;
  }

  /**
   * Get all user settings for a category
   */
  async getUserSettingsByCategory(
    userId: string,
    category: PreferenceCategory
  ): Promise<Map<string, unknown>> {
    const query = `
      SELECT key, value, value_type
      FROM user_settings
      WHERE user_id = $1 AND category = $2
    `;

    const result = await this.db.query(query, [userId, category]);

    const settings = new Map<string, unknown>();

    for (const row of result.rows) {
      const value = this.parseSettingValue(
        row.value,
        row.value_type as PreferenceValueType
      );
      settings.set(row.key, value);
    }

    // Add defaults for missing settings
    const categorySchemas = PREFERENCE_SCHEMAS.filter(
      (s) => s.category === category
    );
    for (const schema of categorySchemas) {
      if (!settings.has(schema.key) && schema.defaultValue !== undefined) {
        settings.set(schema.key, schema.defaultValue);
      }
    }

    return settings;
  }

  /**
   * Get full user profile with settings
   */
  async getUserProfile(
    userId: string,
    options: GetUserProfileOptions = {}
  ): Promise<UserProfile> {
    const user = await this.getUserById(userId);
    const settings = new Map<string, unknown>();

    if (options.includeSettings !== false) {
      const categories =
        options.categories || Object.values(PreferenceCategory);

      for (const category of categories) {
        const categorySettings = await this.getUserSettingsByCategory(
          userId,
          category
        );
        for (const [key, value] of categorySettings) {
          settings.set(`${category}.${key}`, value);
        }
      }
    }

    return { user, settings };
  }

  /**
   * Set user setting
   */
  async setUserSetting(input: CreateUserSettingInput): Promise<void> {
    const { userId, category, key, value, valueType, encrypted } = input;

    // Validate setting
    this.validateSetting(category, key, value);

    const stringValue = this.serializeSettingValue(
      value,
      valueType,
      encrypted
    );

    const query = `
      INSERT INTO user_settings (user_id, category, key, value, value_type)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, category, key)
      DO UPDATE SET value = $4, value_type = $5
    `;

    await this.db.query(query, [userId, category, key, stringValue, valueType]);

    // Invalidate cache
    await this.invalidateSettingCache(userId, category, key);

    logger.info(`Setting updated: ${userId} - ${category}.${key}`);
  }

  /**
   * Delete user setting
   */
  async deleteUserSetting(
    userId: string,
    category: PreferenceCategory,
    key: string
  ): Promise<void> {
    const query = `
      DELETE FROM user_settings
      WHERE user_id = $1 AND category = $2 AND key = $3
    `;

    await this.db.query(query, [userId, category, key]);

    // Invalidate cache
    await this.invalidateSettingCache(userId, category, key);

    logger.info(`Setting deleted: ${userId} - ${category}.${key}`);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Initialize default preferences for a new user
   */
  private async initializeDefaultPreferences(userId: string): Promise<void> {
    const defaultSchemas = PREFERENCE_SCHEMAS.filter(
      (schema) => schema.defaultValue !== undefined
    );

    for (const schema of defaultSchemas) {
      await this.setUserSetting({
        userId,
        category: schema.category,
        key: schema.key,
        value: schema.defaultValue,
        valueType: schema.valueType,
        ...(schema.encrypted !== undefined && { encrypted: schema.encrypted }),
      });
    }
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phoneNumber: string): void {
    // E.164 format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;

    if (!phoneRegex.test(phoneNumber)) {
      throw new ValidationError(
        'Invalid phone number format. Use E.164 format: +[country code][number]'
      );
    }
  }

  /**
   * Validate setting against schema
   */
  private validateSetting(
    category: PreferenceCategory,
    key: string,
    value: unknown
  ): void {
    const schema = getPreferenceSchema(category, key);

    if (!schema) {
      logger.warn(`No schema found for ${category}.${key}`);
      return;
    }

    const validation = schema.validation;
    if (!validation) {
      return;
    }

    // Type validation
    if (schema.valueType === PreferenceValueType.NUMBER && typeof value !== 'number') {
      throw new ValidationError(`${category}.${key} must be a number`);
    }
    if (schema.valueType === PreferenceValueType.BOOLEAN && typeof value !== 'boolean') {
      throw new ValidationError(`${category}.${key} must be a boolean`);
    }
    if (schema.valueType === PreferenceValueType.STRING && typeof value !== 'string') {
      throw new ValidationError(`${category}.${key} must be a string`);
    }

    // Range validation
    if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
      throw new ValidationError(
        `${category}.${key} must be at least ${validation.min}`
      );
    }
    if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
      throw new ValidationError(
        `${category}.${key} must be at most ${validation.max}`
      );
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string' && !validation.pattern.test(value)) {
      throw new ValidationError(
        `${category}.${key} does not match required pattern`
      );
    }

    // Allowed values validation
    if (validation.allowedValues && !validation.allowedValues.includes(value)) {
      throw new ValidationError(
        `${category}.${key} must be one of: ${validation.allowedValues.join(', ')}`
      );
    }

    // Custom validator
    if (validation.customValidator && !validation.customValidator(value)) {
      throw new ValidationError(`${category}.${key} failed custom validation`);
    }
  }

  /**
   * Serialize setting value for storage
   */
  private serializeSettingValue(
    value: unknown,
    valueType: PreferenceValueType,
    encrypted?: boolean
  ): string {
    let stringValue: string;

    if (valueType === PreferenceValueType.JSON) {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    if (encrypted || valueType === PreferenceValueType.ENCRYPTED) {
      return encrypt(stringValue);
    }

    return stringValue;
  }

  /**
   * Parse setting value from storage
   */
  private parseSettingValue(
    value: string,
    valueType: PreferenceValueType
  ): unknown {
    if (valueType === PreferenceValueType.ENCRYPTED) {
      value = decrypt(value);
    }

    switch (valueType) {
      case PreferenceValueType.NUMBER:
        return Number(value);
      case PreferenceValueType.BOOLEAN:
        return value === 'true';
      case PreferenceValueType.JSON:
        return JSON.parse(value);
      default:
        return value;
    }
  }

  // ==========================================================================
  // Cache Methods
  // ==========================================================================

  private getCacheKey(userId: string, type: string, suffix?: string): string {
    return suffix
      ? `user:${userId}:${type}:${suffix}`
      : `user:${userId}:${type}`;
  }

  private async cacheUser(user: User): Promise<void> {
    const key = this.getCacheKey(user.id, 'profile');
    await this.redis.setex(key, 300, JSON.stringify(user)); // 5 minutes
  }

  private async getUserFromCache(userId: string): Promise<User | null> {
    const key = this.getCacheKey(userId, 'profile');
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const key = this.getCacheKey(userId, 'profile');
    await this.redis.del(key);
  }

  private async cacheUserSetting(
    userId: string,
    category: PreferenceCategory,
    key: string,
    value: unknown
  ): Promise<void> {
    const cacheKey = this.getCacheKey(userId, 'setting', `${category}:${key}`);
    await this.redis.setex(cacheKey, 600, JSON.stringify(value)); // 10 minutes
  }

  private async getSettingFromCache(
    userId: string,
    category: PreferenceCategory,
    key: string
  ): Promise<unknown | null> {
    const cacheKey = this.getCacheKey(userId, 'setting', `${category}:${key}`);
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  private async invalidateSettingCache(
    userId: string,
    category: PreferenceCategory,
    key: string
  ): Promise<void> {
    const cacheKey = this.getCacheKey(userId, 'setting', `${category}:${key}`);
    await this.redis.del(cacheKey);
  }

  private async invalidateUserSettingsCache(userId: string): Promise<void> {
    const pattern = this.getCacheKey(userId, 'setting', '*');
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
