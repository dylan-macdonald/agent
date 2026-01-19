/**
 * Redis Connection Module
 * Manages Redis connection for caching and message queuing
 */

import Redis, { RedisOptions } from "ioredis";

import { getConfig } from "@/config/index.js";
import { logger } from "@/utils/logger.js";

let redisClient: Redis | null = null;

/**
 * Parse Redis URL into connection options
 */
function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  const options: RedisOptions = {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) : 0,
  };
  if (parsed.password) {
    options.password = parsed.password;
  }
  return options;
}

/**
 * Initialize Redis connection
 */
export function initializeRedis(url?: string): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = url ?? getConfig().redis.url;
  const options = parseRedisUrl(redisUrl);

  redisClient = new Redis({
    ...options,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number): number | null => {
      if (times > 10) {
        logger.error("Redis connection failed after 10 retries");
        return null;
      }
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  });

  redisClient.on("connect", () => {
    logger.info("Redis connection established");
  });

  redisClient.on("error", (err) => {
    logger.error("Redis connection error", { error: err.message });
  });

  redisClient.on("close", () => {
    logger.info("Redis connection closed");
  });

  return redisClient;
}

/**
 * Get the current Redis client
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Cache operations wrapper
 */
export const cache = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  /**
   * Set a value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient();
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);

    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  },

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    const client = getRedisClient();
    await client.del(key);
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  },

  /**
   * Set TTL on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    const client = getRedisClient();
    await client.expire(key, ttlSeconds);
  },

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const client = getRedisClient();
    const values = await client.mget(...keys);
    return values.map((value) => {
      if (!value) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    });
  },

  /**
   * Increment a counter
   */
  async increment(key: string): Promise<number> {
    const client = getRedisClient();
    return await client.incr(key);
  },

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const client = getRedisClient();
    return await client.keys(pattern);
  },
};

/**
 * Redis health check
 */
export async function redisHealthCheck(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis connection closed");
  }
}

export default {
  initializeRedis,
  getRedisClient,
  cache,
  redisHealthCheck,
  closeRedis,
};
