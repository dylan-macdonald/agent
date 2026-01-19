/**
 * PostgreSQL Database Connection Module
 * Manages database connection pool with proper error handling
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

import { getConfig } from "@/config/index.js";
import { logger } from "@/utils/logger.js";

let pool: Pool | null = null;

export interface DatabaseConfig {
  connectionString: string;
  maxConnections: number;
  ssl: boolean;
}

/**
 * Initialize the database connection pool
 */
export function initializePool(config?: DatabaseConfig): Pool {
  if (pool) {
    return pool;
  }

  const appConfig = config ?? {
    connectionString: getConfig().database.url,
    maxConnections: getConfig().database.maxConnections,
    ssl: getConfig().database.ssl,
  };

  pool = new Pool({
    connectionString: appConfig.connectionString,
    max: appConfig.maxConnections,
    ssl: appConfig.ssl ? { rejectUnauthorized: false } : undefined,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    logger.error("Unexpected database pool error", {
      error: err.message,
    });
  });

  pool.on("connect", () => {
    logger.info("New database connection established");
  });

  return pool;
}

/**
 * Get the current pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    return initializePool();
  }
  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const currentPool = getPool();
  const start = Date.now();

  try {
    const result = await currentPool.query<T>(text, params);
    const duration = Date.now() - start;

    logger.info("Query executed", {
      query: text.substring(0, 100),
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    logger.error("Query failed", {
      query: text.substring(0, 100),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transaction support
 */
export async function getClient(): Promise<PoolClient> {
  const currentPool = getPool();
  const client = await currentPool.connect();
  return client;
}

/**
 * Execute operations within a transaction
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connection health
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query<{ now: Date }>("SELECT NOW() as now");
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Close all connections in the pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("Database pool closed");
  }
}

export default {
  initializePool,
  getPool,
  query,
  getClient,
  withTransaction,
  healthCheck,
  closePool,
};
