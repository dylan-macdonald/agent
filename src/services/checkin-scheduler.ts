import { logger } from "../utils/logger.js";
import { CheckInService, CheckInType } from "./checkin.js";
import { SettingsService } from "./settings.js";
import { SleepService } from "./health/service.js";
import { VoiceAlarmService } from "./voice-alarm.js";

const runLog: Record<string, Record<string, Date>> = {};

export class CheckInScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;

    constructor(
        private checkInService: CheckInService,
        private db: any, // Injecting DB to fetch users
        private settingsService: SettingsService,
        private sleepService: SleepService,
        private voiceAlarmService: VoiceAlarmService
    ) { }

    public start(): void {
        if (this.isRunning) { return; }
        this.isRunning = true;
        logger.info("Starting Check-in Scheduler...");

        this.intervalId = setInterval(() => {
            void this.checkTime();
        }, 60 * 1000); // Check every minute
    }

    public stop(): void {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async checkTime(): Promise<void> {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const today = now.toISOString().split('T')[0] || new Date().toDateString();

        try {
            const result = await this.db.query("SELECT id, phone_number FROM users");
            const users = result.rows;

            for (const user of users) {
                const userId = user.id;
                if (!runLog[userId]) { runLog[userId] = {}; }

                const settings = await this.settingsService.getSettings(userId);

                // --- Morning Check-In Logic ---
                let wakeHour = 9;
                let wakeMinute = 0;

                const wakeParts = (settings.wakeTime || '09:00').split(':').map(Number);
                if (wakeParts.length >= 2 && wakeParts[0] !== undefined && wakeParts[1] !== undefined && !isNaN(wakeParts[0]) && !isNaN(wakeParts[1])) {
                    wakeHour = wakeParts[0];
                    wakeMinute = wakeParts[1];
                }

                if (settings.adaptiveTiming) {
                    const logs = await this.sleepService.getSleepLogs(userId, 7);
                    if (logs.length > 0) {
                        const wakeMinutes = logs.map(l => {
                            const d = new Date(l.endTime);
                            return d.getHours() * 60 + d.getMinutes();
                        });
                        const avgMinutes = wakeMinutes.reduce((a, b) => a + b, 0) / wakeMinutes.length;
                        wakeHour = Math.floor(avgMinutes / 60);
                        wakeMinute = Math.round(avgMinutes % 60);
                    }
                }

                if (currentHour === wakeHour && currentMinute === wakeMinute) {
                    if (!this.hasRun(userId, CheckInType.MORNING, today)) {
                        if (settings.useVoiceAlarm && user.phone_number) {
                            await this.voiceAlarmService.triggerAlarm(
                                userId,
                                user.phone_number,
                                "Good morning. It is time to wake up. Please say I am up to dismiss."
                            );
                        } else {
                            await this.checkInService.performMorningCheckIn(userId);
                        }
                        this.markRun(userId, CheckInType.MORNING);
                    }
                }

                // --- Evening Check-In Logic ---
                let checkInHour = 21;
                let checkInMinute = 0;

                const sleepParts = (settings.sleepTime || '23:00').split(':').map(Number);
                let sleepHour = 23;
                let sleepMinute = 0;
                if (sleepParts.length >= 2 && sleepParts[0] !== undefined && sleepParts[1] !== undefined && !isNaN(sleepParts[0]) && !isNaN(sleepParts[1])) {
                    sleepHour = sleepParts[0];
                    sleepMinute = sleepParts[1];
                }

                if (settings.adaptiveTiming) {
                    const targetSleep = new Date();
                    targetSleep.setHours(sleepHour, sleepMinute, 0, 0);
                    targetSleep.setHours(targetSleep.getHours() - 1);
                    checkInHour = targetSleep.getHours();
                    checkInMinute = targetSleep.getMinutes();
                } else if (settings.eveningCheckInTime) {
                    const parts = settings.eveningCheckInTime.split(':').map(Number);
                    if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        checkInHour = parts[0];
                        checkInMinute = parts[1];
                    }
                }

                if (currentHour === checkInHour && currentMinute === checkInMinute) {
                    if (!this.hasRun(userId, CheckInType.EVENING, today)) {
                        await this.checkInService.performEveningCheckIn(userId);
                        this.markRun(userId, CheckInType.EVENING);
                    }
                }
            }
        } catch (error: any) {
            logger.error("Error in CheckInScheduler", { error: error instanceof Error ? error.message : JSON.stringify(error) });
        }
    }

    private hasRun(userId: string, type: CheckInType, dateKey: string): boolean {
        const lastRun = runLog[userId]?.[type];
        if (!lastRun) { return false; }
        return lastRun.toISOString().split('T')[0] === dateKey;
    }

    private markRun(userId: string, type: CheckInType): void {
        if (!runLog[userId]) { runLog[userId] = {}; }
        runLog[userId][type] = new Date();
    }
}
