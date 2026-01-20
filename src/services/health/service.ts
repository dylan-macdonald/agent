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

    /**
     * Get sleep logs for a user within a number of days
     */
    public async getSleepLogs(userId: string, days: number = 7): Promise<SleepLog[]> {
        const query = `
            SELECT * FROM sleep_logs
            WHERE user_id = $1
            AND start_time >= NOW() - INTERVAL '1 day' * $2
            ORDER BY start_time DESC
        `;

        try {
            const result = await this.db.query(query, [userId, days]);
            return result.rows.map(this.mapRowToSleep);
        } catch (error) {
            logger.error("Failed to get sleep logs", { error, userId });
            return [];
        }
    }

    /**
     * Get sleep statistics for a user
     */
    public async getSleepStats(userId: string, days: number = 7): Promise<{
        avgHours: number;
        avgQuality: number | null;
        totalLogs: number;
    }> {
        const logs = await this.getSleepLogs(userId, days);

        if (logs.length === 0) {
            return { avgHours: 0, avgQuality: null, totalLogs: 0 };
        }

        const totalHours = logs.reduce((sum, log) => {
            const hours = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60 * 60);
            return sum + hours;
        }, 0);

        const qualityLogs = logs.filter(l => l.quality !== null);
        const avgQuality = qualityLogs.length > 0
            ? qualityLogs.reduce((sum, l) => sum + (l.quality || 0), 0) / qualityLogs.length
            : null;

        return {
            avgHours: Math.round((totalHours / logs.length) * 10) / 10,
            avgQuality: avgQuality ? Math.round(avgQuality * 10) / 10 : null,
            totalLogs: logs.length
        };
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

    /**
     * Get workouts for a user within a number of days
     */
    public async getWorkouts(userId: string, days: number = 7): Promise<Workout[]> {
        const query = `
            SELECT * FROM workouts
            WHERE user_id = $1
            AND started_at >= NOW() - INTERVAL '1 day' * $2
            ORDER BY started_at DESC
        `;

        try {
            const result = await this.db.query(query, [userId, days]);
            return result.rows.map(this.mapRowToWorkout);
        } catch (error) {
            logger.error("Failed to get workouts", { error, userId });
            return [];
        }
    }

    /**
     * Get workout statistics for a user
     */
    public async getWorkoutStats(userId: string, days: number = 7): Promise<{
        totalWorkouts: number;
        totalMinutes: number;
        totalCalories: number;
        byActivity: Record<string, number>;
    }> {
        const workouts = await this.getWorkouts(userId, days);

        const byActivity: Record<string, number> = {};
        let totalCalories = 0;
        let totalMinutes = 0;

        for (const workout of workouts) {
            totalMinutes += workout.durationMins;
            totalCalories += workout.caloriesBurned || 0;
            byActivity[workout.activityType] = (byActivity[workout.activityType] || 0) + 1;
        }

        return {
            totalWorkouts: workouts.length,
            totalMinutes,
            totalCalories,
            byActivity
        };
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
