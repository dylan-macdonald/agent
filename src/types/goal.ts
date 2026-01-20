export enum GoalStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    ABANDONED = 'ABANDONED'
}

export interface Goal {
    id: string;
    userId: string;
    title: string;
    description?: string;
    targetDate?: Date;
    status: GoalStatus;
    progress: number;
    metrics?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGoalDTO {
    userId: string;
    title: string;
    description?: string;
    targetDate?: Date;
    metrics?: Record<string, unknown>;
}

export interface UpdateGoalDTO {
    title?: string;
    description?: string;
    status?: GoalStatus;
    progress?: number;
    metrics?: Record<string, unknown>;
}
