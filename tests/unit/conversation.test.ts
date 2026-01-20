import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConversationService } from "../../src/services/conversation.js";
import Redis from "ioredis";
import { ConversationStatus } from "../../src/types/conversation.js";

describe("ConversationService", () => {
  let service: ConversationService;
  let mockRedis: Redis;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
    } as unknown as Redis;

    service = new ConversationService(mockRedis);
  });

  it("should create new state if none exists", async () => {
    vi.spyOn(mockRedis, "get").mockResolvedValue(null);

    const state = await service.getOrCreateState("user-123");

    expect(state.userId).toBe("user-123");
    expect(state.status).toBe(ConversationStatus.ACTIVE);
    expect(mockRedis.setex).toHaveBeenCalled();
  });

  it("should retrieve existing state", async () => {
    const existingState = {
      userId: "user-123",
      threadId: "t123",
      lastMessageAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      status: ConversationStatus.WAITING_FOR_INPUT,
    };

    vi.spyOn(mockRedis, "get").mockResolvedValue(JSON.stringify(existingState));

    const state = await service.getOrCreateState("user-123");

    expect(state.threadId).toBe("t123");
    expect(state.status).toBe(ConversationStatus.WAITING_FOR_INPUT);
  });

  it("should update state", async () => {
    const state = {
      userId: "user-123",
      threadId: "t123",
      status: ConversationStatus.ACTIVE,
    } as any;

    await service.updateState(state);

    expect(mockRedis.setex).toHaveBeenCalledWith(
      expect.stringContaining("user-123"),
      expect.any(Number),
      expect.any(String)
    );
  });

  it("should clear state", async () => {
    await service.clearState("user-123");
    expect(mockRedis.del).toHaveBeenCalledWith(
      expect.stringContaining("user-123")
    );
  });

  it("should generate a thread ID", () => {
    // @ts-ignore - testing private method
    const id1 = service.generateThreadId();
    // @ts-ignore
    const id2 = service.generateThreadId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(5);
  });

  it("should add a turn", async () => {
    const turn = {
      userId: "user-123",
      threadId: "t123",
      direction: "inbound" as const,
      text: "hello",
      entities: [],
    };

    await service.addTurn(turn);
    // addTurn currently just logs, but we verify it doesn't throw
    expect(true).toBe(true);
  });

  it("should handle session expiration", async () => {
    vi.spyOn(mockRedis, "get").mockResolvedValue(null);
    const state = await service.getOrCreateState("user-123");
    expect(state.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("should set correct cache key", () => {
    // @ts-ignore
    const key = service.getCacheKey("u1");
    expect(key).toBe("conversation:u1");
  });
});
