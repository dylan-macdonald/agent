/**
 * SMS Message Queue Service
 *
 * Handles background processing of SMS messages using BullMQ and Redis
 */

import type { Job } from "bullmq";
import { Queue, Worker } from "bullmq";
import type { Pool } from "pg";

import {
  ISmsProvider,
  SendSmsInput,
  MessageStatus,
  MessagePriority,
} from "../types/sms.js";
import { logger } from "../utils/logger.js";

export class SmsQueueService {
  private queue: Queue;
  private worker: Worker | null = null;

  constructor(
    _redisUrl: string,
    private db: Pool,
    private provider: ISmsProvider
  ) {
    const connection = {
      maxRetriesPerRequest: null,
    };

    this.queue = new Queue("sms-messages", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
      },
    });

    logger.info("SMS Message Queue initialized");
  }

  /**
   * Add a message to queue
   */
  async addMessage(input: SendSmsInput & { messageId: string }): Promise<void> {
    const priority = this.mapPriorityToBull(
      input.priority ?? MessagePriority.NORMAL
    );

    await this.queue.add("send-sms", input, {
      priority,
      jobId: input.messageId,
    });

    logger.debug(`Message ${input.messageId} added to queue`, {
      toNumber: input.toNumber,
      priority: input.priority,
    });
  }

  /**
   * Start worker to process messages
   */
  startWorker(): void {
    if (this.worker) {
      return;
    }

    const connection = {
      maxRetriesPerRequest: null,
    };

    this.worker = new Worker(
      "sms-messages",
      async (job: Job<SendSmsInput & { messageId: string }>) => {
        const { messageId, toNumber, body, priority, userId } = job.data;

        logger.info(`Processing SMS job ${job.id}`, { messageId, toNumber });

        try {
          const sendInput: SendSmsInput = {
            userId,
            toNumber,
            body,
          };

          if (priority !== undefined) {
            sendInput.priority = priority;
          }

          const sent = await this.provider.sendMessage(sendInput);

          const updateData = {
            status: MessageStatus.SENT,
            providerId: sent.providerId ?? "",
            providerName: this.provider.name,
            sentAt: new Date(),
          };

          await this.updateMessageStatus(messageId, updateData);

          logger.info(`Successfully processed SMS job ${job.id}`);
        } catch (error) {
          logger.error(`Failed to process SMS job ${job.id}`, {
            error: (error as Error).message,
            messageId,
          });

          await this.updateMessageStatus(messageId, {
            status: MessageStatus.FAILED,
            errorMessage: (error as Error).message,
          });

          throw error;
        }
      },
      {
        connection,
        concurrency: 5,
      }
    );

    this.worker.on("failed", (job, error) => {
      if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
        const { messageId } = job.data as SendSmsInput & { messageId: string };
        logger.error(`SMS job ${job.id} failed after maximum attempts`, {
          error: error.message,
          messageId,
        });

        // Mark as failed in database
        // Note: we're using fire-and-forget here because event handlers should be synchronous or handle their own promises
        this.updateMessageStatus(messageId, {
          status: MessageStatus.FAILED,
          errorMessage: error.message,
        }).catch((err) => {
          logger.error("Failed to update message status after job failure", {
            error: err.message,
            messageId,
          });
        });
      }
    });

    logger.info("SMS Worker started");
  }

  /**
   * Stop queue and worker
   */
  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.queue.close();
    logger.info("SMS Message Queue shut down");
  }

  /**
   * Map application priority to BullMQ priority (lower is higher)
   */
  private mapPriorityToBull(priority: MessagePriority): number {
    switch (priority) {
      case MessagePriority.URGENT:
        return 1;
      case MessagePriority.HIGH:
        return 5;
      case MessagePriority.NORMAL:
        return 10;
      case MessagePriority.LOW:
        return 20;
      default:
        return 10;
    }
  }

  /**
   * Update message status in database
   */
  private async updateMessageStatus(
    id: string,
    updates: {
      status: MessageStatus;
      providerId?: string;
      providerName?: string;
      errorMessage?: string;
      sentAt?: Date;
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
    if (updates.errorMessage) {
      updateFields.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }
    if (updates.sentAt) {
      updateFields.push(`sent_at = $${paramIndex++}`);
      values.push(updates.sentAt);
    }

    if (updateFields.length === 0) {
      return;
    }

    values.push(id);

    const query = `
      UPDATE sms_messages
      SET ${updateFields.join(", ")}, updated_at = NOW()
      WHERE id = $${paramIndex}
    `;

    await this.db.query(query, values);
  }
}
