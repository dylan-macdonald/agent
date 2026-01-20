/**
 * SMS Communication Types
 *
 * Defines structures for SMS/text messaging communication
 */

export enum MessageDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

export enum MessageStatus {
  PENDING = "pending",
  QUEUED = "queued",
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
  UNDELIVERED = "undelivered",
}

export enum MessagePriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

/**
 * SMS Message
 */
export interface SmsMessage {
  id: string;
  userId: string;
  direction: MessageDirection;
  fromNumber: string;
  toNumber: string;
  body: string;
  status: MessageStatus;
  priority: MessagePriority;
  providerId?: string; // ID from SMS provider (Twilio SID, etc.)
  providerName?: string; // Which provider sent this
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Send SMS input
 */
export interface SendSmsInput {
  userId: string;
  toNumber: string;
  body: string;
  priority?: MessagePriority;
}

/**
 * SMS webhook payload (provider-agnostic)
 */
export interface SmsWebhookPayload {
  messageId?: string;
  fromNumber: string;
  toNumber: string;
  body: string;
  timestamp: Date;
  providerName: string;
  providerData: Record<string, unknown>; // Provider-specific data
}

/**
 * SMS provider capabilities
 */
export interface SmsProviderCapabilities {
  supportsDeliveryReceipts: boolean;
  supportsMediaMessages: boolean;
  maxMessageLength: number;
  supportsBulkSending: boolean;
  supportsScheduling: boolean;
}

/**
 * SMS provider configuration
 */
export interface SmsProviderConfig {
  name: string;
  accountId: string;
  authToken: string;
  fromNumber: string;
  webhookUrl?: string;
  apiEndpoint?: string;
}

/**
 * SMS rate limit configuration
 */
export interface SmsRateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
  burstLimit: number;
}

/**
 * SMS rate limit tracking
 */
export interface SmsRateLimitStatus {
  userId: string;
  sentLastMinute: number;
  sentLastHour: number;
  sentLastDay: number;
  lastResetMinute: Date;
  lastResetHour: Date;
  lastResetDay: Date;
  isLimited: boolean;
  nextAvailableAt?: Date;
}

/**
 * SMS search query
 */
export interface SmsSearchQuery {
  userId: string;
  direction?: MessageDirection;
  status?: MessageStatus;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * SMS statistics
 */
export interface SmsStats {
  userId: string;
  totalSent: number;
  totalReceived: number;
  totalDelivered: number;
  totalFailed: number;
  byStatus: Record<MessageStatus, number>;
  byPriority: Record<MessagePriority, number>;
  averageDeliveryTimeMs?: number;
}

/**
 * Message queue item
 */
export interface MessageQueueItem {
  id: string;
  messageId: string;
  userId: string;
  toNumber: string;
  body: string;
  priority: MessagePriority;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
}

/**
 * SMS provider interface
 */
export interface ISmsProvider {
  readonly name: string;
  readonly capabilities: SmsProviderCapabilities;

  /**
   * Send an SMS message
   */
  sendMessage(input: SendSmsInput): Promise<SmsMessage>;

  /**
   * Get message status from provider
   */
  getMessageStatus(providerId: string): Promise<MessageStatus>;

  /**
   * Parse webhook payload from provider
   */
  parseWebhook(payload: Record<string, unknown>): SmsWebhookPayload;

  /**
   * Validate webhook signature/authenticity
   */
  validateWebhook(
    payload: Record<string, unknown>,
    signature: string,
    url: string
  ): boolean;

  /**
   * Get provider capabilities
   */
  getCapabilities(): SmsProviderCapabilities;
}

/**
 * Helper: Chunk long message into SMS segments
 */
export function chunkMessage(
  message: string,
  maxLength: number = 160
): string[] {
  if (message.length <= maxLength) {
    return [message];
  }

  const chunks: string[] = [];
  const words = message.split(" ");
  let currentChunk = "";

  for (const word of words) {
    if (currentChunk.length + word.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? " " : "") + word;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = word;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Helper: Format phone number to E.164
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If it starts with 1 and has 11 digits, it's already E.164-ish
  if (digits.length === 11 && digits.startsWith("1")) {
    return "+" + digits;
  }

  // If it has 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return "+1" + digits;
  }

  // If it already has a + and looks like E.164, return as-is
  if (phone.startsWith("+")) {
    return phone;
  }

  // Otherwise, add + prefix
  return "+" + digits;
}

/**
 * Helper: Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Helper: Sanitize message body
 */
export function sanitizeMessageBody(body: string): string {
  // Remove control characters except newline and tab
  // eslint-disable-next-line no-control-regex
  return body.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Helper: Calculate delivery time
 */
export function calculateDeliveryTime(sentAt: Date, deliveredAt: Date): number {
  return deliveredAt.getTime() - sentAt.getTime();
}

/**
 * Helper: Determine if rate limit exceeded
 */
export function isRateLimitExceeded(
  status: SmsRateLimitStatus,
  config: SmsRateLimitConfig
): boolean {
  if (status.sentLastMinute >= config.maxPerMinute) { return true; }
  if (status.sentLastHour >= config.maxPerHour) { return true; }
  if (status.sentLastDay >= config.maxPerDay) { return true; }
  return false;
}

/**
 * Helper: Get next available time after rate limit
 */
export function getNextAvailableTime(
  status: SmsRateLimitStatus,
  config: SmsRateLimitConfig
): Date {
  const now = new Date();

  if (status.sentLastMinute >= config.maxPerMinute) {
    const nextMinute = new Date(status.lastResetMinute);
    nextMinute.setMinutes(nextMinute.getMinutes() + 1);
    return nextMinute;
  }

  if (status.sentLastHour >= config.maxPerHour) {
    const nextHour = new Date(status.lastResetHour);
    nextHour.setHours(nextHour.getHours() + 1);
    return nextHour;
  }

  if (status.sentLastDay >= config.maxPerDay) {
    const nextDay = new Date(status.lastResetDay);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  }

  return now;
}

/**
 * Helper: Create rate limit status
 */
export function createRateLimitStatus(userId: string): SmsRateLimitStatus {
  const now = new Date();
  return {
    userId,
    sentLastMinute: 0,
    sentLastHour: 0,
    sentLastDay: 0,
    lastResetMinute: now,
    lastResetHour: now,
    lastResetDay: now,
    isLimited: false,
  };
}
