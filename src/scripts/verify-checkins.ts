
import { CheckInScheduler } from "../services/checkin-scheduler.js";
import { CheckInService } from "../services/checkin.js";
import { logger } from "../utils/logger.js";

// Mock Services
class MockCalendarService {
    async getEvents() {
        return [
            { title: "Morning Standup", startTime: new Date(new Date().setHours(10, 0, 0)) }
        ];
    }
}

class MockReminderService {
    async getDueReminders() {
        return [
            { userId: "test-user-id", title: "Take Vitamins" }
        ];
    }

    async getUserPhoneNumber() {
        return "+15551234567";
    }
}

class MockSmsService {
    async sendMessage(params: any) {
        logger.info(`[MOCK SMS] Sending to ${params.toNumber}: ${params.body}`);
        return { sid: "mock-sid" };
    }
}

class MockSettingsService {
    async getSettings(_userId: string) {
        return {
            wakeTime: '08:00',
            sleepTime: '22:00',
            adaptiveTiming: false,
            useVoiceAlarm: false
        };
    }
}

class MockSleepService {
    async getSleepLogs(_userId: string, _days: number) {
        return [];
    }
}

class MockVoiceAlarmService {
    async triggerAlarm(userId: string, _phone: string, msg: string) {
        logger.info(`[MOCK VOICE] Alarm for ${userId}: ${msg}`);
        return true;
    }
}

// Mock Pool
class MockPool {
    async query(text: string) {
        if (text.includes("SELECT id")) {
            return { rows: [{ id: "test-user-id", phone_number: "+15551234567" }] };
        }
        return { rows: [] };
    }
}

async function verify() {
    logger.info("Starting Check-in verification...");

    const mockCalendar = new MockCalendarService() as any;
    const mockReminder = new MockReminderService() as any;
    const mockSms = new MockSmsService() as any;
    const mockDb = new MockPool() as any;
    const mockSettings = new MockSettingsService() as any;
    const mockSleep = new MockSleepService() as any;
    const mockVoice = new MockVoiceAlarmService() as any;

    // 1. Test Service Logic directly
    logger.info("Test 1: CheckInService Generation");
    const service = new CheckInService(mockCalendar, mockReminder, mockSms);
    await service.performMorningCheckIn("test-user-id");
    await service.performEveningCheckIn("test-user-id");

    // 2. Test Scheduler Logic
    logger.info("Test 2: CheckInScheduler Trigger");
    const scheduler = new CheckInScheduler(
        service,
        mockDb,
        mockSettings,
        mockSleep,
        mockVoice
    );

    // We can't easily force the time to match strict equality in scheduler without hacking it
    // But we can check if `checkTime` runs without error.
    // To truly test logic we'd need to mock Date or change scheduler to accept time overrides.
    // For verification script, we will just call start/stop to ensure no crash, 
    // and manually call checkTime via `any` cast to verify DB query part.

    scheduler.start();
    await (scheduler as any).checkTime(); // Will likely do nothing if hour doesn't match, but verifies code paths
    scheduler.stop();

    logger.info("✅ Verification Complete (Check logs for [MOCK SMS])");
}

verify().catch(console.error);
