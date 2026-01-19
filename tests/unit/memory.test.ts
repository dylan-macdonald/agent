import { describe, it, expect, beforeEach } from "vitest";

import {
  memoryStore,
  aiMemory,
  MemoryCategory,
  MemoryImportance,
} from "@/memory/index.js";

describe("Memory Repository", () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  describe("CRUD operations", () => {
    it("should create a memory", () => {
      const memory = memoryStore.create({
        category: MemoryCategory.PERSONAL_INFO,
        content: "User's name is Dylan",
      });

      expect(memory.id).toBeDefined();
      expect(memory.content).toBe("User's name is Dylan");
      expect(memory.category).toBe(MemoryCategory.PERSONAL_INFO);
      expect(memory.importance).toBe("medium");
      expect(memory.isArchived).toBe(false);
    });

    it("should get a memory by ID", () => {
      const created = memoryStore.create({
        category: MemoryCategory.PREFERENCE,
        content: "Likes coffee",
      });

      const retrieved = memoryStore.get(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.content).toBe("Likes coffee");
      expect(retrieved?.accessCount).toBe(1);
    });

    it("should update a memory", () => {
      const created = memoryStore.create({
        category: MemoryCategory.PREFERENCE,
        content: "Likes tea",
      });

      const updated = memoryStore.update(created.id, {
        content: "Actually prefers coffee",
      });

      expect(updated?.content).toBe("Actually prefers coffee");
      expect(updated?.updatedAt).not.toBe(created.createdAt);
    });

    it("should delete a memory", () => {
      const created = memoryStore.create({
        category: MemoryCategory.NOTE,
        content: "Temporary note",
      });

      const deleted = memoryStore.delete(created.id);
      const retrieved = memoryStore.get(created.id);

      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });

    it("should archive a memory", () => {
      const created = memoryStore.create({
        category: MemoryCategory.NOTE,
        content: "Old note",
      });

      const archived = memoryStore.archive(created.id);

      expect(archived?.isArchived).toBe(true);
    });
  });

  describe("Query operations", () => {
    beforeEach(() => {
      memoryStore.create({
        category: MemoryCategory.PERSONAL_INFO,
        content: "Name is Dylan",
        importance: MemoryImportance.CRITICAL,
        tags: ["identity"],
      });
      memoryStore.create({
        category: MemoryCategory.PREFERENCE,
        content: "Likes morning workouts",
        importance: MemoryImportance.MEDIUM,
        tags: ["exercise", "routine"],
      });
      memoryStore.create({
        category: MemoryCategory.HEALTH,
        content: "No known allergies",
        importance: MemoryImportance.HIGH,
        tags: ["health"],
      });
    });

    it("should filter by category", () => {
      const results = memoryStore.query({
        categories: [MemoryCategory.PERSONAL_INFO],
      });

      expect(results.memories.length).toBe(1);
      expect(results.memories[0].content).toBe("Name is Dylan");
    });

    it("should filter by minimum importance", () => {
      const results = memoryStore.query({
        minImportance: MemoryImportance.HIGH,
      });

      expect(results.memories.length).toBe(2);
    });

    it("should search by text", () => {
      const results = memoryStore.search("workout");

      expect(results.length).toBe(1);
      expect(results[0].content).toContain("workout");
    });

    it("should filter by tags", () => {
      const results = memoryStore.query({ tags: ["exercise"] });

      expect(results.memories.length).toBe(1);
      expect(results.memories[0].tags).toContain("exercise");
    });

    it("should exclude archived by default", () => {
      const created = memoryStore.create({
        category: MemoryCategory.NOTE,
        content: "Archived memory",
      });
      memoryStore.archive(created.id);

      const results = memoryStore.query({});

      expect(results.memories.find((m) => m.id === created.id)).toBeUndefined();
    });

    it("should include archived when requested", () => {
      const created = memoryStore.create({
        category: MemoryCategory.NOTE,
        content: "Archived memory",
      });
      memoryStore.archive(created.id);

      const results = memoryStore.query({ includeArchived: true });

      expect(results.memories.find((m) => m.id === created.id)).toBeDefined();
    });
  });

  describe("Statistics", () => {
    it("should return accurate stats", () => {
      memoryStore.create({
        category: MemoryCategory.PERSONAL_INFO,
        content: "Fact 1",
      });
      memoryStore.create({
        category: MemoryCategory.PERSONAL_INFO,
        content: "Fact 2",
      });
      memoryStore.create({
        category: MemoryCategory.PREFERENCE,
        content: "Preference 1",
      });

      const stats = memoryStore.getStats();

      expect(stats.totalMemories).toBe(3);
      expect(stats.byCategory[MemoryCategory.PERSONAL_INFO]).toBe(2);
      expect(stats.byCategory[MemoryCategory.PREFERENCE]).toBe(1);
    });
  });
});

describe("AI Memory Interface", () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  describe("remember", () => {
    it("should create a memory with auto-inferred category", () => {
      const memory = aiMemory.remember("User's name is Dylan");

      expect(memory.content).toBe("User's name is Dylan");
      expect(memory.category).toBe(MemoryCategory.PERSONAL_INFO);
    });

    it("should infer preference category", () => {
      const memory = aiMemory.remember("Dylan likes coffee");

      expect(memory.category).toBe(MemoryCategory.PREFERENCE);
    });

    it("should infer health category", () => {
      const memory = aiMemory.remember("Takes medication every morning");

      expect(memory.category).toBe(MemoryCategory.HEALTH);
    });

    it("should allow explicit category override", () => {
      const memory = aiMemory.remember("Something important", {
        category: MemoryCategory.GOAL,
      });

      expect(memory.category).toBe(MemoryCategory.GOAL);
    });
  });

  describe("rememberForever", () => {
    it("should create a critical memory", () => {
      const memory = aiMemory.rememberForever("Name is Dylan");

      expect(memory.importance).toBe(MemoryImportance.CRITICAL);
    });
  });

  describe("rememberTemporarily", () => {
    it("should create a temporary memory with expiration", () => {
      const memory = aiMemory.rememberTemporarily(
        "Meeting in 1 hour",
        3600000 // 1 hour
      );

      expect(memory.importance).toBe(MemoryImportance.TEMPORARY);
      expect(memory.expiresAt).toBeDefined();
    });
  });

  describe("recall", () => {
    it("should find memories by topic", () => {
      aiMemory.remember("Dylan loves coffee");
      aiMemory.remember("Dylan works as a developer");
      aiMemory.remember("Dylan has a cat");

      const results = aiMemory.recall("coffee");

      expect(results.length).toBe(1);
      expect(results[0].content).toContain("coffee");
    });
  });

  describe("forget", () => {
    it("should delete a memory by ID", () => {
      const memory = aiMemory.remember("Something to forget");

      const forgotten = aiMemory.forget(memory.id);

      expect(forgotten).toBe(true);
      expect(aiMemory.recall("forget")).toHaveLength(0);
    });

    it("should delete a memory by content search", () => {
      aiMemory.remember("Old phone number is 555-1234");

      const forgotten = aiMemory.forget("phone number");

      expect(forgotten).toBe(true);
    });
  });

  describe("knows", () => {
    it("should return true if memory exists", () => {
      aiMemory.remember("Dylan has a cat named Whiskers");

      expect(aiMemory.knows("cat")).toBe(true);
      expect(aiMemory.knows("dog")).toBe(false);
    });
  });

  describe("summarize", () => {
    it("should return memory summary", () => {
      aiMemory.remember("Dylan's name");
      aiMemory.remember("Dylan likes coffee");
      aiMemory.rememberForever("Critical info");

      const summary = aiMemory.summarize();

      expect(summary.totalMemories).toBe(3);
      expect(summary.criticalCount).toBe(1);
    });
  });

  describe("promote/demote", () => {
    it("should promote memory importance", () => {
      const memory = aiMemory.remember("Low priority note", {
        importance: MemoryImportance.LOW,
      });

      const promoted = aiMemory.promote(memory.id);

      expect(promoted?.importance).toBe(MemoryImportance.MEDIUM);
    });

    it("should demote memory importance", () => {
      const memory = aiMemory.remember("High priority note", {
        importance: MemoryImportance.HIGH,
      });

      const demoted = aiMemory.demote(memory.id);

      expect(demoted?.importance).toBe(MemoryImportance.MEDIUM);
    });
  });

  describe("link memories", () => {
    it("should link related memories", () => {
      const m1 = aiMemory.remember("Dylan has a cat");
      const m2 = aiMemory.remember("The cat's name is Whiskers");

      aiMemory.link(m1.id, m2.id);

      const related = aiMemory.getRelated(m1.id);

      expect(related.length).toBe(1);
      expect(related[0].id).toBe(m2.id);
    });
  });

  describe("export/import", () => {
    it("should export and import memories", () => {
      aiMemory.remember("Memory 1");
      aiMemory.remember("Memory 2");

      const exported = aiMemory.export();
      aiMemory.forgetEverything();

      expect(aiMemory.summarize().totalMemories).toBe(0);

      const imported = aiMemory.import(exported);

      expect(imported).toBe(2);
      expect(aiMemory.summarize().totalMemories).toBe(2);
    });
  });
});
