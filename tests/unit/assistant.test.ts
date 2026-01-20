import { describe, it, expect, beforeEach, vi } from "vitest";
import { AssistantService } from "../../src/services/assistant.js";
import { SmsService } from "../../src/services/sms.js";
import { MessageProcessor } from "../../src/services/message-processor.js";
import { ContextService } from "../../src/services/context.js";
import { MemoryService } from "../../src/services/memory.js";
import { ConversationService } from "../../src/services/conversation.js";
import { Intent } from "../../src/types/processor.js";
import { MessagePriority } from "../../src/types/sms.js";
import { ToolService } from "../../src/services/tools/tool-service.js";
import { CalendarService } from "../../src/services/calendar.js";
import { ReminderService } from "../../src/services/reminder.js";
import { GoalService } from "../../src/services/goal.js";
import { SleepService, WorkoutService } from "../../src/services/health/service.js";
import { MindfulnessService } from "../../src/services/health/mindfulness.js";

describe("AssistantService", () => {
  let assistant: AssistantService;
  let mockSmsService: SmsService;
  let mockProcessor: MessageProcessor;
  let mockContextService: ContextService;
  let mockMemoryService: MemoryService;
  let mockConversationService: ConversationService;
  let mockToolService: ToolService;
  let mockCalendarService: CalendarService;
  let mockReminderService: ReminderService;
  let mockGoalService: GoalService;
  let mockSleepService: SleepService;
  let mockWorkoutService: WorkoutService;
  let mockMindfulnessService: MindfulnessService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSmsService = {
      sendMessage: vi.fn().mockResolvedValue({ id: "msg-1" }),
      db: {
        query: vi
          .fn()
          .mockResolvedValue({ rows: [{ phone_number: "+1234567890" }] }),
      },
    } as unknown as SmsService;

    mockProcessor = {
      process: vi.fn().mockResolvedValue({
        intent: Intent.HELP,
        entities: [],
        isCommand: false,
      }),
      getHelpText: vi.fn().mockReturnValue("Help text"),
    } as unknown as MessageProcessor;

    mockContextService = {
      aggregateContext: vi.fn().mockResolvedValue({
        summary: { primaryActivity: "coding", activeGoals: 1, keyInsights: [] },
      }),
    } as unknown as ContextService;

    mockMemoryService = {
      createMemory: vi.fn().mockResolvedValue({ id: "mem-1" }),
    } as unknown as MemoryService;

    mockConversationService = {
      getOrCreateState: vi.fn().mockResolvedValue({ threadId: "thread-1" }),
      addTurn: vi.fn().mockResolvedValue(undefined),
    } as unknown as ConversationService;

    // Additional Mocks for MVP-6/7
    mockToolService = { executeTool: vi.fn() } as any;
    mockCalendarService = { createEvent: vi.fn() } as any;
    mockReminderService = { createReminder: vi.fn().mockResolvedValue({ id: 'rem-1' }) } as any;
    mockGoalService = { createGoal: vi.fn() } as any;
    mockSleepService = { logSleep: vi.fn() } as any;
    mockWorkoutService = { logWorkout: vi.fn() } as any;
    mockMindfulnessService = { getPrompt: vi.fn().mockReturnValue("Breathe") } as any;

    assistant = new AssistantService(
      mockSmsService,
      mockProcessor,
      mockContextService,
      mockMemoryService,
      mockConversationService,
      mockToolService,
      mockCalendarService,
      mockReminderService,
      mockGoalService,
      mockSleepService,
      mockWorkoutService,
      mockMindfulnessService
    );
  });

  it("should handle a help request", async () => {
    await assistant.handleMessage("user-1", "help");

    expect(mockProcessor.process).toHaveBeenCalledWith("help");
    expect(mockSmsService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Help text",
      })
    );
    expect(mockMemoryService.createMemory).toHaveBeenCalled();
  });

  it("should handle a status request using context", async () => {
    vi.spyOn(mockProcessor, "process").mockResolvedValueOnce({
      intent: Intent.STATUS,
      entities: [],
      isCommand: false,
      text: "status",
      confidence: 1.0,
    });

    await assistant.handleMessage("user-1", "status");

    expect(mockContextService.aggregateContext).toHaveBeenCalled();
    expect(mockSmsService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("coding"),
      })
    );
  });

  it("should handle a reminder request", async () => {
    vi.spyOn(mockProcessor, "process").mockResolvedValueOnce({
      intent: Intent.REMIND,
      entities: [
        {
          type: "task" as any,
          value: "buy milk",
          startIndex: 0,
          endIndex: 0,
          original: "",
        },
        {
          type: "time" as any,
          value: "5pm",
          startIndex: 0,
          endIndex: 0,
          original: "",
        },
      ],
      isCommand: false,
      text: "remind me to buy milk at 5pm",
      confidence: 1.0,
    });

    await assistant.handleMessage("user-1", "remind me to buy milk at 5pm");

    expect(mockSmsService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('remind you to "buy milk"'),
      })
    );
  });
});
