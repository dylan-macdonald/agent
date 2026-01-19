/**
 * Memory System Types
 * Defines the structure for AI memory storage and retrieval
 */

import type { UUID } from "@/types/index.js";

/**
 * ISO 8601 timestamp string for serialization
 */
export type ISOTimestamp = string;

/**
 * Categories of memories the AI can store
 */
export enum MemoryCategory {
  // Facts about the user
  PERSONAL_INFO = "personal_info", // Name, birthday, location, etc.
  PREFERENCE = "preference", // Likes, dislikes, preferences
  RELATIONSHIP = "relationship", // People the user knows
  WORK = "work", // Job, projects, colleagues
  HEALTH = "health", // Health conditions, medications, goals

  // Behavioral patterns
  ROUTINE = "routine", // Daily routines, habits
  PATTERN = "pattern", // Observed behavioral patterns

  // Goals and commitments
  GOAL = "goal", // Short and long-term goals
  COMMITMENT = "commitment", // Things user committed to

  // Contextual memories
  CONVERSATION = "conversation", // Important conversation points
  EVENT = "event", // Past or upcoming events
  REMINDER = "reminder", // Things to remember to mention

  // Emotional/supportive
  MOOD_PATTERN = "mood_pattern", // Emotional patterns
  WIN = "win", // Accomplishments to celebrate
  STRUGGLE = "struggle", // Challenges user faces

  // Miscellaneous
  INTEREST = "interest", // Hobbies, interests
  NOTE = "note", // General notes
}

/**
 * How important/relevant a memory is
 */
export enum MemoryImportance {
  CRITICAL = "critical", // Never forget (e.g., name, severe allergies)
  HIGH = "high", // Very important
  MEDIUM = "medium", // Moderately important
  LOW = "low", // Nice to know
  TEMPORARY = "temporary", // Short-term relevance
}

/**
 * Source of the memory
 */
export enum MemorySource {
  USER_STATED = "user_stated", // User explicitly told the AI
  OBSERVED = "observed", // AI inferred from behavior
  IMPORTED = "imported", // Imported from external source
  SYSTEM = "system", // System-generated
}

/**
 * Core memory structure
 */
export interface Memory {
  id: UUID;
  category: MemoryCategory;
  importance: MemoryImportance;
  source: MemorySource;

  // Content
  content: string; // The actual memory (human-readable)
  summary?: string; // Brief summary for quick reference
  tags: string[]; // Searchable tags

  // Metadata
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  lastAccessedAt: ISOTimestamp;
  accessCount: number;

  // Lifecycle
  expiresAt?: ISOTimestamp; // When memory should be archived/deleted
  isArchived: boolean;

  // Relationships
  relatedMemoryIds: UUID[]; // Links to related memories

  // For encrypted storage (future)
  isEncrypted?: boolean;
}

/**
 * Input for creating a new memory
 */
export interface CreateMemoryInput {
  category: MemoryCategory;
  importance?: MemoryImportance;
  source?: MemorySource;
  content: string;
  summary?: string;
  tags?: string[];
  expiresAt?: ISOTimestamp;
  relatedMemoryIds?: UUID[];
}

/**
 * Input for updating a memory
 */
export interface UpdateMemoryInput {
  category?: MemoryCategory;
  importance?: MemoryImportance;
  content?: string;
  summary?: string;
  tags?: string[];
  expiresAt?: ISOTimestamp;
  relatedMemoryIds?: UUID[];
  isArchived?: boolean;
}

/**
 * Query options for searching memories
 */
export interface MemoryQuery {
  // Filter by category
  categories?: MemoryCategory[];

  // Filter by importance
  minImportance?: MemoryImportance;

  // Filter by tags (matches any)
  tags?: string[];

  // Text search in content/summary
  searchText?: string;

  // Include archived memories
  includeArchived?: boolean;

  // Date range
  createdAfter?: ISOTimestamp;
  createdBefore?: ISOTimestamp;

  // Sorting
  sortBy?: "createdAt" | "updatedAt" | "lastAccessedAt" | "importance";
  sortOrder?: "asc" | "desc";

  // Pagination
  limit?: number;
  offset?: number;
}

/**
 * Result of a memory query
 */
export interface MemoryQueryResult {
  memories: Memory[];
  total: number;
  hasMore: boolean;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalMemories: number;
  byCategory: Record<MemoryCategory, number>;
  byImportance: Record<MemoryImportance, number>;
  archivedCount: number;
  oldestMemory?: ISOTimestamp;
  newestMemory?: ISOTimestamp;
}
