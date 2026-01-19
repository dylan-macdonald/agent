/**
 * Twilio SMS Provider
 *
 * Implements ISmsProvider for Twilio SMS service
 */

import {
  ISmsProvider,
  SmsProviderCapabilities,
  SendSmsInput,
  SmsMessage,
  MessageStatus,
  SmsWebhookPayload,
  MessageDirection,
  MessagePriority,
  SmsProviderConfig,
  formatPhoneNumber,
} from '../types/sms.js';
import { logger } from '../utils/logger.js';

/**
 * Twilio API response types
 */
interface TwilioMessageResponse {
  sid: string;
  status: string;
  from: string;
  to: string;
  body: string;
  date_created: string;
  date_sent?: string;
  date_updated?: string;
  error_code?: string;
  error_message?: string;
}

export class TwilioSmsProvider implements ISmsProvider {
  readonly name = 'Twilio';
  readonly capabilities: SmsProviderCapabilities = {
    supportsDeliveryReceipts: true,
    supportsMediaMessages: true,
    maxMessageLength: 1600, // Twilio concatenates up to 10 SMS segments
    supportsBulkSending: true,
    supportsScheduling: true,
  };

  private config: SmsProviderConfig;
  private apiBaseUrl = 'https://api.twilio.com/2010-04-01';

  constructor(config: SmsProviderConfig) {
    this.config = config;

    if (config.apiEndpoint) {
      this.apiBaseUrl = config.apiEndpoint;
    }
  }

  /**
   * Send an SMS message via Twilio
   */
  async sendMessage(input: SendSmsInput): Promise<SmsMessage> {
    const url = `${this.apiBaseUrl}/Accounts/${this.config.accountId}/Messages.json`;

    const body = new URLSearchParams({
      From: formatPhoneNumber(this.config.fromNumber),
      To: formatPhoneNumber(input.toNumber),
      Body: input.body,
    });

    // Add status callback URL if configured
    if (this.config.webhookUrl) {
      body.append('StatusCallback', this.config.webhookUrl);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(`Twilio API error: ${error.message || response.statusText}`);
      }

      const twilioMessage = (await response.json()) as TwilioMessageResponse;

      return this.mapTwilioMessage(twilioMessage, input.userId);
    } catch (error) {
      logger.error(`Failed to send SMS via Twilio: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get message status from Twilio
   */
  async getMessageStatus(providerId: string): Promise<MessageStatus> {
    const url = `${this.apiBaseUrl}/Accounts/${this.config.accountId}/Messages/${providerId}.json`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.statusText}`);
      }

      const twilioMessage = (await response.json()) as TwilioMessageResponse;

      return this.mapTwilioStatus(twilioMessage.status);
    } catch (error) {
      logger.error(`Failed to get message status from Twilio: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Parse webhook payload from Twilio
   */
  parseWebhook(payload: Record<string, unknown>): SmsWebhookPayload {
    return {
      messageId: payload.MessageSid as string,
      fromNumber: formatPhoneNumber(payload.From as string),
      toNumber: formatPhoneNumber(payload.To as string),
      body: (payload.Body as string) || '',
      timestamp: new Date(),
      providerName: this.name,
      providerData: payload,
    };
  }

  /**
   * Validate webhook signature from Twilio
   */
  validateWebhook(_payload: Record<string, unknown>, signature: string): boolean {
    // Twilio uses HMAC-SHA1 signature validation
    // This is a simplified implementation - in production, use Twilio's SDK
    // or implement proper HMAC validation

    // For now, just check that signature is present
    // TODO: Implement proper Twilio signature validation
    return signature !== undefined && signature.length > 0;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): SmsProviderCapabilities {
    return { ...this.capabilities };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Generate Basic Auth header for Twilio API
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.config.accountId}:${this.config.authToken}`
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Map Twilio message response to SmsMessage
   */
  private mapTwilioMessage(
    twilioMessage: TwilioMessageResponse,
    userId: string
  ): SmsMessage {
    const sentAt = twilioMessage.date_sent
      ? new Date(twilioMessage.date_sent)
      : undefined;

    const errorCode = twilioMessage.error_code
      ? twilioMessage.error_code.toString()
      : undefined;
    const errorMessage = twilioMessage.error_message;

    return {
      id: '', // Will be generated by database
      userId,
      direction: MessageDirection.OUTBOUND,
      fromNumber: formatPhoneNumber(twilioMessage.from),
      toNumber: formatPhoneNumber(twilioMessage.to),
      body: twilioMessage.body,
      status: this.mapTwilioStatus(twilioMessage.status),
      priority: MessagePriority.NORMAL,
      providerId: twilioMessage.sid,
      providerName: this.name,
      ...(errorCode && { errorCode }),
      ...(errorMessage && { errorMessage }),
      ...(sentAt && { sentAt }),
      createdAt: new Date(twilioMessage.date_created),
      updatedAt: new Date(twilioMessage.date_updated || twilioMessage.date_created),
    };
  }

  /**
   * Map Twilio status to MessageStatus
   */
  private mapTwilioStatus(twilioStatus: string): MessageStatus {
    const statusMap: Record<string, MessageStatus> = {
      queued: MessageStatus.QUEUED,
      sending: MessageStatus.SENT,
      sent: MessageStatus.SENT,
      delivered: MessageStatus.DELIVERED,
      undelivered: MessageStatus.UNDELIVERED,
      failed: MessageStatus.FAILED,
    };

    return statusMap[twilioStatus.toLowerCase()] || MessageStatus.PENDING;
  }
}
