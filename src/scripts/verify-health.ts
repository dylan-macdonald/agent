
import { MindfulnessService } from "../services/health/mindfulness.js";
import { SleepService, WorkoutService } from "../services/health/service.js";
import { logger } from "../utils/logger.js";

// Mock DB Pool
class MockPool {
    async query(text: string, params: any[]) {
        logger.info(`[MOCK DB] Query: ${text}`);

        if (text.includes("INSERT INTO sleep_logs")) {
            return {
                rows: [{
                    id: "mock-sleep-id",
                    user_id: params[1],
                    start_time: params[2],
                    end_time: params[3],
                    created_at: new Date()
                }],
                rowCount: 1
            };
        }

        if (text.includes("INSERT INTO workouts")) {
            return {
                rows: [{
                    id: "mock-workout-id",
                    user_id: params[1],
                    activity_type: params[2],
                    duration_mins: params[3],
                    created_at: new Date()
                }],
                rowCount: 1
            };
        }

        return { rows: [], rowCount: 0 };
    }
}

async function verify() {
    logger.info("Starting Health Verification...");

    const mockDb = new MockPool() as any;
    const sleepService = new SleepService(mockDb);
    const workoutService = new WorkoutService(mockDb);
    const mindfulnessService = new MindfulnessService();

    // Test 1: Sleep
    logger.info("Test 1: Sleep Logging");
    await sleepService.logSleep({
        userId: "test-user-id",
        startTime: new Date(Date.now() - 28800000), // 8 hours ago
        endTime: new Date(),
        quality: 80
    });

    // Test 2: Workout
    logger.info("Test 2: Workout Logging");
    await workoutService.logWorkout({
        userId: "test-user-id",
        activityType: "RUN",
        durationMins: 30
    });

    // Test 3: Mindfulness
    logger.info("Test 3: Mindfulness Prompt");
    const prompt = mindfulnessService.getPrompt();
    logger.info(`Prompt: ${prompt}`);

    logger.info("✅ Verification Complete.");
}

verify().catch(console.error);
