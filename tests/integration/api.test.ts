import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { App } from "../../src/app.js";
import { AppConfig } from "../../src/types/index.js";
import { Pool } from "pg";
import Redis from "ioredis";

// Mock dependencies
vi.mock("pg", () => {
  const mPool = {
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  };
  return { Pool: vi.fn(() => mPool) };
});

vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      disconnect: vi.fn(),
      status: "ready",
    })),
    Redis: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      disconnect: vi.fn(),
      status: "ready",
    })),
  };
});

// Mock BullMQ
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    close: vi.fn(),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

describe("API Integration", () => {
  let app: App;
  let config: AppConfig;

  beforeEach(() => {
    config = {
      environment: "test",
      port: 3001,
      host: "localhost",
      logLevel: "error",
      database: {
        url: "postgres://localhost:5432/test",
        maxConnections: 10,
        ssl: false,
      },
      redis: {
        url: "redis://localhost:6379",
      },
      security: {
        jwtSecret: "test-secret",
        jwtExpiresIn: "1h",
        encryptionKey: "01234567890123456789012345678901", // 32 chars
      },
    };

    app = new App(config);
  });

  afterEach(async () => {
    await app.shutdown();
    vi.clearAllMocks();
  });

  it("should return 200 for health check", async () => {
    const response = await request(app.express).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  describe("SMS Webhook", () => {
    it("should return 200 for valid webhook", async () => {
      // Mock user finding and message creation
      const mockPool = new Pool();
      vi.spyOn(mockPool, "query").mockResolvedValue({
        rows: [{ id: "user-123" }], // for findUserByPhoneNumber and createMessageRecord
      } as never);

      const response = await request(app.express)
        .post("/api/sms/webhook")
        .send({
          MessageSid: "SM123",
          From: "+1234567890",
          To: "+1098765432",
          Body: "Hello Assistant",
        });

      // Since we didn't provide a signature, it might fail validation if signature check is enabled
      // In the route, we use: signature || undefined
      // In SmsService, we only validate if signature is provided.

      expect(response.status).toBe(200);
      expect(response.text).toContain("<Response></Response>");
    });

    it("should return 403 for invalid signature", async () => {
      // Mock provider validation to fail
      // This is a bit tricky since the provider is buried in the app
      // But we can mock the twilio validateRequest

      const twilio = await import("twilio");
      vi.spyOn(twilio.default, "validateRequest").mockReturnValue(false);

      const response = await request(app.express)
        .post("/api/sms/webhook")
        .set("x-twilio-signature", "invalid-sig")
        .send({
          MessageSid: "SM123",
          From: "+1234567890",
          To: "+1098765432",
          Body: "Hello",
        });

      expect(response.status).toBe(403);
    });
  });
});
