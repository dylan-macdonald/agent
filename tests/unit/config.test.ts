import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Configuration Module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load default configuration in development", async () => {
    process.env["NODE_ENV"] = "development";
    const { loadConfig } = await import("@/config/index.js");

    const config = loadConfig();

    expect(config.environment).toBe("development");
    expect(config.port).toBe(3000);
    expect(config.host).toBe("localhost");
    expect(config.logLevel).toBe("info");
  });

  it("should use custom port from environment", async () => {
    process.env["NODE_ENV"] = "development";
    process.env["PORT"] = "4000";
    const { loadConfig } = await import("@/config/index.js");

    const config = loadConfig();

    expect(config.port).toBe(4000);
  });

  it("should validate production configuration", async () => {
    process.env["NODE_ENV"] = "production";
    process.env["JWT_SECRET"] = "production-secure-secret-key-here";
    process.env["ENCRYPTION_KEY"] =
      "a".repeat(32) + "production-encryption-key";

    const { loadConfig, validateProductionConfig } = await import(
      "@/config/index.js"
    );

    const config = loadConfig();

    expect(() => validateProductionConfig(config)).not.toThrow();
  });

  it("should reject insecure production configuration", async () => {
    process.env["NODE_ENV"] = "production";
    // Using default development values should fail

    const { loadConfig, validateProductionConfig } = await import(
      "@/config/index.js"
    );

    const config = loadConfig();

    expect(() => validateProductionConfig(config)).toThrow(
      /Production configuration errors/
    );
  });
});

describe("Type Safety", () => {
  it("should export correct types", async () => {
    const types = await import("@/types/index.js");

    expect(types.PreferenceCategory).toBeDefined();
    expect(types.MemoryType).toBeDefined();
    expect(types.ReminderStatus).toBeDefined();
    expect(types.GoalStatus).toBeDefined();
    expect(types.AppError).toBeDefined();
    expect(types.ValidationError).toBeDefined();
  });

  it("should create AppError correctly", async () => {
    const { AppError } = await import("@/types/index.js");

    const error = new AppError("Test error", "TEST_CODE", 400);

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.statusCode).toBe(400);
  });
});
