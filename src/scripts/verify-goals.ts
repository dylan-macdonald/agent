
import { GoalService } from "../services/goal.js";
import { logger } from "../utils/logger.js";

// Mock DB Pool
class MockPool {
    async query(text: string, params: any[]) {
        logger.info(`[MOCK DB] Query: ${text}`);

        if (text.includes("INSERT INTO goals")) {
            return {
                rows: [{
                    id: "mock-goal-id",
                    user_id: params[1],
                    title: params[2],
                    status: 'IN_PROGRESS',
                    progress: 0,
                    created_at: new Date(),
                    updated_at: new Date()
                }],
                rowCount: 1
            };
        }

        if (text.includes("SELECT * FROM goals")) {
            return { rows: [] };
        }

        return { rows: [], rowCount: 0 };
    }
}

async function verify() {
    logger.info("Starting Service Verification...");

    const mockDb = new MockPool() as any;
    const goalService = new GoalService(mockDb);

    // Test Create
    logger.info("Test 1: Create Goal");
    const created = await goalService.createGoal({
        userId: "test-user-id",
        title: "Read 5 Books"
    });

    if (created.id === "mock-goal-id") {
        logger.info("✅ Create Goal Passed");
    } else {
        logger.error("❌ Create Goal Failed");
    }

    logger.info("Verification Complete.");
}

verify().catch(console.error);
