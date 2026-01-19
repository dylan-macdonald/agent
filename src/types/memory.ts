/**
 * Memory System Types
 *
 * Defines the structure for storing and retrieving user memories
 */

export enum MemoryType {
  FACT = 'fact', // Specific factual information (e.g., "User's favorite color is blue")
  OBSERVATION = 'observation', // Behavioral observations (e.g., "User typically exercises in the morning")
  PATTERN = 'pattern', // Detected patterns (e.g., "User sleeps late on weekends")
  PREFERENCE = 'preference', // Learned preferences (e.g., "User prefers concise responses")
  CONVERSATION = 'conversation', // Conversation snippets for context
  EVENT = 'event', // Important events (e.g., "Started new job on 2024-01-15")
}

export enum MemoryImportance {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export enum MemoryStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  content: string; // Encrypted
  summary?: string; // Short, unencrypted summary for quick lookup
  importance: MemoryImportance;
  status: MemoryStatus;
  tags: string[]; // Searchable tags
  metadata: MemoryMetadata;
  source?: string; // Where this memory came from (sms, web, conversation, etc.)
  relatedMemoryIds: string[]; // IDs of related memories
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // Auto-archive after this date
  lastAccessedAt?: Date; // Track memory usage
  accessCount: number; // How many times this memory has been retrieved
}

export interface MemoryMetadata {
  // Context when memory was created
  location?: string;
  timezone?: string;

  // For facts
  fact?: {
    category: string; // e.g., "personal", "work", "health", "preferences"
    verifiedBy?: string; // How this fact was verified
    confidence: number; // 0-1 confidence score
  };

  // For observations
  observation?: {
    frequency?: string; // e.g., "always", "usually", "sometimes", "rarely"
    context?: string; // Under what conditions this was observed
    sampleSize?: number; // How many data points support this
  };

  // For patterns
  pattern?: {
    patternType: string; // e.g., "temporal", "behavioral", "preference"
    recurrence?: string; // e.g., "daily", "weekly", "monthly"
    confidence: number; // 0-1 confidence score
    dataPoints: number; // Number of observations supporting this pattern
  };

  // For preferences
  preference?: {
    strength: number; // 0-1, how strong is this preference
    category: string;
    learnedFrom?: string; // How we learned this preference
  };

  // For events
  event?: {
    eventType: string; // e.g., "milestone", "appointment", "achievement"
    duration?: string;
    participants?: string[];
  };

  // Custom metadata
  custom?: Record<string, unknown>;
}

export interface CreateMemoryInput {
  userId: string;
  type: MemoryType;
  content: string;
  summary?: string;
  importance?: MemoryImportance;
  tags?: string[];
  metadata?: MemoryMetadata;
  source?: string;
  relatedMemoryIds?: string[];
  expiresAt?: Date;
}

export interface UpdateMemoryInput {
  content?: string;
  summary?: string;
  importance?: MemoryImportance;
  status?: MemoryStatus;
  tags?: string[];
  metadata?: MemoryMetadata;
  expiresAt?: Date;
}

export interface MemorySearchQuery {
  userId: string;
  types?: MemoryType[];
  tags?: string[];
  importance?: MemoryImportance[];
  status?: MemoryStatus[];
  searchText?: string; // Full-text search in content/summary
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'importance' | 'createdAt' | 'accessCount';
  sortOrder?: 'asc' | 'desc';
}

export interface MemorySearchResult {
  memories: Memory[];
  total: number;
  hasMore: boolean;
}

/**
 * Memory relevance scoring result
 */
export interface MemoryRelevance {
  memory: Memory;
  relevanceScore: number; // 0-1 score
  reasons: string[]; // Why this memory is relevant
}

/**
 * Memory statistics for a user
 */
export interface MemoryStats {
  userId: string;
  totalMemories: number;
  byType: Record<MemoryType, number>;
  byImportance: Record<MemoryImportance, number>;
  byStatus: Record<MemoryStatus, number>;
  oldestMemory?: Date;
  newestMemory?: Date;
  mostAccessedMemory?: Memory;
}

/**
 * Memory expiration policy
 */
export interface MemoryExpirationPolicy {
  type: MemoryType;
  defaultExpirationDays: number;
  archiveInsteadOfDelete: boolean;
}

export const DEFAULT_EXPIRATION_POLICIES: MemoryExpirationPolicy[] = [
  {
    type: MemoryType.FACT,
    defaultExpirationDays: 365, // Facts valid for 1 year
    archiveInsteadOfDelete: true,
  },
  {
    type: MemoryType.OBSERVATION,
    defaultExpirationDays: 180, // Observations valid for 6 months
    archiveInsteadOfDelete: true,
  },
  {
    type: MemoryType.PATTERN,
    defaultExpirationDays: 90, // Patterns need recent data
    archiveInsteadOfDelete: true,
  },
  {
    type: MemoryType.PREFERENCE,
    defaultExpirationDays: 365, // Preferences generally stable
    archiveInsteadOfDelete: true,
  },
  {
    type: MemoryType.CONVERSATION,
    defaultExpirationDays: 30, // Conversations expire quickly
    archiveInsteadOfDelete: false,
  },
  {
    type: MemoryType.EVENT,
    defaultExpirationDays: 365, // Events kept for historical reference
    archiveInsteadOfDelete: true,
  },
];

/**
 * Helper to get expiration policy for a memory type
 */
export function getExpirationPolicy(
  type: MemoryType
): MemoryExpirationPolicy {
  return (
    DEFAULT_EXPIRATION_POLICIES.find((p) => p.type === type) || {
      type,
      defaultExpirationDays: 90,
      archiveInsteadOfDelete: true,
    }
  );
}

/**
 * Helper to calculate expiration date
 */
export function calculateExpirationDate(type: MemoryType): Date {
  const policy = getExpirationPolicy(type);
  const now = new Date();
  now.setDate(now.getDate() + policy.defaultExpirationDays);
  return now;
}
