import { logger } from "../utils/logger.js";

import { CheckInService, CheckInType } from "./checkin.js";

// Simple in-memory tracker for MVP to prevent double sending in same process runtime
// In production, use Redis or DB
const runLog: Record<string, Record<string, Date>> = {};

export class CheckInScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;

    // Config (Hardcoded for MVP)
    private readonly MORNING_HOUR = 9; // 9:00 AM
    private readonly EVENING_HOUR = 17; // 5:00 PM

    // We'll iterate through known users. 
    // For MVP, since we don't have a robust user list in memory service, 
    // we might need to query DB or just hardcode a test user if simpler.
    // Let's assume we fetch users from DB or just support the active user context if passed?
    // Let's query DB for all users for correctness.

    constructor(
        private checkInService: CheckInService,
        private db: any // Injecting DB to fetch users
    ) { }

    public start(): void {
        if (this.isRunning) {return;}
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
        const hour = now.getHours();
        // date string key: YYYY-MM-DD
        const today = now.toISOString().split('T')[0] || new Date().toDateString();

        try {
            // 1. Fetch Users
            const result = await this.db.query("SELECT id FROM users");
            const users = result.rows;

            for (const user of users) {
                const userId = user.id;

                // Initialize log
                if (!runLog[userId]) {runLog[userId] = {};}

                // Morning Check
                if (hour === this.MORNING_HOUR) {
                    // Check if already run today
                    if (!this.hasRun(userId, CheckInType.MORNING, today)) {
                        await this.checkInService.performMorningCheckIn(userId);
                        this.markRun(userId, CheckInType.MORNING);
                    }
                }

                // Evening Check
                if (hour === this.EVENING_HOUR) {
                    if (!this.hasRun(userId, CheckInType.EVENING, today)) {
                        await this.checkInService.performEveningCheckIn(userId);
                        this.markRun(userId, CheckInType.EVENING);
                    }
                }
            }

        } catch (error) {
            logger.error("Error in CheckInScheduler", { error });
        }
    }

    private hasRun(userId: string, type: CheckInType, dateKey: string): boolean {
        // Very basic check. 
        // Logic: if runLog[userId][type] is set and matches today or just is set for today logic...
        // Wait, runLog needs to store date.
        // Simplified: runLog[userId][type] = timestamp of last run.
        // If last run was today, return true.

        const lastRun = runLog[userId]?.[type];
        if (!lastRun) {return false;}

        return lastRun.toISOString().split('T')[0] === dateKey;
    }

    private markRun(userId: string, type: CheckInType): void {
        if (!runLog[userId]) {runLog[userId] = {};}
        runLog[userId][type] = new Date();
    }
}
