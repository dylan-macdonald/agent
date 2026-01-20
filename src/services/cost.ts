/**
 * Cost tracking service
 */

import { Pool } from "pg";

import {
  CostEntry,
  ProviderType,
  CostSummary,
  ProviderCostSummary,
} from "../types/cost.js";
import { logger } from "../utils/logger.js";

export class CostService {
  constructor(private db: Pool) {}

  /**
   * Log an API cost entry
   */
  async logCost(entry: Omit<CostEntry, "id" | "createdAt">): Promise<void> {
    const query = `
      INSERT INTO api_costs (provider, model, tokens_input, tokens_output, units, cost_usd, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    try {
      await this.db.query(query, [
        entry.provider,
        entry.model || null,
        entry.tokensInput || null,
        entry.tokensOutput || null,
        entry.units || null,
        entry.costUsd,
        JSON.stringify(entry.metadata || {}),
      ]);
    } catch (error) {
      logger.error("Failed to log API cost", {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get cost summary for a time range
   */
  async getSummary(start: Date, end: Date): Promise<CostSummary> {
    const query = `
      SELECT provider, SUM(cost_usd) as total_cost, COUNT(*) as count
      FROM api_costs
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY provider
    `;

    const result = await this.db.query(query, [start, end]);

    const byProvider: ProviderCostSummary[] = result.rows.map((row) => ({
      provider: row.provider as ProviderType,
      totalCostUsd: parseFloat(row.total_cost),
      entryCount: parseInt(row.count),
    }));

    const totalCostUsd = byProvider.reduce((sum, p) => sum + p.totalCostUsd, 0);

    return {
      totalCostUsd,
      byProvider,
      timeRange: { start, end },
    };
  }

  /**
   * Get daily cost breakdown for a time range
   */
  async getDailyUsage(days: number): Promise<{ date: string; cost: number }[]> {
    const query = `
      SELECT DATE(created_at) as date, SUM(cost_usd) as total_cost
      FROM api_costs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const result = await this.db.query(query);

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      cost: parseFloat(row.total_cost) || 0,
    }));
  }
}
