/**
 * Conversation State Types
 *
 * Defines the structure for tracking multi-turn conversations
 */

import { Intent, Entity } from "./processor.js";

export interface ConversationState {
  userId: string;
  threadId: string;
  activeIntent?: Intent;
  lastIntent?: Intent;
  collectedEntities: Entity[];
  missingEntities: string[];
  context: Record<string, unknown>;
  turnCount: number;
  lastMessageAt: Date;
  expiresAt: Date;
  status: ConversationStatus;
  pendingToolApproval?: {
    toolName: string;
    args: any;
  };
}

export enum ConversationStatus {
  ACTIVE = "active",
  WAITING_FOR_INPUT = "waiting_for_input",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  FAILED = "failed",
}

export interface ConversationTurn {
  id: string;
  userId: string;
  threadId: string;
  direction: "inbound" | "outbound";
  text: string;
  intent?: Intent;
  entities: Entity[];
  timestamp: Date;
}
