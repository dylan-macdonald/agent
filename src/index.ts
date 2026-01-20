/**
 * AI Personal Assistant - Main Entry Point
 *
 * A comprehensive AI-powered personal assistant that acts as a proactive
 * digital companion for scheduling, reminders, health tracking, goal
 * management, and daily task support.
 */

import { getConfig } from "@/config/index.js";
import { logger } from "@/utils/logger.js";

import { App } from "./app.js";

async function main(): Promise<void> {
  logger.info("Starting AI Personal Assistant...");

  try {
    const config = getConfig();
    logger.info("Configuration loaded", {
      environment: config.environment,
      port: config.port,
    });

    const app = new App(config);
    await app.start();

    // Keep process running
    const shutdown = (): void => {
      logger.info("Received signal, shutting down gracefully...");
      void app.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error("Failed to start application", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
