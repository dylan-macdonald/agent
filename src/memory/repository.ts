/**
 * Memory Repository
 * Handles storage and retrieval of AI memories
 * Currently uses in-memory storage, easily swappable to PostgreSQL
 */

import { randomUUID } from "crypto";

import { encrypt, decrypt } from "@/security/encryption.js";
import type { UUID } from "@/types/index.js";

import {
  MemoryImportance,
  MemorySource,
  type Memory,
  type CreateMemoryInput,
  type UpdateMemoryInput,
  type MemoryQuery,
  type MemoryQueryResult,
  type MemoryStats,
  type MemoryCategory,
} from "./types.js";

/**
 * Importance level weights for sorting
 */
const IMPORTANCE_WEIGHTS: Record<MemoryImportance, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  temporary: 10,
};

/**
 * In-memory storage (will be replaced with database)
 */
class MemoryStore {
  private memories: Map<UUID, Memory> = new Map();
  private encryptionEnabled = false;

  enableEncryption(): void {
    this.encryptionEnabled = true;
  }

  disableEncryption(): void {
    this.encryptionEnabled = false;
  }

  private encryptContent(content: string): string {
    if (!this.encryptionEnabled) {
      return content;
    }
    return encrypt(content);
  }

  private decryptContent(content: string, isEncrypted?: boolean): string {
    if (!isEncrypted) {
      return content;
    }
    return decrypt(content);
  }

  /**
   * Create a new memory
   */
  create(input: CreateMemoryInput): Memory {
    const now = new Date().toISOString();
    const id = randomUUID();

    const memory: Memory = {
      id,
      category: input.category,
      importance: input.importance ?? MemoryImportance.MEDIUM,
      source: input.source ?? MemorySource.USER_STATED,
      content: this.encryptContent(input.content),
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      isArchived: false,
      relatedMemoryIds: input.relatedMemoryIds ?? [],
      isEncrypted: this.encryptionEnabled,
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
    };

    this.memories.set(id, memory);
    return this.getDecrypted(memory);
  }

  /**
   * Get a memory by ID
   */
  get(id: UUID): Memory | null {
    const memory = this.memories.get(id);
    if (!memory) {
      return null;
    }

    // Update access tracking
    memory.lastAccessedAt = new Date().toISOString();
    memory.accessCount++;

    return this.getDecrypted(memory);
  }

  /**
   * Get decrypted version of memory
   */
  private getDecrypted(memory: Memory): Memory {
    return {
      ...memory,
      content: this.decryptContent(memory.content, memory.isEncrypted),
    };
  }

  /**
   * Update a memory
   */
  update(id: UUID, input: UpdateMemoryInput): Memory | null {
    const existing = this.memories.get(id);
    if (!existing) {
      return null;
    }

    const updated: Memory = {
      id: existing.id,
      category: input.category ?? existing.category,
      importance: input.importance ?? existing.importance,
      source: existing.source,
      content:
        input.content !== undefined
          ? this.encryptContent(input.content)
          : existing.content,
      tags: input.tags ?? existing.tags,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      lastAccessedAt: existing.lastAccessedAt,
      accessCount: existing.accessCount,
      isArchived: input.isArchived ?? existing.isArchived,
      relatedMemoryIds: input.relatedMemoryIds ?? existing.relatedMemoryIds,
      isEncrypted:
        input.content !== undefined
          ? this.encryptionEnabled
          : existing.isEncrypted ?? false,
      ...(input.summary !== undefined
        ? { summary: input.summary }
        : existing.summary !== undefined
          ? { summary: existing.summary }
          : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt }
        : existing.expiresAt !== undefined
          ? { expiresAt: existing.expiresAt }
          : {}),
    };

    this.memories.set(id, updated);
    return this.getDecrypted(updated);
  }

  /**
   * Delete a memory permanently
   */
  delete(id: UUID): boolean {
    return this.memories.delete(id);
  }

  /**
   * Archive a memory (soft delete)
   */
  archive(id: UUID): Memory | null {
    return this.update(id, { isArchived: true });
  }

  /**
   * Unarchive a memory
   */
  unarchive(id: UUID): Memory | null {
    return this.update(id, { isArchived: false });
  }

  /**
   * Query memories with filters
   */
  query(options: MemoryQuery = {}): MemoryQueryResult {
    let results = Array.from(this.memories.values());

    // Filter by archived status
    if (!options.includeArchived) {
      results = results.filter((m) => !m.isArchived);
    }

    // Filter by categories
    if (options.categories && options.categories.length > 0) {
      results = results.filter((m) => options.categories!.includes(m.category));
    }

    // Filter by minimum importance
    if (options.minImportance) {
      const minWeight = IMPORTANCE_WEIGHTS[options.minImportance];
      results = results.filter(
        (m) => IMPORTANCE_WEIGHTS[m.importance] >= minWeight
      );
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      const searchTags = options.tags.map((t) => t.toLowerCase());
      results = results.filter((m) =>
        m.tags.some((t) => searchTags.includes(t.toLowerCase()))
      );
    }

    // Text search
    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase();
      results = results.filter((m) => {
        const decrypted = this.getDecrypted(m);
        return (
          decrypted.content.toLowerCase().includes(searchLower) ||
          (decrypted.summary?.toLowerCase().includes(searchLower) ?? false)
        );
      });
    }

    // Date filters
    if (options.createdAfter) {
      results = results.filter((m) => m.createdAt >= options.createdAfter!);
    }
    if (options.createdBefore) {
      results = results.filter((m) => m.createdAt <= options.createdBefore!);
    }

    // Get total before pagination
    const total = results.length;

    // Sorting
    const sortBy = options.sortBy ?? "createdAt";
    const sortOrder = options.sortOrder ?? "desc";
    results.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "importance") {
        comparison =
          IMPORTANCE_WEIGHTS[a.importance] - IMPORTANCE_WEIGHTS[b.importance];
      } else {
        comparison = a[sortBy].localeCompare(b[sortBy]);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    results = results.slice(offset, offset + limit);

    return {
      memories: results.map((m) => this.getDecrypted(m)),
      total,
      hasMore: offset + results.length < total,
    };
  }

  /**
   * Search memories by text (convenience method)
   */
  search(text: string, limit = 10): Memory[] {
    return this.query({ searchText: text, limit }).memories;
  }

  /**
   * Get memories by category
   */
  getByCategory(category: MemoryCategory, limit = 50): Memory[] {
    return this.query({ categories: [category], limit }).memories;
  }

  /**
   * Get recent memories
   */
  getRecent(limit = 10): Memory[] {
    return this.query({ sortBy: "createdAt", sortOrder: "desc", limit })
      .memories;
  }

  /**
   * Get most accessed memories
   */
  getMostAccessed(limit = 10): Memory[] {
    const results = Array.from(this.memories.values())
      .filter((m) => !m.isArchived)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
    return results.map((m) => this.getDecrypted(m));
  }

  /**
   * Get critical memories (never expire)
   */
  getCritical(): Memory[] {
    return this.query({ minImportance: MemoryImportance.CRITICAL }).memories;
  }

  /**
   * Find related memories
   */
  getRelated(id: UUID): Memory[] {
    const memory = this.memories.get(id);
    if (!memory) {
      return [];
    }

    return memory.relatedMemoryIds
      .map((relId) => this.get(relId))
      .filter((m): m is Memory => m !== null);
  }

  /**
   * Link two memories as related
   */
  linkMemories(id1: UUID, id2: UUID): boolean {
    const m1 = this.memories.get(id1);
    const m2 = this.memories.get(id2);

    if (!m1 || !m2) {
      return false;
    }

    if (!m1.relatedMemoryIds.includes(id2)) {
      m1.relatedMemoryIds.push(id2);
    }
    if (!m2.relatedMemoryIds.includes(id1)) {
      m2.relatedMemoryIds.push(id1);
    }

    return true;
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    const memories = Array.from(this.memories.values());

    const byCategory = {} as Record<MemoryCategory, number>;
    const byImportance = {} as Record<MemoryImportance, number>;

    let archivedCount = 0;
    let oldest: string | undefined;
    let newest: string | undefined;

    for (const memory of memories) {
      // Count by category
      byCategory[memory.category] = (byCategory[memory.category] ?? 0) + 1;

      // Count by importance
      byImportance[memory.importance] =
        (byImportance[memory.importance] ?? 0) + 1;

      // Count archived
      if (memory.isArchived) {
        archivedCount++;
      }

      // Track oldest/newest
      if (!oldest || memory.createdAt < oldest) {
        oldest = memory.createdAt;
      }
      if (!newest || memory.createdAt > newest) {
        newest = memory.createdAt;
      }
    }

    return {
      totalMemories: memories.length,
      byCategory,
      byImportance,
      archivedCount,
      ...(oldest !== undefined && { oldestMemory: oldest }),
      ...(newest !== undefined && { newestMemory: newest }),
    };
  }

  /**
   * Clean up expired memories
   */
  cleanupExpired(): number {
    const now = new Date().toISOString();
    let cleaned = 0;

    for (const [id, memory] of this.memories.entries()) {
      if (
        memory.expiresAt &&
        memory.expiresAt < now &&
        memory.importance !== MemoryImportance.CRITICAL
      ) {
        // Archive instead of delete for non-critical memories
        this.archive(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get all memories (for export/backup)
   */
  getAll(): Memory[] {
    return Array.from(this.memories.values()).map((m) => this.getDecrypted(m));
  }

  /**
   * Clear all memories (use with caution!)
   */
  clear(): void {
    this.memories.clear();
  }

  /**
   * Import memories (for restore)
   */
  import(memories: Memory[]): number {
    let imported = 0;
    for (const memory of memories) {
      this.memories.set(memory.id, {
        ...memory,
        content: this.encryptContent(memory.content),
        isEncrypted: this.encryptionEnabled,
      });
      imported++;
    }
    return imported;
  }
}

// Export singleton instance
export const memoryStore = new MemoryStore();

// Export convenience functions
export const createMemory = (input: CreateMemoryInput): Memory =>
  memoryStore.create(input);

export const getMemory = (id: UUID): Memory | null => memoryStore.get(id);

export const updateMemory = (id: UUID, input: UpdateMemoryInput): Memory | null =>
  memoryStore.update(id, input);

export const deleteMemory = (id: UUID): boolean => memoryStore.delete(id);

export const archiveMemory = (id: UUID): Memory | null => memoryStore.archive(id);

export const searchMemories = (text: string, limit?: number): Memory[] =>
  memoryStore.search(text, limit);

export const queryMemories = (options?: MemoryQuery): MemoryQueryResult =>
  memoryStore.query(options);

export const getMemoryStats = (): MemoryStats => memoryStore.getStats();

export default memoryStore;
