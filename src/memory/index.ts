/**
 * Memory Module Exports
 */

// Types
export {
  MemoryCategory,
  MemoryImportance,
  MemorySource,
  type Memory,
  type CreateMemoryInput,
  type UpdateMemoryInput,
  type MemoryQuery,
  type MemoryQueryResult,
  type MemoryStats,
} from "./types.js";

// Repository
export {
  memoryStore,
  createMemory,
  getMemory,
  updateMemory,
  deleteMemory,
  archiveMemory,
  searchMemories,
  queryMemories,
  getMemoryStats,
} from "./repository.js";

// AI Memory Interface
export { aiMemory } from "./ai-memory.js";
