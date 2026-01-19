/**
 * AI Personal Assistant - Main Entry Point
 *
 * A comprehensive AI-powered personal assistant that acts as a proactive
 * digital companion for scheduling, reminders, health tracking, goal
 * management, and daily task support.
 */

import { getConfig } from "@/config/index.js";
import { logger } from "@/utils/logger.js";

async function main(): Promise<void> {
  logger.info("Starting AI Personal Assistant...");

  try {
    const config = getConfig();
    logger.info("Configuration loaded", {
      environment: config.environment,
      port: config.port,
    });

    // Placeholder for async initialization that will be added
    await Promise.resolve();

    // TODO: Initialize database connection
    // TODO: Initialize Redis connection
    // TODO: Initialize API server
    // TODO: Initialize scheduler service
    // TODO: Initialize SMS integration

    logger.info(
      `AI Personal Assistant running on ${config.host}:${config.port}`
    );

    // Keep process running
    process.on("SIGINT", () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start application", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
