/**
 * Voice Call Types
 *
 * Types for Twilio voice alarm calls
 */

export enum VoiceCallStatus {
    QUEUED = 'queued',
    RINGING = 'ringing',
    IN_PROGRESS = 'in-progress',
    COMPLETED = 'completed',
    BUSY = 'busy',
    NO_ANSWER = 'no-answer',
    FAILED = 'failed',
    CANCELED = 'canceled'
}

export enum VoiceCallType {
    WAKE_UP = 'wake_up',
    REMINDER = 'reminder',
    URGENT = 'urgent',
    CHECK_IN = 'check_in'
}

export interface VoiceCall {
    id: string;
    userId: string;
    /** Twilio Call SID */
    callSid?: string;
    phoneNumber: string;
    type: VoiceCallType;
    status: VoiceCallStatus;
    /** Message spoken during the call */
    message: string;
    /** Duration in seconds */
    duration?: number;
    /** Cost in USD */
    cost?: number;
    /** Whether user acknowledged the call */
    acknowledged: boolean;
    /** Number of retry attempts */
    retryCount: number;
    /** Related reminder/insight ID if applicable */
    relatedId?: string;
    /** Error message if failed */
    errorMessage?: string;
    scheduledAt?: Date;
    startedAt?: Date;
    endedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateVoiceCallDTO {
    userId: string;
    phoneNumber: string;
    type: VoiceCallType;
    message: string;
    relatedId?: string;
    scheduledAt?: Date;
}

export interface VoiceCallWebhookPayload {
    callSid: string;
    accountSid: string;
    from: string;
    to: string;
    status: string;
    direction: string;
    duration?: string;
    callPrice?: string;
    speechResult?: string;
}

export interface VoiceCallSettings {
    /** Enable voice calls */
    enabled: boolean;
    /** Phone number to call */
    phoneNumber: string;
    /** Maximum retry attempts */
    maxRetries: number;
    /** Minutes between retries */
    retryIntervalMinutes: number;
    /** Enable wake-up calls */
    wakeUpCallsEnabled: boolean;
    /** Enable urgent reminder calls */
    urgentRemindersEnabled: boolean;
}

export const DEFAULT_VOICE_CALL_SETTINGS: VoiceCallSettings = {
    enabled: false,
    phoneNumber: '',
    maxRetries: 3,
    retryIntervalMinutes: 5,
    wakeUpCallsEnabled: true,
    urgentRemindersEnabled: true
};

/** Cost per minute for Twilio Voice (approximate) */
export const TWILIO_VOICE_COST_PER_MINUTE = 0.013;
