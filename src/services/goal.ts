import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

import {
    Goal,
    CreateGoalDTO,
    GoalStatus
} from "../types/goal.js";
import { logger } from "../utils/logger.js";

export class GoalService {
    constructor(private db: Pool) { }

    /**
     * Create a new goal
     */
    public async createGoal(data: CreateGoalDTO): Promise<Goal> {
        const {
            userId,
            title,
            description,
            targetDate,
            metrics
        } = data;

        const query = `
            INSERT INTO goals (
                id, user_id, title, description, target_date, status, progress, metrics
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            uuidv4(),
            userId,
            title,
            description || null,
            targetDate || null,
            GoalStatus.IN_PROGRESS,
            0,
            metrics || null
        ];

        try {
            const result = await this.db.query(query, values);
            logger.info("Created goal", { userId, title });
            return this.mapRowToGoal(result.rows[0]);
        } catch (error) {
            logger.error("Failed to create goal", { error, userId, title });
            throw new Error("Failed to create goal");
        }
    }

    /**
     * Get user goals
     */
    public async getGoals(userId: string): Promise<Goal[]> {
        const query = `
            SELECT * FROM goals
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;

        try {
            const result = await this.db.query(query, [userId]);
            return result.rows.map(this.mapRowToGoal);
        } catch (error) {
            logger.error("Failed to get goals", { error, userId });
            throw new Error("Failed to get goals");
        }
    }

    /**
     * Update progress
     */
    public async updateProgress(goalId: string, progress: number): Promise<void> {
        const query = `
            UPDATE goals
            SET progress = $1, updated_at = NOW()
            WHERE id = $2
        `;

        try {
            await this.db.query(query, [progress, goalId]);
        } catch (error) {
            logger.error("Failed to update goal progress", { error, goalId, progress });
            throw new Error("Failed to update goal progress");
        }
    }

    private mapRowToGoal(row: any): Goal {
        return {
            id: row.id,
            userId: row.user_id,
            title: row.title,
            description: row.description,
            targetDate: row.target_date,
            status: row.status as GoalStatus,
            progress: row.progress,
            metrics: row.metrics,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
