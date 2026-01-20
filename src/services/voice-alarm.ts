import twilio from "twilio";
import { logger } from "../utils/logger.js";
import { BillingService } from "./billing.js";

export class VoiceAlarmService {
    constructor(
        private billingService: BillingService,
        private publicUrl: string // Webhook callback URL
    ) { }

    /**
     * Trigger a voice alarm call
     */
    public async triggerAlarm(userId: string, phoneNumber: string, message: string): Promise<boolean> {
        try {
            // 1. Get Credentials
            const accountSid = await this.billingService.getDecryptedKey(userId, 'twilio');
            const authToken = await this.billingService.getDecryptedKey(userId, 'twilio_auth_token');

            if (!accountSid || !authToken) {
                logger.warn(`Missing Twilio credentials for user ${userId}`);
                return false;
            }

            const client = new twilio.Twilio(accountSid, authToken);

            // 2. Make Call
            // We point to a TwiML generation endpoint on our own server
            const callbackUrl = `${this.publicUrl}/api/voice/alarm-twiml?message=${encodeURIComponent(message)}`;

            await client.calls.create({
                url: callbackUrl,
                to: phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER || '+15005550006' // Magic number for testing or env
            });

            logger.info(`Voice alarm triggered for ${userId}`);
            return true;

        } catch (error) {
            logger.error("Failed to trigger voice alarm", { error, userId });
            return false;
        }
    }

    /**
     * Generate TwiML for the alarm call
     */
    public generateAlarmTwiML(message: string): string {
        // TwiML to say message and wait for "I'm up" or any input
        return `
        <Response>
            <Say voice="alice">${message}</Say>
            <Pause length="1"/>
            <Gather input="speech" action="/api/voice/alarm-response" timeout="10">
                <Say>Please say "I am up" to stop the alarm.</Say>
            </Gather>
            <Say>I did not hear you. I will call again in 5 minutes. Goodbye.</Say>
        </Response>
        `;
    }
}
