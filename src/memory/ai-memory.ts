/**
 * AI Memory Interface
 * High-level interface for the AI to naturally work with memories
 * Provides intuitive methods like "remember", "forget", "recall"
 */

import type { UUID } from "@/types/index.js";
import { logger } from "@/utils/logger.js";

import {
  memoryStore,
  createMemory,
  searchMemories,
  queryMemories,
  deleteMemory,
  archiveMemory,
  updateMemory,
  getMemory,
} from "./repository.js";
import {
  MemoryCategory,
  MemoryImportance,
  MemorySource,
  type Memory,
  type CreateMemoryInput,
} from "./types.js";

/**
 * AI Memory - Natural language-like interface for the AI
 */
export const aiMemory = {
  /**
   * Remember something about the user
   *
   * @example
   * aiMemory.remember("User's name is Dylan")
   * aiMemory.remember("Prefers morning workouts", { category: "preference" })
   * aiMemory.remember("Has a cat named Whiskers", { importance: "high", tags: ["pets"] })
   */
  remember(
    content: string,
    options: {
      category?: MemoryCategory;
      importance?: MemoryImportance;
      tags?: string[];
      expiresIn?: number; // milliseconds
      summary?: string;
    } = {}
  ): Memory {
    const expiresAt = options.expiresIn
      ? new Date(Date.now() + options.expiresIn).toISOString()
      : undefined;

    const input: CreateMemoryInput = {
      content,
      category: options.category ?? inferCategory(content),
      importance: options.importance ?? MemoryImportance.MEDIUM,
      source: MemorySource.OBSERVED,
      tags: options.tags ?? extractTags(content),
      ...(options.summary !== undefined && { summary: options.summary }),
      ...(expiresAt !== undefined && { expiresAt }),
    };

    const memory = createMemory(input);
    logger.info("Memory created", {
      id: memory.id,
      category: memory.category,
      summary: memory.summary ?? memory.content.substring(0, 50),
    });
    return memory;
  },

  /**
   * Remember something the user explicitly said
   */
  rememberUserSaid(
    content: string,
    options: {
      category?: MemoryCategory;
      importance?: MemoryImportance;
      tags?: string[];
    } = {}
  ): Memory {
    return createMemory({
      content,
      category: options.category ?? inferCategory(content),
      importance: options.importance ?? MemoryImportance.MEDIUM,
      source: MemorySource.USER_STATED,
      tags: options.tags ?? extractTags(content),
    });
  },

  /**
   * Remember something critical that should never be forgotten
   */
  rememberForever(
    content: string,
    options: { category?: MemoryCategory; tags?: string[] } = {}
  ): Memory {
    return createMemory({
      content,
      category: options.category ?? MemoryCategory.PERSONAL_INFO,
      importance: MemoryImportance.CRITICAL,
      source: MemorySource.USER_STATED,
      tags: options.tags ?? extractTags(content),
    });
  },

  /**
   * Remember something temporarily
   */
  rememberTemporarily(
    content: string,
    durationMs: number,
    options: { category?: MemoryCategory; tags?: string[] } = {}
  ): Memory {
    return createMemory({
      content,
      category: options.category ?? MemoryCategory.NOTE,
      importance: MemoryImportance.TEMPORARY,
      source: MemorySource.OBSERVED,
      tags: options.tags ?? [],
      expiresAt: new Date(Date.now() + durationMs).toISOString(),
    });
  },

  /**
   * Forget a specific memory permanently
   */
  forget(idOrContent: string): boolean {
    // If it looks like a UUID, try direct delete
    if (isUUID(idOrContent)) {
      const deleted = deleteMemory(idOrContent);
      if (deleted) {
        logger.info("Memory forgotten", { id: idOrContent });
      }
      return deleted;
    }

    // Otherwise, search for matching memories and delete them
    const matches = searchMemories(idOrContent, 5);
    const firstMatch = matches[0];
    if (!firstMatch) {
      return false;
    }

    // Delete the most relevant match
    const deleted = deleteMemory(firstMatch.id);
    if (deleted) {
      logger.info("Memory forgotten by search", {
        id: firstMatch.id,
        content: firstMatch.content.substring(0, 50),
      });
    }
    return deleted;
  },

  /**
   * Archive a memory (can be recovered later)
   */
  archive(idOrContent: string): boolean {
    if (isUUID(idOrContent)) {
      return archiveMemory(idOrContent) !== null;
    }

    const matches = searchMemories(idOrContent, 1);
    const firstMatch = matches[0];
    if (!firstMatch) {
      return false;
    }
    return archiveMemory(firstMatch.id) !== null;
  },

  /**
   * Recall memories about a topic
   */
  recall(topic: string, limit = 5): Memory[] {
    return searchMemories(topic, limit);
  },

  /**
   * Recall everything known about a specific category
   */
  recallCategory(category: MemoryCategory, limit = 20): Memory[] {
    return queryMemories({ categories: [category], limit }).memories;
  },

  /**
   * Recall recent memories
   */
  recallRecent(limit = 10): Memory[] {
    return memoryStore.getRecent(limit);
  },

  /**
   * Recall the most important memories
   */
  recallImportant(limit = 10): Memory[] {
    return queryMemories({
      minImportance: MemoryImportance.HIGH,
      sortBy: "importance",
      limit,
    }).memories;
  },

  /**
   * Recall critical memories that should never be forgotten
   */
  recallCritical(): Memory[] {
    return memoryStore.getCritical();
  },

  /**
   * Update an existing memory
   */
  update(id: UUID, content: string): Memory | null {
    return updateMemory(id, { content });
  },

  /**
   * Add tags to a memory
   */
  addTags(id: UUID, tags: string[]): Memory | null {
    const memory = getMemory(id);
    if (!memory) {
      return null;
    }
    const newTags = [...new Set([...memory.tags, ...tags])];
    return updateMemory(id, { tags: newTags });
  },

  /**
   * Promote a memory's importance
   */
  promote(id: UUID): Memory | null {
    const memory = getMemory(id);
    if (!memory) {
      return null;
    }

    const promotionOrder: MemoryImportance[] = [
      MemoryImportance.TEMPORARY,
      MemoryImportance.LOW,
      MemoryImportance.MEDIUM,
      MemoryImportance.HIGH,
      MemoryImportance.CRITICAL,
    ];
    const currentIndex = promotionOrder.indexOf(memory.importance);
    const nextImportance = promotionOrder[currentIndex + 1];
    if (currentIndex < promotionOrder.length - 1 && nextImportance) {
      return updateMemory(id, { importance: nextImportance });
    }
    return memory;
  },

  /**
   * Demote a memory's importance
   */
  demote(id: UUID): Memory | null {
    const memory = getMemory(id);
    if (!memory) {
      return null;
    }

    const promotionOrder: MemoryImportance[] = [
      MemoryImportance.TEMPORARY,
      MemoryImportance.LOW,
      MemoryImportance.MEDIUM,
      MemoryImportance.HIGH,
      MemoryImportance.CRITICAL,
    ];
    const currentIndex = promotionOrder.indexOf(memory.importance);
    const prevImportance = promotionOrder[currentIndex - 1];
    if (currentIndex > 0 && prevImportance) {
      return updateMemory(id, { importance: prevImportance });
    }
    return memory;
  },

  /**
   * Get a summary of what the AI knows
   */
  summarize(): {
    totalMemories: number;
    categories: Record<string, number>;
    recentTopics: string[];
    criticalCount: number;
  } {
    const stats = memoryStore.getStats();
    const recent = memoryStore.getRecent(5);

    return {
      totalMemories: stats.totalMemories,
      categories: stats.byCategory as Record<string, number>,
      recentTopics: recent.map(
        (m) => m.summary ?? m.content.substring(0, 30) + "..."
      ),
      criticalCount: stats.byImportance.critical ?? 0,
    };
  },

  /**
   * Check if the AI knows something about a topic
   */
  knows(topic: string): boolean {
    const results = searchMemories(topic, 1);
    return results.length > 0;
  },

  /**
   * Get the most relevant memory about a topic
   */
  getBestMatch(topic: string): Memory | null {
    const results = searchMemories(topic, 1);
    return results[0] ?? null;
  },

  /**
   * Link two memories as related
   */
  link(id1: UUID, id2: UUID): boolean {
    return memoryStore.linkMemories(id1, id2);
  },

  /**
   * Get memories related to a specific memory
   */
  getRelated(id: UUID): Memory[] {
    return memoryStore.getRelated(id);
  },

  /**
   * Clean up old/expired memories
   */
  cleanup(): number {
    return memoryStore.cleanupExpired();
  },

  /**
   * Export all memories (for backup)
   */
  export(): Memory[] {
    return memoryStore.getAll();
  },

  /**
   * Import memories (for restore)
   */
  import(memories: Memory[]): number {
    return memoryStore.import(memories);
  },

  /**
   * Clear all memories (dangerous!)
   */
  forgetEverything(): void {
    logger.warn("All memories being cleared");
    memoryStore.clear();
  },
};

/**
 * Infer category from content using simple heuristics
 */
function inferCategory(content: string): MemoryCategory {
  const lower = content.toLowerCase();

  // Personal info
  if (
    lower.includes("name is") ||
    lower.includes("birthday") ||
    lower.includes("born on") ||
    lower.includes("lives in") ||
    lower.includes("from")
  ) {
    return MemoryCategory.PERSONAL_INFO;
  }

  // Preferences
  if (
    lower.includes("likes") ||
    lower.includes("loves") ||
    lower.includes("prefers") ||
    lower.includes("favorite") ||
    lower.includes("hates") ||
    lower.includes("dislikes")
  ) {
    return MemoryCategory.PREFERENCE;
  }

  // Health
  if (
    lower.includes("allergic") ||
    lower.includes("medication") ||
    lower.includes("health") ||
    lower.includes("doctor") ||
    lower.includes("exercise") ||
    lower.includes("workout")
  ) {
    return MemoryCategory.HEALTH;
  }

  // Work
  if (
    lower.includes("work") ||
    lower.includes("job") ||
    lower.includes("project") ||
    lower.includes("meeting") ||
    lower.includes("colleague")
  ) {
    return MemoryCategory.WORK;
  }

  // Goals
  if (
    lower.includes("want to") ||
    lower.includes("goal") ||
    lower.includes("trying to") ||
    lower.includes("planning to")
  ) {
    return MemoryCategory.GOAL;
  }

  // Routine
  if (
    lower.includes("usually") ||
    lower.includes("always") ||
    lower.includes("every day") ||
    lower.includes("morning") ||
    lower.includes("evening")
  ) {
    return MemoryCategory.ROUTINE;
  }

  // Relationships
  if (
    lower.includes("friend") ||
    lower.includes("family") ||
    lower.includes("partner") ||
    lower.includes("spouse") ||
    lower.includes("parent")
  ) {
    return MemoryCategory.RELATIONSHIP;
  }

  // Interests
  if (
    lower.includes("hobby") ||
    lower.includes("enjoy") ||
    lower.includes("interested in")
  ) {
    return MemoryCategory.INTEREST;
  }

  // Default to note
  return MemoryCategory.NOTE;
}

/**
 * Extract potential tags from content
 */
function extractTags(content: string): string[] {
  const tags: string[] = [];
  const lower = content.toLowerCase();

  // Common topics to tag
  const topicPatterns: Record<string, string[]> = {
    food: ["food", "eat", "meal", "lunch", "dinner", "breakfast", "cook"],
    exercise: ["exercise", "workout", "gym", "run", "walk", "fitness"],
    sleep: ["sleep", "wake", "bed", "rest", "tired"],
    work: ["work", "job", "project", "meeting", "office"],
    health: ["health", "doctor", "medicine", "sick", "pain"],
    family: ["family", "mom", "dad", "parent", "sibling", "child"],
    pet: ["pet", "dog", "cat", "animal"],
    travel: ["travel", "trip", "vacation", "flight"],
    hobby: ["hobby", "game", "play", "read", "music", "movie"],
  };

  for (const [tag, keywords] of Object.entries(topicPatterns)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * Check if a string is a valid UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export default aiMemory;
