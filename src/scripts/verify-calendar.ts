
import { CalendarService } from "../services/calendar.js";
import { CreateEventDTO, EventQueryOptions } from "../types/calendar.js";
import { logger } from "../utils/logger.js";

// Mock Pool
class MockPool {
    async query(text: string, params: any[]) {
        logger.info(`[MOCK DB] Query: ${text}`);
        logger.info(`[MOCK DB] Params: ${JSON.stringify(params)}`);

        // Mock specific behavior based on query content
        if (text.includes("INSERT INTO events")) {
            return {
                rows: [{
                    id: params[0],
                    user_id: params[1],
                    title: params[2],
                    description: params[3],
                    start_time: params[4],
                    end_time: params[5],
                    is_all_day: params[6],
                    recurrence_rule: params[7],
                    location: params[8],
                    created_at: new Date(),
                    updated_at: new Date()
                }],
                rowCount: 1
            };
        }

        if (text.includes("SELECT * FROM events") && text.includes("recurrence_rule IS NULL")) {
            // Mock fetching single events
            return { rows: [] };
        }

        if (text.includes("SELECT * FROM events") && text.includes("recurrence_rule IS NOT NULL")) {
            // Mock fetching recurring events
            return { rows: [] };
        }

        return { rows: [], rowCount: 0 };
    }
}

async function verify() {
    logger.info("Starting Calendar Service Verification...");

    // 1. Setup Mock DB and Service
    const mockDb = new MockPool() as any;
    const calendarService = new CalendarService(mockDb);
    const userId = "test-user-id";

    // 2. Test Create Event
    logger.info("Test 1: Create Single Event");
    const eventData: CreateEventDTO = {
        userId,
        title: "Team Meeting",
        description: "Discuss MVP 6",
        startTime: new Date("2025-01-20T10:00:00Z"),
        endTime: new Date("2025-01-20T11:00:00Z"),
        location: "Zoom"
    };

    const created = await calendarService.createEvent(eventData);
    logger.info(`Created Event: ${created.title}, ID: ${created.id}`);

    if (created.title === eventData.title) {
        logger.info("✅ Create Event Passed");
    } else {
        logger.error("❌ Create Event Failed");
    }

    // 3. Test Get Events (Mock query returns empty, so we verify function runs without error)
    logger.info("Test 2: Get Events (Empty)");
    const options: EventQueryOptions = {
        startDate: new Date("2025-01-20T00:00:00Z"),
        endDate: new Date("2025-01-21T00:00:00Z")
    };

    await calendarService.getEvents(userId, options);
    logger.info("✅ Get Events Passed (Mock Execution)");

    logger.info("Verification Complete.");
}

verify().catch(console.error);
