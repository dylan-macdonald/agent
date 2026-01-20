import { describe, it, expect, beforeEach } from "vitest";
import { MessageProcessor } from "../../src/services/message-processor.js";
import { Intent, EntityType } from "../../src/types/processor.js";

describe("MessageProcessor", () => {
  let processor: MessageProcessor;

  beforeEach(() => {
    processor = new MessageProcessor();
  });

  describe("processCommand", () => {
    it("should recognize /remind command", async () => {
      const result = await processor.process("/remind Buy milk at 5pm");
      expect(result.intent).toBe(Intent.REMIND);
      expect(result.isCommand).toBe(true);
      expect(result.command).toBe("remind");
      expect(result.entities.some((e) => e.type === EntityType.TIME)).toBe(
        true
      );
    });

    it("should recognize command aliases", async () => {
      const result = await processor.process("/h");
      expect(result.intent).toBe(Intent.HELP);
      expect(result.command).toBe("h");
    });

    it("should return UNKNOWN for invalid command", async () => {
      const result = await processor.process("/invalidcommand");
      expect(result.intent).toBe(Intent.UNKNOWN);
    });
  });

  describe("processNaturalLanguage", () => {
    it("should recognize natural language reminders", async () => {
      const result = await processor.process("remind me to call mom at 10am");
      expect(result.intent).toBe(Intent.REMIND);
      expect(result.isCommand).toBe(false);
      expect(result.entities.some((e) => e.type === EntityType.TIME)).toBe(
        true
      );
    });

    it("should recognize natural language logging", async () => {
      const result = await processor.process("log 500 calories");
      expect(result.intent).toBe(Intent.LOG);
      expect(result.entities.some((e) => e.type === EntityType.VALUE)).toBe(
        true
      );
    });

    it("should recognize natural language goal tracking", async () => {
      const result = await processor.process("update my goal progress to 75%");
      expect(result.intent).toBe(Intent.GOAL);
    });

    it("should recognize natural language status check", async () => {
      const result = await processor.process(
        "how am i doing with my tasks today?"
      );
      expect(result.intent).toBe(Intent.STATUS);
    });

    it("should recognize help request variants", async () => {
      const result = await processor.process("what can you do for me?");
      expect(result.intent).toBe(Intent.HELP);
    });

    it("should extract task from natural language reminder", async () => {
      const result = await processor.process(
        "remind me to buy groceries at 6pm"
      );
      expect(result.intent).toBe(Intent.REMIND);
      const task = result.entities.find((e) => e.type === EntityType.TASK);
      expect(task).toBeDefined();
      expect(task?.value.toLowerCase()).toBe("buy groceries");
    });
  });

  describe("formatResponse", () => {
    it("should return short text unchanged", () => {
      const text = "Short message";
      expect(processor.formatResponse(text)).toBe(text);
    });
  });

  describe("getHelpText", () => {
    it("should return formatted help string", () => {
      const help = processor.getHelpText();
      expect(help).toContain("Available Commands:");
      expect(help).toContain("/remind");
      expect(help).toContain("/help");
    });
  });
});
