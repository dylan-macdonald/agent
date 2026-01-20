import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Pool } from "pg";
import { SmsService } from "../../src/services/sms.js";
import { SmsQueueService } from "../../src/services/sms-queue.js";
import {
  ISmsProvider,
  MessagePriority,
  MessageStatus,
  MessageDirection,
} from "../../src/types/sms.js";
import { ValidationError, NotFoundError } from "../../src/types/index.js";

// Mock dependencies
vi.mock("../../src/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("SmsService", () => {
  let service: SmsService;
  let mockDb: Pool;
  let mockProvider: ISmsProvider;
  let mockQueue: SmsQueueService;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
    } as unknown as Pool;

    mockProvider = {
      name: "TestProvider",
      capabilities: {
        maxMessageLength: 160,
        supportsDeliveryReceipts: true,
      },
      sendMessage: vi.fn(),
      validateWebhook: vi.fn().mockReturnValue(true),
      parseWebhook: vi.fn().mockReturnValue({
        fromNumber: "+1234567890",
        toNumber: "+1098765432",
        body: "Hello",
        providerName: "TestProvider",
      }),
    } as unknown as ISmsProvider;

    mockQueue = {
      addMessage: vi.fn(),
    } as unknown as SmsQueueService;

    service = new SmsService(mockDb, mockProvider, mockQueue);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should queue message when queue is available", async () => {
      const input = {
        userId: "user-123",
        toNumber: "+1234567890",
        body: "Test message",
      };

      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({
          rows: [
            {
              sent_last_minute: 0,
              sent_last_hour: 0,
              sent_last_day: 0,
            },
          ],
        } as never) // rate limit check
        .mockResolvedValueOnce({
          rows: [{ phone_number: "+1098765432" }],
        } as never) // getUserPhoneNumber
        .mockResolvedValueOnce({
          rows: [{ id: "msg-123", ...input, status: "queued" }],
        } as never) // createMessageRecord
        .mockResolvedValueOnce({
          rows: [{ id: "msg-123", ...input, status: "queued" }],
        } as never); // getMessageById

      const result = await service.sendMessage(input);

      expect(mockQueue.addMessage).toHaveBeenCalledWith({
        ...input,
        messageId: "msg-123",
      });
      expect(result.status).toBe(MessageStatus.QUEUED);
      expect(mockProvider.sendMessage).not.toHaveBeenCalled(); // Should be handled by worker
    });

    it("should send synchronously when queue is not available", async () => {
      const syncService = new SmsService(mockDb, mockProvider);
      const input = {
        userId: "user-123",
        toNumber: "+1234567890",
        body: "Test message",
      };

      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({
          rows: [
            {
              sent_last_minute: 0,
              sent_last_hour: 0,
              sent_last_day: 0,
            },
          ],
        } as never) // rate limit check
        .mockResolvedValueOnce({
          rows: [{ phone_number: "+1098765432" }],
        } as never) // getUserPhoneNumber
        .mockResolvedValueOnce({ rows: [{ id: "msg-123" }] } as never) // createMessageRecord
        .mockResolvedValueOnce({ rows: [] } as never) // updateMessageStatus
        .mockResolvedValueOnce({
          rows: [{ id: "msg-123", status: "sent" }],
        } as never); // getMessageById

      (mockProvider.sendMessage as any).mockResolvedValue({
        providerId: "tw-123",
      });

      const result = await syncService.sendMessage(input);

      expect(mockProvider.sendMessage).toHaveBeenCalled();
      expect(result.status).toBe(MessageStatus.SENT);
    });

    it("should validate phone number", async () => {
      await expect(
        service.sendMessage({
          userId: "user-123",
          toNumber: "invalid",
          body: "Test",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should enforce rate limits", async () => {
      vi.spyOn(mockDb, "query").mockResolvedValueOnce({
        rows: [
          {
            sent_last_minute: 10, // Over limit
            sent_last_hour: 0,
            sent_last_day: 0,
          },
        ],
      } as never);

      await expect(
        service.sendMessage({
          userId: "user-123",
          toNumber: "+1234567890",
          body: "Test",
        })
      ).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe("processIncomingMessage", () => {
    it("should process valid webhook", async () => {
      const payload = { From: "+1234567890", To: "+1098765432", Body: "Hello" };

      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({ rows: [{ id: "user-123" }] } as never) // findUserByPhoneNumber
        .mockResolvedValueOnce({ rows: [{ id: "msg-incoming-123" }] } as never); // createMessageRecord

      const result = await service.processIncomingMessage(
        payload,
        "sig",
        "url"
      );

      expect(mockProvider.validateWebhook).toHaveBeenCalledWith(
        payload,
        "sig",
        "url"
      );
      expect(result).toBeDefined();
    });

    it("should throw on invalid signature", async () => {
      (mockProvider.validateWebhook as any).mockReturnValue(false);

      await expect(
        service.processIncomingMessage({}, "wrong-sig", "url")
      ).rejects.toThrow(ValidationError);
    });
  });
});
