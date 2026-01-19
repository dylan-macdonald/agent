/**
 * SMS Service
 *
 * Handles SMS message sending, receiving, rate limiting, and queuing
 */

import { Pool } from 'pg';
import {
  SmsMessage,
  SendSmsInput,
  MessageDirection,
  MessageStatus,
  MessagePriority,
  SmsSearchQuery,
  SmsStats,
  SmsRateLimitConfig,
  SmsRateLimitStatus,
  ISmsProvider,
  SmsWebhookPayload,
  isValidPhoneNumber,
  sanitizeMessageBody,
  isRateLimitExceeded,
  getNextAvailableTime,
  chunkMessage,
} from '../types/sms.js';
import { NotFoundError, ValidationError } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class SmsService {
  private rateLimitConfig: SmsRateLimitConfig = {
    maxPerMinute: 5,
    maxPerHour: 50,
    maxPerDay: 200,
    burstLimit: 10,
  };

  constructor(
    private db: Pool,
    private provider: ISmsProvider
  ) {}

  // ==========================================================================
  // Send SMS
  // ==========================================================================

  /**
   * Send an SMS message with rate limiting and queuing
   */
  async sendMessage(input: SendSmsInput): Promise<SmsMessage> {
    // Validate phone number
    if (!isValidPhoneNumber(input.toNumber)) {
      throw new ValidationError(`Invalid phone number: ${input.toNumber}`);
    }

    // Sanitize message body
    const sanitizedBody = sanitizeMessageBody(input.body);

    if (!sanitizedBody || sanitizedBody.trim().length === 0) {
      throw new ValidationError('Message body cannot be empty');
    }

    // Check rate limits
    const rateLimitStatus = await this.getRateLimitStatus(input.userId);

    if (isRateLimitExceeded(rateLimitStatus, this.rateLimitConfig)) {
      const nextAvailable = getNextAvailableTime(rateLimitStatus, this.rateLimitConfig);

      throw new ValidationError(
        `Rate limit exceeded. Next available time: ${nextAvailable.toISOString()}`
      );
    }

    // Get user's phone number from database
    const fromNumber = await this.getUserPhoneNumber(input.userId);

    // Create message record
    const message = await this.createMessageRecord({
      userId: input.userId,
      fromNumber,
      toNumber: input.toNumber,
      body: sanitizedBody,
      priority: input.priority || MessagePriority.NORMAL,
    });

    // Send via provider
    try {
      const sent = await this.provider.sendMessage({
        userId: input.userId,
        toNumber: input.toNumber,
        body: sanitizedBody,
        ...(input.priority && { priority: input.priority }),
      });

      const providerId = sent.providerId;

      // Update message with provider info
      await this.updateMessageStatus(message.id, {
        status: MessageStatus.SENT,
        ...(providerId && { providerId }),
        providerName: this.provider.name,
        sentAt: new Date(),
      });

      // Update rate limit
      await this.incrementRateLimit(input.userId);

      logger.info(`SMS sent to ${input.toNumber} via ${this.provider.name}`);

      return await this.getMessageById(message.id);
    } catch (error) {
      // Update message as failed
      await this.updateMessageStatus(message.id, {
        status: MessageStatus.FAILED,
        errorMessage: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Send a message, chunking if necessary
   */
  async sendLongMessage(input: SendSmsInput): Promise<SmsMessage[]> {
    const maxLength = this.provider.capabilities.maxMessageLength;
    const chunks = chunkMessage(input.body, maxLength);

    const messages: SmsMessage[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prefix = chunks.length > 1 ? `(${i + 1}/${chunks.length}) ` : '';

      const message = await this.sendMessage({
        ...input,
        body: prefix + chunk,
      });

      messages.push(message);
    }

    return messages;
  }

  // ==========================================================================
  // Receive SMS
  // ==========================================================================

  /**
   * Process incoming SMS webhook
   */
  async processIncomingMessage(webhookPayload: SmsWebhookPayload): Promise<SmsMessage> {
    // Find user by phone number
    const userId = await this.findUserByPhoneNumber(webhookPayload.toNumber);

    if (!userId) {
      logger.warn(`Received SMS from unknown number: ${webhookPayload.fromNumber}`);
      throw new NotFoundError('User not found for phone number');
    }

    const providerId = webhookPayload.messageId;

    // Create message record
    const message = await this.createMessageRecord({
      userId,
      fromNumber: webhookPayload.fromNumber,
      toNumber: webhookPayload.toNumber,
      body: webhookPayload.body,
      priority: MessagePriority.NORMAL,
      direction: MessageDirection.INBOUND,
      ...(providerId && { providerId }),
      providerName: webhookPayload.providerName,
      status: MessageStatus.DELIVERED,
    });

    logger.info(`Received SMS from ${webhookPayload.fromNumber} for user ${userId}`);

    return message;
  }

  // ==========================================================================
  // Message CRUD
  // ==========================================================================

  /**
   * Create a message record
   */
  private async createMessageRecord(data: {
    userId: string;
    fromNumber: string;
    toNumber: string;
    body: string;
    priority: MessagePriority;
    direction?: MessageDirection;
    providerId?: string;
    providerName?: string;
    status?: MessageStatus;
  }): Promise<SmsMessage> {
    const direction = data.direction || MessageDirection.OUTBOUND;
    const status = data.status || MessageStatus.PENDING;

    const query = `
      INSERT INTO sms_messages
        (user_id, direction, from_number, to_number, body, status, priority,
         provider_id, provider_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.userId,
      direction,
      data.fromNumber,
      data.toNumber,
      data.body,
      status,
      data.priority,
      data.providerId || null,
      data.providerName || null,
    ]);

    return this.mapRowToMessage(result.rows[0]);
  }

  /**
   * Get message by ID
   */
  async getMessageById(id: string): Promise<SmsMessage> {
    const query = `
      SELECT * FROM sms_messages
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('SMS message');
    }

    return this.mapRowToMessage(result.rows[0]);
  }

  /**
   * Update message status
   */
  private async updateMessageStatus(
    id: string,
    updates: {
      status?: MessageStatus;
      providerId?: string;
      providerName?: string;
      errorCode?: string;
      errorMessage?: string;
      sentAt?: Date;
      deliveredAt?: Date;
    }
  ): Promise<void> {
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.status) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.providerId) {
      updateFields.push(`provider_id = $${paramIndex++}`);
      values.push(updates.providerId);
    }
    if (updates.providerName) {
      updateFields.push(`provider_name = $${paramIndex++}`);
      values.push(updates.providerName);
    }
    if (updates.errorCode) {
      updateFields.push(`error_code = $${paramIndex++}`);
      values.push(updates.errorCode);
    }
    if (updates.errorMessage) {
      updateFields.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }
    if (updates.sentAt) {
      updateFields.push(`sent_at = $${paramIndex++}`);
      values.push(updates.sentAt);
    }
    if (updates.deliveredAt) {
      updateFields.push(`delivered_at = $${paramIndex++}`);
      values.push(updates.deliveredAt);
    }

    if (updateFields.length === 0) return;

    values.push(id);

    const query = `
      UPDATE sms_messages
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
    `;

    await this.db.query(query, values);
  }

  /**
   * Search messages
   */
  async searchMessages(query: SmsSearchQuery): Promise<SmsMessage[]> {
    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [query.userId];
    let paramIndex = 2;

    if (query.direction) {
      conditions.push(`direction = $${paramIndex++}`);
      values.push(query.direction);
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(query.status);
    }

    if (query.fromDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(query.fromDate);
    }

    if (query.toDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(query.toDate);
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const sql = `
      SELECT * FROM sms_messages
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    values.push(limit, offset);

    const result = await this.db.query(sql, values);
    return result.rows.map((row) => this.mapRowToMessage(row));
  }

  /**
   * Get message statistics
   */
  async getMessageStats(userId: string): Promise<SmsStats> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE direction = 'outbound') as total_sent,
        COUNT(*) FILTER (WHERE direction = 'inbound') as total_received,
        COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
        AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at)) * 1000)
          FILTER (WHERE delivered_at IS NOT NULL AND sent_at IS NOT NULL)
          as avg_delivery_time_ms
      FROM sms_messages
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    const row = result.rows[0];

    const byStatus: Record<MessageStatus, number> = {
      [MessageStatus.PENDING]: 0,
      [MessageStatus.QUEUED]: 0,
      [MessageStatus.SENT]: 0,
      [MessageStatus.DELIVERED]: 0,
      [MessageStatus.FAILED]: 0,
      [MessageStatus.UNDELIVERED]: 0,
    };

    const byPriority: Record<MessagePriority, number> = {
      [MessagePriority.LOW]: 0,
      [MessagePriority.NORMAL]: 0,
      [MessagePriority.HIGH]: 0,
      [MessagePriority.URGENT]: 0,
    };

    const averageDeliveryTimeMs = row.avg_delivery_time_ms
      ? parseFloat(row.avg_delivery_time_ms)
      : undefined;

    return {
      userId,
      totalSent: parseInt(row.total_sent) || 0,
      totalReceived: parseInt(row.total_received) || 0,
      totalDelivered: parseInt(row.total_delivered) || 0,
      totalFailed: parseInt(row.total_failed) || 0,
      byStatus,
      byPriority,
      ...(averageDeliveryTimeMs !== undefined && { averageDeliveryTimeMs }),
    };
  }

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  /**
   * Get rate limit status for user
   */
  private async getRateLimitStatus(userId: string): Promise<SmsRateLimitStatus> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const query = `
      SELECT
        COUNT(*) FILTER (WHERE created_at >= $2) as sent_last_minute,
        COUNT(*) FILTER (WHERE created_at >= $3) as sent_last_hour,
        COUNT(*) FILTER (WHERE created_at >= $4) as sent_last_day
      FROM sms_messages
      WHERE user_id = $1 AND direction = 'outbound'
    `;

    const result = await this.db.query(query, [
      userId,
      oneMinuteAgo,
      oneHourAgo,
      oneDayAgo,
    ]);

    const row = result.rows[0];

    const status: SmsRateLimitStatus = {
      userId,
      sentLastMinute: parseInt(row.sent_last_minute) || 0,
      sentLastHour: parseInt(row.sent_last_hour) || 0,
      sentLastDay: parseInt(row.sent_last_day) || 0,
      lastResetMinute: oneMinuteAgo,
      lastResetHour: oneHourAgo,
      lastResetDay: oneDayAgo,
      isLimited: false,
    };

    status.isLimited = isRateLimitExceeded(status, this.rateLimitConfig);

    if (status.isLimited) {
      status.nextAvailableAt = getNextAvailableTime(status, this.rateLimitConfig);
    }

    return status;
  }

  /**
   * Increment rate limit counter (already tracked by message creation)
   */
  private async incrementRateLimit(_userId: string): Promise<void> {
    // Rate limiting is tracked by counting messages in time windows
    // No separate increment needed
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get user's phone number
   */
  private async getUserPhoneNumber(userId: string): Promise<string> {
    const query = `
      SELECT phone_number FROM users
      WHERE id = $1 AND active = true
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return result.rows[0].phone_number;
  }

  /**
   * Find user by phone number
   */
  private async findUserByPhoneNumber(phoneNumber: string): Promise<string | null> {
    const query = `
      SELECT id FROM users
      WHERE phone_number = $1 AND active = true
    `;

    const result = await this.db.query(query, [phoneNumber]);

    return result.rows.length > 0 ? result.rows[0].id : null;
  }

  /**
   * Map database row to SmsMessage
   */
  private mapRowToMessage(row: Record<string, unknown>): SmsMessage {
    const sentAt = row.sent_at ? (row.sent_at as Date) : undefined;
    const deliveredAt = row.delivered_at ? (row.delivered_at as Date) : undefined;
    const providerId = row.provider_id ? (row.provider_id as string) : undefined;
    const providerName = row.provider_name ? (row.provider_name as string) : undefined;
    const errorCode = row.error_code ? (row.error_code as string) : undefined;
    const errorMessage = row.error_message ? (row.error_message as string) : undefined;

    return {
      id: row.id as string,
      userId: row.user_id as string,
      direction: row.direction as MessageDirection,
      fromNumber: row.from_number as string,
      toNumber: row.to_number as string,
      body: row.body as string,
      status: row.status as MessageStatus,
      priority: row.priority as MessagePriority,
      ...(providerId && { providerId }),
      ...(providerName && { providerName }),
      ...(errorCode && { errorCode }),
      ...(errorMessage && { errorMessage }),
      ...(sentAt && { sentAt }),
      ...(deliveredAt && { deliveredAt }),
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  /**
   * Set custom rate limit configuration
   */
  setRateLimitConfig(config: Partial<SmsRateLimitConfig>): void {
    this.rateLimitConfig = {
      ...this.rateLimitConfig,
      ...config,
    };
  }

  /**
   * Get current rate limit configuration
   */
  getRateLimitConfig(): SmsRateLimitConfig {
    return { ...this.rateLimitConfig };
  }
}
