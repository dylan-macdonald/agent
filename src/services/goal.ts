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

    /**
     * Update goal metrics (used to store milestones, etc.)
     */
    public async updateMetrics(goalId: string, metrics: Record<string, unknown>): Promise<void> {
        const query = `
            UPDATE goals
            SET metrics = $1, updated_at = NOW()
            WHERE id = $2
        `;

        try {
            await this.db.query(query, [JSON.stringify(metrics), goalId]);
            logger.info("Updated goal metrics", { goalId });
        } catch (error) {
            logger.error("Failed to update goal metrics", { error, goalId });
            throw new Error("Failed to update goal metrics");
        }
    }

    /**
     * Get a single goal by ID
     */
    public async getGoalById(goalId: string): Promise<Goal | null> {
        const query = `SELECT * FROM goals WHERE id = $1`;

        try {
            const result = await this.db.query(query, [goalId]);
            if (result.rows.length === 0) return null;
            return this.mapRowToGoal(result.rows[0]);
        } catch (error) {
            logger.error("Failed to get goal", { error, goalId });
            throw new Error("Failed to get goal");
        }
    }

    /**
     * Get goals that don't have milestones yet (for auto-planning)
     */
    public async getGoalsWithoutMilestones(userId: string): Promise<Goal[]> {
        const query = `
            SELECT * FROM goals
            WHERE user_id = $1
              AND status = $2
              AND (metrics IS NULL OR metrics->>'milestones' IS NULL)
            ORDER BY created_at DESC
            LIMIT 5
        `;

        try {
            const result = await this.db.query(query, [userId, GoalStatus.IN_PROGRESS]);
            return result.rows.map(this.mapRowToGoal);
        } catch (error) {
            logger.error("Failed to get goals without milestones", { error, userId });
            return [];
        }
    }

    /**
     * Complete a milestone and update goal progress
     */
    public async completeMilestone(goalId: string, milestoneId: string): Promise<void> {
        const goal = await this.getGoalById(goalId);
        if (!goal || !goal.metrics) return;

        const milestones = (goal.metrics as any).milestones || [];
        const milestoneIndex = milestones.findIndex((m: any) => m.id === milestoneId);

        if (milestoneIndex === -1) return;

        // Mark milestone as completed
        milestones[milestoneIndex].completed = true;
        milestones[milestoneIndex].completedAt = new Date().toISOString();

        // Calculate new progress based on completed milestones
        const completedCount = milestones.filter((m: any) => m.completed).length;
        const newProgress = Math.round((completedCount / milestones.length) * 100);

        // Update goal with new milestones and progress
        const query = `
            UPDATE goals
            SET metrics = $1, progress = $2, updated_at = NOW()
            WHERE id = $3
        `;

        try {
            await this.db.query(query, [
                JSON.stringify({ ...goal.metrics, milestones }),
                newProgress,
                goalId
            ]);
            logger.info("Completed milestone", { goalId, milestoneId, newProgress });
        } catch (error) {
            logger.error("Failed to complete milestone", { error, goalId, milestoneId });
            throw new Error("Failed to complete milestone");
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
