import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

import {
    SleepLog,
    CreateSleepLogDTO,
    Workout,
    CreateWorkoutDTO
} from "../../types/health.js";
import { logger } from "../../utils/logger.js";

export class SleepService {
    constructor(private db: Pool) { }

    public async logSleep(data: CreateSleepLogDTO): Promise<SleepLog> {
        const { userId, startTime, endTime, quality, notes, source } = data;

        const query = `
            INSERT INTO sleep_logs (
                id, user_id, start_time, end_time, quality, notes, source
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, [
                uuidv4(), userId, startTime, endTime, quality || null, notes || null, source || 'MANUAL'
            ]);
            return this.mapRowToSleep(result.rows[0]);
        } catch (error) {
            logger.error("Failed to log sleep", { error, userId });
            throw error;
        }
    }

    private mapRowToSleep(row: any): SleepLog {
        return {
            id: row.id,
            userId: row.user_id,
            startTime: row.start_time,
            endTime: row.end_time,
            quality: row.quality,
            notes: row.notes,
            source: row.source,
            createdAt: row.created_at
        };
    }
}

export class WorkoutService {
    constructor(private db: Pool) { }

    public async logWorkout(data: CreateWorkoutDTO): Promise<Workout> {
        const { userId, activityType, durationMins, caloriesBurned, notes, startedAt } = data;

        const query = `
            INSERT INTO workouts (
                id, user_id, activity_type, duration_mins, calories_burned, notes, started_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, [
                uuidv4(), userId, activityType, durationMins,
                caloriesBurned || null, notes || null, startedAt || new Date()
            ]);
            return this.mapRowToWorkout(result.rows[0]);
        } catch (error) {
            logger.error("Failed to log workout", { error, userId });
            throw error;
        }
    }

    private mapRowToWorkout(row: any): Workout {
        return {
            id: row.id,
            userId: row.user_id,
            activityType: row.activity_type,
            durationMins: row.duration_mins,
            caloriesBurned: row.calories_burned,
            notes: row.notes,
            startedAt: row.started_at,
            createdAt: row.created_at
        };
    }
}
