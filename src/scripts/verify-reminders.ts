
import { ReminderScheduler } from "../services/reminder-scheduler.js";
import { ReminderService } from "../services/reminder.js";
import { logger } from "../utils/logger.js";
// import { CreateReminderDTO } from "../types/reminder.js";

// Mock DB Pool
class MockPool {
    async query(text: string, params: any[]) {
        logger.info(`[MOCK DB] Query: ${text}`);

        if (text.includes("INSERT INTO reminders")) {
            return {
                rows: [{
                    id: "mock-reminder-id",
                    user_id: params[1],
                    title: params[2],
                    due_at: params[3],
                    is_recurring: params[4],
                    recurrence_rule: params[5],
                    status: params[6],
                    delivery_method: params[7],
                    created_at: new Date(),
                    updated_at: new Date()
                }],
                rowCount: 1
            };
        }

        if (text.includes("SELECT * FROM reminders")) {
            // Mock returning a due reminder
            logger.info("[MOCK DB] Returning 1 due reminder");
            return {
                rows: [{
                    id: "mock-reminder-id",
                    user_id: "test-user-id",
                    title: "Test Reminder",
                    due_at: new Date(Date.now() - 1000), // Due in the past
                    is_recurring: false,
                    status: 'PENDING',
                    delivery_method: 'SMS',
                    created_at: new Date(),
                    updated_at: new Date()
                }]
            };
        }

        if (text.includes("UPDATE reminders SET status")) {
            logger.info(`[MOCK DB] Updated status for reminder ${params[1]} to ${params[0]}`);
            return { rowCount: 1 };
        }

        if (text.includes("SELECT phone_number FROM users")) {
            return { rows: [{ phone_number: "+15550000000" }] };
        }

        return { rows: [], rowCount: 0 };
    }
}

// Mock SmsService
class MockSmsService {
    async sendMessage(params: any) {
        logger.info(`[MOCK SMS] Sending to ${params.toNumber}: ${params.body}`);
        return { sid: "mock-sid" };
    }
}

async function verify() {
    logger.info("Starting Reminder Service Verification...");

    const mockDb = new MockPool() as any;
    const mockSms = new MockSmsService() as any;

    // 1. Init Services
    const reminderService = new ReminderService(mockDb);
    const scheduler = new ReminderScheduler(reminderService, mockSms);
    // Explicitly inject the mockSms into scheduler if possible, or MockSmsService needs to be passed
    // Wait, ReminderScheduler constructor takes (reminderService, smsService).
    // Yes.

    // 2. Test Create
    logger.info("Test 1: Create Reminder");
    const created = await reminderService.createReminder({
        userId: "test-user-id",
        title: "Test Reminder",
        dueAt: new Date(Date.now() + 60000),
    });

    if (created.id === "mock-reminder-id") {
        logger.info("✅ Create Reminder Passed");
    } else {
        logger.error("❌ Create Reminder Failed");
    }

    // 3. Test Scheduler Polling
    logger.info("Test 2: Scheduler Polling & Delivery");

    // We can't easily test setInterval, but we can call checkReminders manually if we expose it or use `any` cast
    // Or we rely on start/stop.
    // Let's start it, wait 1s, then stop.
    // But checkReminders is private.
    // We'll cast to any.

    await (scheduler as any).checkReminders();

    // If successful, we should see [MOCK SMS] log and [MOCK DB] Update status log.
    logger.info("✅ Scheduler Logic Executed (Check logs for 'Sending to' and 'Updated status')");

    logger.info("Verification Complete.");
}

verify().catch(console.error);
