import { MessagePriority } from "../types/sms.js";
import { logger } from "../utils/logger.js";

import { CalendarService } from "./calendar.js";
import { ReminderService } from "./reminder.js";
import { GoalService } from "./goal.js";
import { SleepService, WorkoutService } from "./health/service.js";
import { MemoryService } from "./memory.js";
import { SmsService } from "./sms.js";
import { LlmService, BriefingContext, BriefingType } from "./llm.js";
import { BillingService } from "./billing.js";
import { SettingsService } from "./settings.js";

export enum CheckInType {
    MORNING = 'MORNING',
    EVENING = 'EVENING'
}

export class CheckInService {
    constructor(
        private calendarService: CalendarService,
        private reminderService: ReminderService,
        private goalService: GoalService,
        private sleepService: SleepService,
        private workoutService: WorkoutService,
        private memoryService: MemoryService,
        private smsService: SmsService,
        private llmService: LlmService,
        private billingService: BillingService,
        private settingsService: SettingsService
    ) { }

    /**
     * Gather full context for a user
     */
    private async gatherContext(userId: string, type: BriefingType): Promise<BriefingContext> {
        const settings = await this.settingsService.getSettings(userId);
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        // Get today's events
        const events = await this.calendarService.getEvents(userId, {
            startDate: now,
            endDate: endOfDay
        });

        // Get pending reminders
        const allReminders = await this.reminderService.getDueReminders();
        const userReminders = allReminders.filter(r => r.userId === userId);

        // Get active goals
        const goals = await this.goalService.getGoals(userId);
        const activeGoals = goals.filter(g => g.status === 'IN_PROGRESS');

        // Get health insights
        const sleepLogs = await this.sleepService.getSleepLogs(userId, 7);
        const workouts = await this.workoutService.getWorkouts(userId, 7);

        let avgSleep: number | undefined;
        if (sleepLogs.length > 0) {
            const totalHours = sleepLogs.reduce((sum, log) => {
                const start = new Date(log.startTime);
                const end = new Date(log.endTime);
                return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            }, 0);
            avgSleep = Math.round((totalHours / sleepLogs.length) * 10) / 10;
        }

        // Get recent memories about the user
        let recentMemories: string[] = [];
        try {
            const memories = await this.memoryService.getMemories(userId, {
                limit: 5,
                types: ['preference', 'fact', 'pattern']
            });
            recentMemories = memories.map(m => m.content).slice(0, 3);
        } catch {
            // Memory retrieval is optional
        }

        return {
            type,
            userName: settings.username || undefined,
            deliveryMethod: 'sms',
            events: events.map(e => ({
                title: e.title,
                time: new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                location: e.location || undefined
            })),
            reminders: userReminders.map(r => ({
                title: r.title,
                isOverdue: new Date(r.dueAt) < now
            })),
            goals: activeGoals.map(g => ({
                title: g.title,
                progress: g.progress || 0
            })),
            healthInsights: {
                avgSleep,
                workoutsThisWeek: workouts.length,
                lastWorkout: workouts.length > 0 ? workouts[0].activityType : undefined
            },
            recentMemories
        };
    }

    /**
     * Generate and send morning briefing using LLM
     */
    public async performMorningCheckIn(userId: string): Promise<void> {
        logger.info(`Performing LLM-powered Morning Check-in for ${userId}`);

        try {
            // Gather full context
            const context = await this.gatherContext(userId, 'morning_briefing');

            // Get API key
            const apiKey = await this.billingService.getDecryptedKey(userId, 'anthropic');
            if (!apiKey) {
                logger.warn(`No Anthropic API key for user ${userId}, using fallback message`);
                await this.sendFallbackMorningCheckIn(userId);
                return;
            }

            // Generate personalized briefing
            const message = await this.llmService.generateBriefing(context, apiKey);

            // Send via SMS
            const phoneNumber = await this.getUserPhoneNumber(userId);
            if (phoneNumber) {
                await this.smsService.sendMessage({
                    userId,
                    toNumber: phoneNumber,
                    body: message,
                    priority: MessagePriority.NORMAL
                });
                logger.info(`Morning check-in sent to ${userId}`);
            } else {
                logger.warn(`No phone number for user ${userId}, skipping check-in`);
            }

        } catch (error) {
            logger.error("Failed to perform morning check-in", { error, userId });
            // Fallback to basic message on error
            await this.sendFallbackMorningCheckIn(userId);
        }
    }

    /**
     * Generate and send evening reflection using LLM
     */
    public async performEveningCheckIn(userId: string): Promise<void> {
        logger.info(`Performing LLM-powered Evening Check-in for ${userId}`);

        try {
            // Gather full context
            const context = await this.gatherContext(userId, 'evening_reflection');

            // Get API key
            const apiKey = await this.billingService.getDecryptedKey(userId, 'anthropic');
            if (!apiKey) {
                logger.warn(`No Anthropic API key for user ${userId}, using fallback message`);
                await this.sendFallbackEveningCheckIn(userId);
                return;
            }

            // Generate personalized reflection prompt
            const message = await this.llmService.generateBriefing(context, apiKey);

            // Send via SMS
            const phoneNumber = await this.getUserPhoneNumber(userId);
            if (phoneNumber) {
                await this.smsService.sendMessage({
                    userId,
                    toNumber: phoneNumber,
                    body: message,
                    priority: MessagePriority.NORMAL
                });
                logger.info(`Evening check-in sent to ${userId}`);
            }

        } catch (error) {
            logger.error("Failed to perform evening check-in", { error, userId });
            await this.sendFallbackEveningCheckIn(userId);
        }
    }

    /**
     * Generate a voice alarm message using LLM
     */
    public async generateWakeUpMessage(userId: string): Promise<string> {
        try {
            const context = await this.gatherContext(userId, 'morning_wakeup');
            context.deliveryMethod = 'voice';

            const apiKey = await this.billingService.getDecryptedKey(userId, 'anthropic');
            if (!apiKey) {
                return "Good morning! It's time to wake up. Say I am up when you're ready.";
            }

            const message = await this.llmService.generateBriefing(context, apiKey);
            // Append the dismiss instruction for voice
            return message + " Say I am up when you're ready to start your day.";

        } catch (error) {
            logger.error("Failed to generate wake-up message", { error, userId });
            return "Good morning! It's time to wake up. Say I am up when you're ready.";
        }
    }

    private async sendFallbackMorningCheckIn(userId: string): Promise<void> {
        const phoneNumber = await this.getUserPhoneNumber(userId);
        if (phoneNumber) {
            await this.smsService.sendMessage({
                userId,
                toNumber: phoneNumber,
                body: "Good morning! Ready to start your day? Reply with your plans or just say hi.",
                priority: MessagePriority.NORMAL
            });
        }
    }

    private async sendFallbackEveningCheckIn(userId: string): Promise<void> {
        const phoneNumber = await this.getUserPhoneNumber(userId);
        if (phoneNumber) {
            await this.smsService.sendMessage({
                userId,
                toNumber: phoneNumber,
                body: "Good evening! How did your day go? Any wins to celebrate?",
                priority: MessagePriority.NORMAL
            });
        }
    }

    private async getUserPhoneNumber(userId: string): Promise<string | null> {
        try {
            const settings = await this.settingsService.getSettings(userId);
            return settings.phoneNumber || null;
        } catch {
            return null;
        }
    }
}
