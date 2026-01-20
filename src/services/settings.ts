/**
 * Settings Service
 *
 * Manages user settings and preferences for privacy controls and notifications
 */

import { Pool } from "pg";
import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";

export interface UserSettings {
    userId: string;
    // Privacy Controls
    webSearchEnabled: boolean;
    scriptExecutionEnabled: boolean;
    screenCaptureEnabled: boolean;
    voiceFeaturesEnabled: boolean;
    // Notification Settings
    morningCheckInsEnabled: boolean;
    eveningReflectionsEnabled: boolean;
    reminderNotificationsEnabled: boolean;
    // Check-in Times
    morningCheckInTime: string; // HH:MM format
    eveningCheckInTime: string; // HH:MM format
    // Other
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateSettingsDTO {
    webSearchEnabled?: boolean;
    scriptExecutionEnabled?: boolean;
    screenCaptureEnabled?: boolean;
    voiceFeaturesEnabled?: boolean;
    morningCheckInsEnabled?: boolean;
    eveningReflectionsEnabled?: boolean;
    reminderNotificationsEnabled?: boolean;
    morningCheckInTime?: string;
    eveningCheckInTime?: string;
    timezone?: string;
}

const DEFAULT_SETTINGS: Omit<UserSettings, 'userId' | 'createdAt' | 'updatedAt'> = {
    webSearchEnabled: true,
    scriptExecutionEnabled: false,
    screenCaptureEnabled: false,
    voiceFeaturesEnabled: true,
    morningCheckInsEnabled: true,
    eveningReflectionsEnabled: true,
    reminderNotificationsEnabled: true,
    morningCheckInTime: '08:00',
    eveningCheckInTime: '21:00',
    timezone: 'UTC'
};

export class SettingsService {
    private cachePrefix = 'settings:';
    private cacheTTL = 3600; // 1 hour

    constructor(private db: Pool, private redis: Redis) {}

    /**
     * Get user settings (creates default if not exists)
     */
    public async getSettings(userId: string): Promise<UserSettings> {
        // Try cache first
        const cached = await this.redis.get(`${this.cachePrefix}${userId}`);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query database
        const query = `SELECT * FROM user_settings WHERE user_id = $1`;

        try {
            const result = await this.db.query(query, [userId]);

            if (result.rows.length === 0) {
                // Create default settings
                return await this.createDefaultSettings(userId);
            }

            const settings = this.mapRowToSettings(result.rows[0]);

            // Cache the result
            await this.redis.setex(
                `${this.cachePrefix}${userId}`,
                this.cacheTTL,
                JSON.stringify(settings)
            );

            return settings;
        } catch (error) {
            logger.error("Failed to get settings", { error, userId });
            // Return defaults if query fails
            return {
                userId,
                ...DEFAULT_SETTINGS,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
    }

    /**
     * Update user settings
     */
    public async updateSettings(userId: string, updates: UpdateSettingsDTO): Promise<UserSettings> {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (updates.webSearchEnabled !== undefined) {
            fields.push(`web_search_enabled = $${idx++}`);
            values.push(updates.webSearchEnabled);
        }
        if (updates.scriptExecutionEnabled !== undefined) {
            fields.push(`script_execution_enabled = $${idx++}`);
            values.push(updates.scriptExecutionEnabled);
        }
        if (updates.screenCaptureEnabled !== undefined) {
            fields.push(`screen_capture_enabled = $${idx++}`);
            values.push(updates.screenCaptureEnabled);
        }
        if (updates.voiceFeaturesEnabled !== undefined) {
            fields.push(`voice_features_enabled = $${idx++}`);
            values.push(updates.voiceFeaturesEnabled);
        }
        if (updates.morningCheckInsEnabled !== undefined) {
            fields.push(`morning_check_ins_enabled = $${idx++}`);
            values.push(updates.morningCheckInsEnabled);
        }
        if (updates.eveningReflectionsEnabled !== undefined) {
            fields.push(`evening_reflections_enabled = $${idx++}`);
            values.push(updates.eveningReflectionsEnabled);
        }
        if (updates.reminderNotificationsEnabled !== undefined) {
            fields.push(`reminder_notifications_enabled = $${idx++}`);
            values.push(updates.reminderNotificationsEnabled);
        }
        if (updates.morningCheckInTime !== undefined) {
            fields.push(`morning_check_in_time = $${idx++}`);
            values.push(updates.morningCheckInTime);
        }
        if (updates.eveningCheckInTime !== undefined) {
            fields.push(`evening_check_in_time = $${idx++}`);
            values.push(updates.eveningCheckInTime);
        }
        if (updates.timezone !== undefined) {
            fields.push(`timezone = $${idx++}`);
            values.push(updates.timezone);
        }

        if (fields.length === 0) {
            return await this.getSettings(userId);
        }

        fields.push(`updated_at = NOW()`);
        values.push(userId);

        const query = `
            UPDATE user_settings
            SET ${fields.join(", ")}
            WHERE user_id = $${idx}
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, values);

            if (result.rowCount === 0) {
                // Settings don't exist, create them first
                await this.createDefaultSettings(userId);
                return await this.updateSettings(userId, updates);
            }

            const settings = this.mapRowToSettings(result.rows[0]);

            // Invalidate cache
            await this.redis.del(`${this.cachePrefix}${userId}`);

            logger.info("Updated settings", { userId });
            return settings;
        } catch (error) {
            logger.error("Failed to update settings", { error, userId });
            throw new Error("Failed to update settings");
        }
    }

    /**
     * Create default settings for a new user
     */
    private async createDefaultSettings(userId: string): Promise<UserSettings> {
        const query = `
            INSERT INTO user_settings (
                user_id,
                web_search_enabled,
                script_execution_enabled,
                screen_capture_enabled,
                voice_features_enabled,
                morning_check_ins_enabled,
                evening_reflections_enabled,
                reminder_notifications_enabled,
                morning_check_in_time,
                evening_check_in_time,
                timezone
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
            RETURNING *
        `;

        const values = [
            userId,
            DEFAULT_SETTINGS.webSearchEnabled,
            DEFAULT_SETTINGS.scriptExecutionEnabled,
            DEFAULT_SETTINGS.screenCaptureEnabled,
            DEFAULT_SETTINGS.voiceFeaturesEnabled,
            DEFAULT_SETTINGS.morningCheckInsEnabled,
            DEFAULT_SETTINGS.eveningReflectionsEnabled,
            DEFAULT_SETTINGS.reminderNotificationsEnabled,
            DEFAULT_SETTINGS.morningCheckInTime,
            DEFAULT_SETTINGS.eveningCheckInTime,
            DEFAULT_SETTINGS.timezone
        ];

        try {
            const result = await this.db.query(query, values);
            return this.mapRowToSettings(result.rows[0]);
        } catch (error) {
            logger.error("Failed to create default settings", { error, userId });
            // Return in-memory defaults
            return {
                userId,
                ...DEFAULT_SETTINGS,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
    }

    private mapRowToSettings(row: any): UserSettings {
        return {
            userId: row.user_id,
            webSearchEnabled: row.web_search_enabled,
            scriptExecutionEnabled: row.script_execution_enabled,
            screenCaptureEnabled: row.screen_capture_enabled,
            voiceFeaturesEnabled: row.voice_features_enabled,
            morningCheckInsEnabled: row.morning_check_ins_enabled,
            eveningReflectionsEnabled: row.evening_reflections_enabled,
            reminderNotificationsEnabled: row.reminder_notifications_enabled,
            morningCheckInTime: row.morning_check_in_time,
            eveningCheckInTime: row.evening_check_in_time,
            timezone: row.timezone,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
