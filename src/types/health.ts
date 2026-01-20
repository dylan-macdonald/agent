export interface SleepLog {
    id: string;
    userId: string;
    startTime: Date;
    endTime: Date;
    quality?: number;
    notes?: string;
    source: string;
    createdAt: Date;
}

export interface CreateSleepLogDTO {
    userId: string;
    startTime: Date;
    endTime: Date;
    quality?: number;
    notes?: string;
    source?: string;
}

export interface Workout {
    id: string;
    userId: string;
    activityType: string;
    durationMins: number;
    caloriesBurned?: number;
    notes?: string;
    startedAt: Date;
    createdAt: Date;
}

export interface CreateWorkoutDTO {
    userId: string;
    activityType: string;
    durationMins: number;
    caloriesBurned?: number;
    notes?: string;
    startedAt?: Date;
}
