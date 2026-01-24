/**
 * Voice Alarm Service
 *
 * Handles Twilio Voice calls for wake-up alarms and urgent reminders.
 * Includes call logging, retry logic, and status tracking.
 */

import twilio from "twilio";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";
import { BillingService } from "./billing.js";
import { SettingsService } from "./settings.js";
import { CostService } from "./cost.js";
import {
    VoiceCall,
    VoiceCallStatus,
    VoiceCallType,
    CreateVoiceCallDTO,
    TWILIO_VOICE_COST_PER_MINUTE
} from "../types/voice-call.js";

interface PendingRetry {
    callId: string;
    userId: string;
    phoneNumber: string;
    message: string;
    type: VoiceCallType;
    retryCount: number;
    scheduledTime: Date;
}

export class VoiceAlarmService {
    private retryQueue: Map<string, NodeJS.Timeout> = new Map();
    private maxRetries = 3;
    private retryIntervalMinutes = 5;

    constructor(
        private db: Pool,
        private billingService: BillingService,
        private settingsService: SettingsService,
        private costService: CostService,
        private publicUrl: string
    ) {}

    /**
     * Trigger a voice alarm call with logging and retry support
     */
    public async triggerAlarm(
        userId: string,
        phoneNumber: string,
        message: string,
        type: VoiceCallType = VoiceCallType.WAKE_UP,
        relatedId?: string
    ): Promise<VoiceCall | null> {
        // Check user settings
        const settings = await this.settingsService.getSettings(userId);
        if (!settings.useVoiceAlarm) {
            logger.debug(`Voice alarms disabled for user ${userId}`);
            return null;
        }

        // Create call record
        const call = await this.createCallRecord({
            userId,
            phoneNumber,
            type,
            message,
            relatedId
        });

        // Attempt the call
        const success = await this.makeCall(call);

        if (!success && call.retryCount < this.maxRetries) {
            this.scheduleRetry(call);
        }

        return call;
    }

    /**
     * Create a call record in the database
     */
    private async createCallRecord(dto: CreateVoiceCallDTO): Promise<VoiceCall> {
        const id = uuidv4();
        const now = new Date();

        const query = `
            INSERT INTO voice_calls (
                id, user_id, phone_number, type, status, message,
                acknowledged, retry_count, related_id, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            id,
            dto.userId,
            dto.phoneNumber,
            dto.type,
            VoiceCallStatus.QUEUED,
            dto.message,
            false,
            0,
            dto.relatedId || null,
            now,
            now
        ];

        try {
            const result = await this.db.query(query, values);
            logger.info("Created voice call record", { id, userId: dto.userId, type: dto.type });
            return this.mapRowToCall(result.rows[0]);
        } catch (error) {
            logger.error("Failed to create voice call record", { error, dto });
            throw error;
        }
    }

    /**
     * Make the actual Twilio call
     */
    private async makeCall(call: VoiceCall): Promise<boolean> {
        try {
            // Get Twilio credentials
            const accountSid = await this.billingService.getDecryptedKey(call.userId, 'twilio');
            const authToken = await this.billingService.getDecryptedKey(call.userId, 'twilio_auth_token');
            const fromNumber = await this.billingService.getDecryptedKey(call.userId, 'twilio_phone_number');

            if (!accountSid || !authToken) {
                logger.warn(`Missing Twilio credentials for user ${call.userId}`);
                await this.updateCallStatus(call.id, VoiceCallStatus.FAILED, 'Missing Twilio credentials');
                return false;
            }

            const client = new twilio.Twilio(accountSid, authToken);

            // Build TwiML URL with encoded message and call ID
            const twimlUrl = `${this.publicUrl}/api/voice/alarm-twiml?` +
                `message=${encodeURIComponent(call.message)}` +
                `&callId=${encodeURIComponent(call.id)}` +
                `&type=${encodeURIComponent(call.type)}`;

            const statusCallbackUrl = `${this.publicUrl}/api/voice/status`;

            // Make the call
            const twilioCall = await client.calls.create({
                url: twimlUrl,
                to: call.phoneNumber,
                from: fromNumber || process.env.TWILIO_PHONE_NUMBER || '+15005550006',
                statusCallback: statusCallbackUrl,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallbackMethod: 'POST'
            });

            // Update call with Twilio SID
            await this.updateCallWithSid(call.id, twilioCall.sid);

            logger.info(`Voice call initiated`, {
                callId: call.id,
                callSid: twilioCall.sid,
                userId: call.userId,
                type: call.type
            });

            return true;

        } catch (error) {
            logger.error("Failed to make voice call", { error, callId: call.id });
            await this.updateCallStatus(
                call.id,
                VoiceCallStatus.FAILED,
                error instanceof Error ? error.message : 'Unknown error'
            );
            return false;
        }
    }

    /**
     * Update call with Twilio SID
     */
    private async updateCallWithSid(callId: string, callSid: string): Promise<void> {
        const query = `
            UPDATE voice_calls
            SET call_sid = $1, status = $2, started_at = NOW(), updated_at = NOW()
            WHERE id = $3
        `;
        await this.db.query(query, [callSid, VoiceCallStatus.IN_PROGRESS, callId]);
    }

    /**
     * Update call status
     */
    public async updateCallStatus(
        callId: string,
        status: VoiceCallStatus,
        errorMessage?: string
    ): Promise<void> {
        const query = `
            UPDATE voice_calls
            SET status = $1, error_message = $2, updated_at = NOW()
            ${status === VoiceCallStatus.COMPLETED ? ', ended_at = NOW()' : ''}
            WHERE id = $3
        `;
        await this.db.query(query, [status, errorMessage || null, callId]);
    }

    /**
     * Handle Twilio status callback
     */
    public async handleStatusCallback(
        callSid: string,
        status: string,
        duration?: number,
        price?: number
    ): Promise<void> {
        // Map Twilio status to our enum
        const mappedStatus = this.mapTwilioStatus(status);

        const query = `
            UPDATE voice_calls
            SET status = $1,
                duration = COALESCE($2, duration),
                cost = COALESCE($3, cost),
                ended_at = CASE WHEN $1 IN ('completed', 'failed', 'busy', 'no-answer', 'canceled') THEN NOW() ELSE ended_at END,
                updated_at = NOW()
            WHERE call_sid = $4
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, [
                mappedStatus,
                duration || null,
                price || null,
                callSid
            ]);

            if (result.rows.length > 0) {
                const call = this.mapRowToCall(result.rows[0]);

                // Log cost if call completed
                if (duration && call.userId) {
                    const estimatedCost = (duration / 60) * TWILIO_VOICE_COST_PER_MINUTE;
                    await this.costService.logApiCost({
                        userId: call.userId,
                        provider: 'twilio',
                        operation: 'voice_call',
                        model: 'voice',
                        inputTokens: 0,
                        outputTokens: 0,
                        cost: estimatedCost
                    });
                }

                // Handle retry for unanswered calls
                if (
                    (mappedStatus === VoiceCallStatus.NO_ANSWER || mappedStatus === VoiceCallStatus.BUSY) &&
                    call.retryCount < this.maxRetries
                ) {
                    this.scheduleRetry(call);
                }

                logger.info("Updated voice call status", {
                    callSid,
                    status: mappedStatus,
                    duration,
                    callId: call.id
                });
            }
        } catch (error) {
            logger.error("Failed to update call status", { error, callSid });
        }
    }

    /**
     * Handle user acknowledgment (from speech recognition)
     */
    public async handleAcknowledgment(callId: string, acknowledged: boolean): Promise<void> {
        const query = `
            UPDATE voice_calls
            SET acknowledged = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        try {
            const result = await this.db.query(query, [acknowledged, callId]);

            if (result.rows.length > 0 && acknowledged) {
                // Cancel any pending retries
                this.cancelRetry(callId);
                logger.info("Voice call acknowledged", { callId });
            }
        } catch (error) {
            logger.error("Failed to update acknowledgment", { error, callId });
        }
    }

    /**
     * Schedule a retry call
     */
    private scheduleRetry(call: VoiceCall): void {
        const retryDelay = this.retryIntervalMinutes * 60 * 1000;
        const nextRetry = new Date(Date.now() + retryDelay);

        logger.info(`Scheduling retry for call ${call.id} at ${nextRetry.toISOString()}`);

        const timeout = setTimeout(async () => {
            try {
                // Increment retry count
                await this.db.query(
                    `UPDATE voice_calls SET retry_count = retry_count + 1, updated_at = NOW() WHERE id = $1`,
                    [call.id]
                );

                // Attempt the call again
                call.retryCount += 1;
                const success = await this.makeCall(call);

                if (!success && call.retryCount < this.maxRetries) {
                    this.scheduleRetry(call);
                }

                this.retryQueue.delete(call.id);
            } catch (error) {
                logger.error("Retry failed", { error, callId: call.id });
            }
        }, retryDelay);

        this.retryQueue.set(call.id, timeout);
    }

    /**
     * Cancel a scheduled retry
     */
    private cancelRetry(callId: string): void {
        const timeout = this.retryQueue.get(callId);
        if (timeout) {
            clearTimeout(timeout);
            this.retryQueue.delete(callId);
            logger.info("Cancelled retry for call", { callId });
        }
    }

    /**
     * Get call history for a user
     */
    public async getCallHistory(userId: string, limit: number = 20): Promise<VoiceCall[]> {
        const query = `
            SELECT * FROM voice_calls
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;

        try {
            const result = await this.db.query(query, [userId, limit]);
            return result.rows.map(this.mapRowToCall);
        } catch (error) {
            logger.error("Failed to get call history", { error, userId });
            return [];
        }
    }

    /**
     * Get call by ID
     */
    public async getCallById(callId: string): Promise<VoiceCall | null> {
        const query = `SELECT * FROM voice_calls WHERE id = $1`;

        try {
            const result = await this.db.query(query, [callId]);
            return result.rows.length > 0 ? this.mapRowToCall(result.rows[0]) : null;
        } catch (error) {
            logger.error("Failed to get call", { error, callId });
            return null;
        }
    }

    /**
     * Get call by Twilio SID
     */
    public async getCallBySid(callSid: string): Promise<VoiceCall | null> {
        const query = `SELECT * FROM voice_calls WHERE call_sid = $1`;

        try {
            const result = await this.db.query(query, [callSid]);
            return result.rows.length > 0 ? this.mapRowToCall(result.rows[0]) : null;
        } catch (error) {
            logger.error("Failed to get call by SID", { error, callSid });
            return null;
        }
    }

    /**
     * Generate TwiML for alarm calls
     */
    public generateAlarmTwiML(message: string, callId: string, type: VoiceCallType): string {
        const escapedMessage = this.escapeXml(message);
        const responseUrl = `${this.publicUrl}/api/voice/alarm-response?callId=${encodeURIComponent(callId)}`;

        // Different TwiML based on call type
        if (type === VoiceCallType.WAKE_UP) {
            return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">${escapedMessage}</Say>
    <Pause length="1"/>
    <Gather input="speech" action="${responseUrl}" timeout="10" speechTimeout="auto">
        <Say voice="Polly.Joanna">Please say "I am up" to confirm you're awake.</Say>
    </Gather>
    <Say voice="Polly.Joanna">I didn't hear you. I will call again in ${this.retryIntervalMinutes} minutes. Take care!</Say>
</Response>`;
        }

        // For reminders and other types
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">${escapedMessage}</Say>
    <Pause length="1"/>
    <Gather input="speech" action="${responseUrl}" timeout="5" speechTimeout="auto">
        <Say voice="Polly.Joanna">Press any key or say OK to acknowledge.</Say>
    </Gather>
    <Say voice="Polly.Joanna">Message delivered. Goodbye.</Say>
</Response>`;
    }

    /**
     * Generate TwiML for acknowledgment response
     */
    public generateResponseTwiML(acknowledged: boolean): string {
        if (acknowledged) {
            return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Great! Have a wonderful day. Goodbye!</Say>
    <Hangup/>
</Response>`;
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">I didn't catch that. Let me try again.</Say>
    <Redirect>/api/voice/alarm-twiml</Redirect>
</Response>`;
    }

    /**
     * Map Twilio status to our enum
     */
    private mapTwilioStatus(twilioStatus: string): VoiceCallStatus {
        const statusMap: Record<string, VoiceCallStatus> = {
            'queued': VoiceCallStatus.QUEUED,
            'ringing': VoiceCallStatus.RINGING,
            'in-progress': VoiceCallStatus.IN_PROGRESS,
            'completed': VoiceCallStatus.COMPLETED,
            'busy': VoiceCallStatus.BUSY,
            'no-answer': VoiceCallStatus.NO_ANSWER,
            'failed': VoiceCallStatus.FAILED,
            'canceled': VoiceCallStatus.CANCELED
        };
        return statusMap[twilioStatus.toLowerCase()] || VoiceCallStatus.FAILED;
    }

    /**
     * Map database row to VoiceCall
     */
    private mapRowToCall(row: any): VoiceCall {
        return {
            id: row.id,
            userId: row.user_id,
            callSid: row.call_sid,
            phoneNumber: row.phone_number,
            type: row.type as VoiceCallType,
            status: row.status as VoiceCallStatus,
            message: row.message,
            duration: row.duration,
            cost: row.cost ? parseFloat(row.cost) : undefined,
            acknowledged: row.acknowledged,
            retryCount: row.retry_count,
            relatedId: row.related_id,
            errorMessage: row.error_message,
            scheduledAt: row.scheduled_at,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Cleanup: cancel all pending retries
     */
    public cleanup(): void {
        for (const [callId, timeout] of this.retryQueue) {
            clearTimeout(timeout);
            logger.debug(`Cancelled retry for ${callId} during cleanup`);
        }
        this.retryQueue.clear();
    }
}
