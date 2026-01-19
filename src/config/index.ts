/**
 * Application configuration module
 * Loads and validates environment variables
 */

import type { AppConfig } from "@/types/index.js";

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvVarAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

function getEnvVarAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === "true";
}

export function loadConfig(): AppConfig {
  const environment = getEnvVar("NODE_ENV", "development") as
    | "development"
    | "test"
    | "production";

  return {
    environment,
    port: getEnvVarAsNumber("PORT", 3000),
    host: getEnvVar("HOST", "localhost"),
    logLevel: getEnvVar("LOG_LEVEL", "info") as
      | "debug"
      | "info"
      | "warn"
      | "error",
    database: {
      url: getEnvVar(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/ai_assistant"
      ),
      maxConnections: getEnvVarAsNumber("DB_MAX_CONNECTIONS", 10),
      ssl: getEnvVarAsBoolean("DB_SSL", environment === "production"),
    },
    redis: {
      url: getEnvVar("REDIS_URL", "redis://localhost:6379"),
    },
    security: {
      jwtSecret: getEnvVar("JWT_SECRET", "development-secret-change-in-prod"),
      jwtExpiresIn: getEnvVar("JWT_EXPIRES_IN", "7d"),
      encryptionKey: getEnvVar(
        "ENCRYPTION_KEY",
        "development-key-change-in-production"
      ),
    },
  };
}

// Validate critical security settings in production
export function validateProductionConfig(config: AppConfig): void {
  if (config.environment !== "production") {
    return;
  }

  const errors: string[] = [];

  if (config.security.jwtSecret.includes("development")) {
    errors.push("JWT_SECRET must be set to a secure value in production");
  }

  if (config.security.encryptionKey.includes("development")) {
    errors.push("ENCRYPTION_KEY must be set to a secure value in production");
  }

  if (config.security.encryptionKey.length < 32) {
    errors.push("ENCRYPTION_KEY must be at least 32 characters for AES-256");
  }

  if (errors.length > 0) {
    throw new Error(`Production configuration errors:\n${errors.join("\n")}`);
  }
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
    validateProductionConfig(cachedConfig);
  }
  return cachedConfig;
}

export default getConfig;
