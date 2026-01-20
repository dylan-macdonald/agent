import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

import {
    Reminder,
    CreateReminderDTO,
    ReminderStatus,
    DeliveryMethod
} from "../types/reminder.js";
import { logger } from "../utils/logger.js";

export class ReminderService {
    constructor(private db: Pool) { }

    /**
     * Create a new reminder
     */
    public async createReminder(data: CreateReminderDTO): Promise<Reminder> {
        const {
            userId,
            title,
            dueAt,
            isRecurring,
            recurrenceRule,
            deliveryMethod
        } = data;

        const query = `
            INSERT INTO reminders (
                id, user_id, title, due_at, is_recurring, recurrence_rule, status, delivery_method
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            uuidv4(),
            userId,
            title,
            dueAt,
            isRecurring || false,
            recurrenceRule || null,
            ReminderStatus.PENDING,
            deliveryMethod || DeliveryMethod.SMS
        ];

        try {
            const result = await this.db.query(query, values);
            logger.info("Created reminder", { userId, title, dueAt });
            return this.mapRowToReminder(result.rows[0]);
        } catch (error) {
            logger.error("Failed to create reminder", { error, userId, title });
            throw new Error("Failed to create reminder");
        }
    }

    /**
     * Get pending reminders that are due
     */
    public async getDueReminders(): Promise<Reminder[]> {
        const query = `
            SELECT * FROM reminders
            WHERE status = $1
            AND due_at <= NOW()
            ORDER BY due_at ASC
            LIMIT 50
        `;
        // Limit 50 to process in chunks

        try {
            const result = await this.db.query(query, [ReminderStatus.PENDING]);
            return result.rows.map(this.mapRowToReminder);
        } catch (error) {
            logger.error("Failed to get due reminders", { error });
            throw new Error("Failed to get due reminders");
        }
    }

    /**
     * Update reminder status (e.g., mark as SENT)
     */
    public async updateStatus(id: string, status: ReminderStatus): Promise<void> {
        const query = `
            UPDATE reminders
            SET status = $1, updated_at = NOW()
            WHERE id = $2
        `;

        try {
            await this.db.query(query, [status, id]);
        } catch (error) {
            logger.error("Failed to update reminder status", { error, id, status });
            throw new Error("Failed to update reminder status");
        }
    }

    private mapRowToReminder(row: any): Reminder {
        return {
            id: row.id,
            userId: row.user_id,
            title: row.title,
            dueAt: row.due_at,
            isRecurring: row.is_recurring,
            recurrenceRule: row.recurrence_rule,
            status: row.status as ReminderStatus,
            deliveryMethod: row.delivery_method as DeliveryMethod,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Helper to get user phone number
     */
    public async getUserPhoneNumber(userId: string): Promise<string | null> {
        const query = `SELECT phone_number FROM users WHERE id = $1`;
        try {
            const result = await this.db.query(query, [userId]);
            return result.rows[0]?.phone_number || null;
        } catch (error) {
            logger.error("Failed to get user phone number", { error, userId });
            return null;
        }
    }
}
