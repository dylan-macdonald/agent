/**
 * Conversation Service
 *
 * Manages active conversation state and multi-turn tracking
 */

import { Redis } from "ioredis";

import {
  ConversationState,
  ConversationStatus,
  ConversationTurn,
} from "../types/conversation.js";
import { logger } from "../utils/logger.js";

export class ConversationService {
  private readonly CACHE_PREFIX = "conversation:";
  private readonly DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

  constructor(private redis: Redis) {}

  /**
   * Get or create conversation state for a user
   */
  public async getOrCreateState(userId: string): Promise<ConversationState> {
    const key = this.getCacheKey(userId);
    const cached = await this.redis.get(key);

    if (cached) {
      const state = JSON.parse(cached) as ConversationState;
      // Convert date strings back to Date objects
      state.lastMessageAt = new Date(state.lastMessageAt);
      state.expiresAt = new Date(state.expiresAt);
      return state;
    }

    // Create new state
    const newState: ConversationState = {
      userId,
      threadId: this.generateThreadId(),
      collectedEntities: [],
      missingEntities: [],
      context: {},
      turnCount: 0,
      lastMessageAt: new Date(),
      expiresAt: new Date(Date.now() + this.DEFAULT_TIMEOUT_MS),
      status: ConversationStatus.ACTIVE,
    };

    await this.updateState(newState);
    return newState;
  }

  /**
   * Update conversation state in Redis
   */
  public async updateState(state: ConversationState): Promise<void> {
    const key = this.getCacheKey(state.userId);
    state.lastMessageAt = new Date();
    state.expiresAt = new Date(Date.now() + this.DEFAULT_TIMEOUT_MS);

    await this.redis.setex(
      key,
      Math.floor(this.DEFAULT_TIMEOUT_MS / 1000),
      JSON.stringify(state)
    );
  }

  /**
   * Clear conversation state
   */
  public async clearState(userId: string): Promise<void> {
    const key = this.getCacheKey(userId);
    await this.redis.del(key);
    logger.debug(`Cleared conversation state for user ${userId}`);
  }

  /**
   * Add a turn to the conversation (placeholder for persistent storage)
   */
  public async addTurn(
    turn: Omit<ConversationTurn, "id" | "timestamp">
  ): Promise<void> {
    const fullTurn: ConversationTurn = {
      ...turn,
      id: this.generateThreadId(),
      timestamp: new Date(),
    };

    // For now, we just log it. In Phase 3C, we might want to save it to Postgres.
    logger.debug("Conversation turn added", {
      userId: fullTurn.userId,
      direction: fullTurn.direction,
      intent: fullTurn.intent,
    });
  }

  private getCacheKey(userId: string): string {
    return `${this.CACHE_PREFIX}${userId}`;
  }

  private generateThreadId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
