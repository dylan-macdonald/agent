import { DeliveryMethod, ReminderStatus } from "../types/reminder.js";
import { MessagePriority } from "../types/sms.js";
import { logger } from "../utils/logger.js";

import { ReminderService } from "./reminder.js";
import { SmsService } from "./sms.js";


export class ReminderScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;
    private readonly POLLING_INTERVAL_MS = 60 * 1000; // Check every minute

    constructor(
        private reminderService: ReminderService,
        private smsService: SmsService
    ) { }

    public start(): void {
        if (this.isRunning) {return;}

        this.isRunning = true;
        logger.info("Starting Reminder Scheduler...");

        // Initial check
        void this.checkReminders();

        this.intervalId = setInterval(() => {
            void this.checkReminders();
        }, this.POLLING_INTERVAL_MS);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        logger.info("Stopped Reminder Scheduler");
    }

    private async checkReminders(): Promise<void> {
        try {
            const dueReminders = await this.reminderService.getDueReminders();

            if (dueReminders.length > 0) {
                logger.info(`Found ${dueReminders.length} due reminders`);
            }

            for (const reminder of dueReminders) {
                await this.processReminder(reminder);
            }
        } catch (error) {
            logger.error("Error checking reminders", { error });
        }
    }

    private async processReminder(reminder: any): Promise<void> {
        try {
            logger.info(`Processing reminder: ${reminder.title} for user ${reminder.userId}`);

            // 1. Send Notification
            if (reminder.deliveryMethod === DeliveryMethod.SMS || reminder.deliveryMethod === DeliveryMethod.BOTH) {
                // Get phone number - in a real app we'd fetch user profile. 
                // For MVP, we might need a way to get phone number if not in reminder.
                // Assuming SmsService can handle looking up phone by userId if checking `getUserPhoneNumber` inside it
                // Or we need to look it up here.
                // Let's rely on SmsService.sendMessage logic which usually takes userId and looks up phone.
                // Wait, SmsService.sendMessage takes `toNumber`. We need to lookup using DB directly or injected service.
                // HACK: We'll query DB directly in SmsService or pass a helper.
                // Actually, let's look at SmsService.sendMessage signature.

                // Inspecting SmsService.sendMessage signature previously seen:
                // sendMessage(userId, toNumber, body, priority)
                // We need the number. 
                // Let's implement a quick lookup helper or assume SmsService has it.
                // Actually, AssistantService had a hack for this: `(this.smsService as any).db.query...`
                // We should probably add `getUserPhoneNumber` to SmsService or a UserService.

                // For now, let's reuse the hack or assume `smsService` can find it? No, `sendMessage` needs `toNumber`.
                // Let's implement `getUserPhoneNumber` in `ReminderScheduler` effectively duplicative or better, add to SmsService.

                const phoneNumber = await this.getUserPhoneNumber(reminder.userId);

                if (phoneNumber) {
                    await this.smsService.sendMessage({
                        userId: reminder.userId,
                        toNumber: phoneNumber,
                        body: `REMINDER: ${reminder.title}`,
                        priority: MessagePriority.HIGH
                    });
                } else {
                    logger.warn(`No phone number found for user ${reminder.userId}, cannot send SMS reminder`);
                }
            }

            // 2. Mark as SENT
            await this.reminderService.updateStatus(reminder.id, ReminderStatus.SENT);

            // 3. Handle Recurrence (TODO for later MVP refinement)
            if (reminder.isRecurring) {
                // LOGIC: Calculate next occurrence and create new reminder
                // For now, just logging
                logger.info(`Reminder ${reminder.id} is recurring. Next occurrence creation pending implementation.`);
            }

        } catch (error) {
            logger.error("Failed to process reminder", { error, reminderId: reminder.id });
            await this.reminderService.updateStatus(reminder.id, ReminderStatus.FAILED);
        }
    }

    private async getUserPhoneNumber(userId: string): Promise<string | null> {
        // Accessing DB via reminderService's pool if public, or passing DB to Scheduler.
        // Let's pass DB to scheduler? Or make `ReminderService` expose a helper?
        // Let's add `getPhoneNumber` to `ReminderService` for convenience since it has DB access.
        // Waiting to check if I can modify ReminderService... Yes I can.

        // BETTER: Inject DB into Scheduler too? 
        // Or just let ReminderService handle it? 
        // Let's modify ReminderService to have `getUserPhoneNumber`.
        return (this.reminderService as any).getUserPhoneNumber(userId);
    }
}
