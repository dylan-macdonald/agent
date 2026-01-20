import { MessagePriority } from "../types/sms.js";
import { logger } from "../utils/logger.js";

import { CalendarService } from "./calendar.js";
import { ReminderService } from "./reminder.js";
import { SmsService } from "./sms.js";
// import { EventQueryOptions } from "../types/calendar.js";

export enum CheckInType {
    MORNING = 'MORNING',
    EVENING = 'EVENING'
}

export class CheckInService {
    constructor(
        private calendarService: CalendarService,
        private reminderService: ReminderService,
        private smsService: SmsService
    ) { }

    /**
     * Generate and send morning briefing
     */
    public async performMorningCheckIn(userId: string): Promise<void> {
        logger.info(`Performing Morning Check-in for ${userId}`);

        try {
            // 1. Get Calendar Events for today
            const now = new Date();
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);

            const events = await this.calendarService.getEvents(userId, {
                startDate: now,
                endDate: endOfDay
            });

            // 2. Get Overdue/Due Reminders
            const reminders = await this.reminderService.getDueReminders();
            // Filter for this user in memory (since getDueReminders returns all due pending)
            const userReminders = reminders.filter(r => r.userId === userId);

            // 3. Construct Message
            let message = "Good morning! Here is your briefing:\n";

            if (events.length > 0) {
                message += `📅 You have ${events.length} events today:\n`;
                events.forEach(e => {
                    message += `- ${e.title} at ${e.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
                });
            } else {
                message += "📅 Your calendar is clear today.\n";
            }

            if (userReminders.length > 0) {
                message += `🔔 You have ${userReminders.length} pending reminders.\n`;
            }

            message += "\nReady to start the day?";

            // 4. Send Message
            const phoneNumber = await (this.reminderService as any).getUserPhoneNumber(userId);
            if (phoneNumber) {
                await this.smsService.sendMessage({
                    userId,
                    toNumber: phoneNumber,
                    body: message,
                    priority: MessagePriority.NORMAL
                });
            } else {
                logger.warn(`No phone number for user ${userId}, skipping check-in`);
            }

        } catch (error) {
            logger.error("Failed to perform morning check-in", { error, userId });
        }
    }

    /**
     * Generate and send evening wrap-up
     */
    public async performEveningCheckIn(userId: string): Promise<void> {
        logger.info(`Performing Evening Check-in for ${userId}`);

        const message = "Good evening! Time to wrap up. distinct\nHow did your day go? Did you complete your goals?";

        try {
            const phoneNumber = await (this.reminderService as any).getUserPhoneNumber(userId);
            if (phoneNumber) {
                await this.smsService.sendMessage({
                    userId,
                    toNumber: phoneNumber,
                    body: message,
                    priority: MessagePriority.NORMAL
                });
            }
        } catch (error) {
            logger.error("Failed to perform evening check-in", { error, userId });
        }
    }
}
