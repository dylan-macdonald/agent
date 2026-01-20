/**
 * Assistant Service
 *
 * Coordinates the flow of user messages through processing, context retrieval,
 * and response generation
 */

import { MindfulnessService } from "./health/mindfulness.js";
import { Intent, ProcessingResult } from "../types/processor.js";
import { ConversationTurn } from "../types/conversation.js";
import { MessageDirection, MessagePriority } from "../types/sms.js";
import { ContextTimeWindow } from "../types/context.js";
import { MemoryType } from "../types/memory.js";
import { logger } from "../utils/logger.js";
import { CalendarService } from "./calendar.js";
import { ContextService } from "./context.js";
import { ConversationService } from "./conversation.js";
import { GoalService } from "./goal.js";
import { SleepService, WorkoutService } from "./health/service.js";
import { MemoryService } from "./memory.js";
import { MessageProcessor } from "./message-processor.js";
import { ReminderService } from "./reminder.js";
import { SmsService } from "./sms.js";
import { ToolService } from "./tools/tool-service.js";
import { LlmService } from "./llm.js";
import { SettingsService } from "./settings.js";
import { BillingService } from "./billing.js";

export class AssistantService {
  constructor(
    private smsService: SmsService,
    private processor: MessageProcessor,
    private contextService: ContextService,
    private memoryService: MemoryService,
    private conversationService: ConversationService,
    private toolService: ToolService,
    private calendarService: CalendarService,
    private reminderService: ReminderService,
    private goalService: GoalService,
    private sleepService: SleepService,
    private workoutService: WorkoutService,
    private mindfulnessService: MindfulnessService,
    private llmService: LlmService,
    private settingsService: SettingsService,
    private billingService: BillingService
  ) { }

  /**
   * Handle an incoming voice message
   */
  public async handleVoiceMessage(
    userId: string,
    text: string
  ): Promise<string> {
    if (!text) {
      return "I didn't catch that. Could you repeat?";
    }

    logger.info(
      `Handling voice message from user ${userId}: ${text.substring(0, 50)}...`
    );

    // 1. Process message
    const processingResult = await this.processor.process(text);

    // 2. Get state
    const conversationState = await this.conversationService.getOrCreateState(userId);

    // 3. Aggregate context
    const context = await this.contextService.aggregateContext({
      userId,
      timeWindow: ContextTimeWindow.NOW,
      includeMemories: true,
      includePatterns: true,
    });

    // 4. Record turn
    await this.conversationService.addTurn({
      userId,
      threadId: conversationState.threadId,
      direction: MessageDirection.INBOUND,
      text: text,
      intent: processingResult.intent,
      entities: processingResult.entities,
    });

    // 5. Generate response
    const llmResponse = await this.generateResponseInternal(
      userId,
      text,
      processingResult,
      context,
      [] // History placeholder
    );

    const responseText = llmResponse.content;

    // 6. Record assistant turn
    await this.conversationService.addTurn({
      userId,
      threadId: conversationState.threadId,
      direction: MessageDirection.OUTBOUND,
      text: responseText,
      intent: processingResult.intent,
      entities: [],
    });

    // 7. Store in memory (conditionally)
    if (llmResponse.metadata?.memoryPotential) {
      await this.memoryService.createMemory({
        userId,
        type: MemoryType.CONVERSATION,
        content: `User (Voice): ${text}\nAssistant: ${responseText}`,
        importance: 2,
        tags: ["conversation", "voice", processingResult.intent],
        metadata: {
          custom: {
            intent: processingResult.intent,
            threadId: conversationState.threadId,
            source: "voice",
            complexity: llmResponse.metadata?.complexity
          }
        },
      });
    }

    return responseText;
  }

  /**
   * Handle an incoming message from a user
   */
  public async handleMessage(userId: string, text: string): Promise<void> {
    if (!text) {
      logger.warn(`Received empty message from user ${userId}`);
      return;
    }
    logger.info(
      `Handling message from user ${userId}: ${text.substring(0, 50)}...`
    );

    // 1. Process message to get intent and entities
    const processingResult = await this.processor.process(text);

    // 2. Get/Update conversation state
    const conversationState = await this.conversationService.getOrCreateState(userId);

    // 3. Aggregate relevant context
    const context = await this.contextService.aggregateContext({
      userId,
      timeWindow: ContextTimeWindow.NOW,
      includeMemories: true,
      includePatterns: true,
    });

    // 4. Record the user's turn
    await this.conversationService.addTurn({
      userId,
      threadId: conversationState.threadId,
      direction: MessageDirection.INBOUND,
      text: text,
      intent: processingResult.intent,
      entities: processingResult.entities,
    });

    // 5. Generate response based on intent and context
    const llmResponse = await this.generateResponseInternal(
      userId,
      text,
      processingResult,
      context,
      [] // History placeholder
    );

    const responseText = llmResponse.content;

    // 6. Send the response
    await this.smsService.sendMessage({
      userId,
      toNumber: await this.getUserPhoneNumber(userId),
      body: responseText,
      priority: MessagePriority.NORMAL,
    });

    // 7. Record the assistant's turn
    await this.conversationService.addTurn({
      userId,
      threadId: conversationState.threadId,
      direction: MessageDirection.OUTBOUND,
      text: responseText,
      intent: processingResult.intent,
      entities: [],
    });

    // 8. Store the interaction in memory if flagged as important
    if (llmResponse.metadata?.memoryPotential) {
      await this.memoryService.createMemory({
        userId,
        type: MemoryType.CONVERSATION,
        content: `User: ${text}\nAssistant: ${responseText}`,
        importance: 2,
        tags: ["conversation", processingResult.intent],
        metadata: {
          custom: {
            intent: processingResult.intent,
            threadId: conversationState.threadId,
            complexity: llmResponse.metadata?.complexity
          }
        },
      });
    }
  }

  /**
   * Generate a response to the user's message
   * Updated to return full LlmResponse structure
   */
  private async generateResponseInternal(
    userId: string,
    text: string,
    result: ProcessingResult,
    context: any,
    _history: ConversationTurn[]
  ): Promise<{ content: string; metadata?: { complexity?: string; memoryPotential?: boolean } }> {
    logger.debug(`Generating response for: ${text}`);

    switch (result.intent) {
      case Intent.HELP:
        return { content: this.processor.getHelpText() };

      case Intent.CONFIRM: {
        const state = await this.conversationService.getOrCreateState(userId);
        if (state.pendingToolApproval) {
          const { toolName, args } = state.pendingToolApproval;
          delete state.pendingToolApproval;
          await this.conversationService.updateState(state);
          return { content: await this.toolService.executeTool(toolName, args, { userId, approved: true }) };
        }
        return { content: "I'm not sure what you're confirming. I don't have any pending tool requests." };
      }

      case Intent.DENY: {
        const state = await this.conversationService.getOrCreateState(userId);
        if (state.pendingToolApproval) {
          delete state.pendingToolApproval;
          await this.conversationService.updateState(state);
          return { content: "Understood. I've cancelled the tool request." };
        }
        return { content: "Okay." };
      }

      case Intent.REMIND: {
        const task = result.entities.find((e) => e.type === "task")?.value;
        const time = result.entities.find((e) => e.type === "time")?.value;

        if (task && time) {
          let dueAt = new Date(Date.now() + 60 * 60 * 1000); // Default 1 hour

          const minutesMatch = time.match(/in (\d+) minute/);
          if (minutesMatch?.[1]) {
            dueAt = new Date(Date.now() + parseInt(minutesMatch[1]) * 60 * 1000);
          }

          await this.reminderService.createReminder({
            userId,
            title: task,
            dueAt: dueAt,
            isRecurring: false
          });

          return { content: `Got it! I'll remind you to "${task}" at ${dueAt.toLocaleTimeString()}.` };
        } else if (task) {
          return { content: `I'll remind you to "${task}". What time should I set the reminder for?` };
        }
        return { content: "What would you like me to remind you about?" };
      }

      case Intent.LOG:
        return { content: "I've logged that for you. Keep up the good work!" };

      case Intent.GOAL: {
        const title = result.entities.find(e => e.type === "task" || e.type === "value")?.value;
        if (title) {
          const goal = await this.goalService.createGoal({
            userId,
            title,
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
          });
          return { content: `Goal set: "${goal.title}". Good luck!` };
        }
        return { content: "What goal would you like to set?" };
      }

      case Intent.GOAL_LOG:
        return { content: "Progress logged. Keep it up!" };

      case Intent.SLEEP_LOG: {
        const hoursMatch = text.match(/(\d+) hours?/);
        const hours = (hoursMatch?.[1]) ? parseInt(hoursMatch[1]) : 8;

        await this.sleepService.logSleep({
          userId,
          startTime: new Date(Date.now() - hours * 60 * 60 * 1000),
          endTime: new Date(),
          quality: 75,
          source: 'VOICE'
        });
        return { content: `Sleep logged: ${hours} hours. Rest is important!` };
      }

      case Intent.WORKOUT_LOG: {
        const durationMatch = text.match(/(\d+) (minutes?|mins?)/);
        const duration = (durationMatch?.[1]) ? parseInt(durationMatch[1]) : 30;

        await this.workoutService.logWorkout({
          userId,
          activityType: 'WORKOUT',
          durationMins: duration,
          notes: text
        });
        return { content: `Great job! Logged a ${duration} minute workout.` };
      }

      case Intent.MEDITATE: {
        const prompt = this.mindfulnessService.getPrompt();
        return { content: `Here is a mindfulness prompt for you:\n\n"${prompt}"` };
      }

      case Intent.STATUS: {
        const primaryActivity = context.summary?.primaryActivity;
        let response = "Here is your current status:\n";
        if (primaryActivity) {
          response += `- Activity: ${primaryActivity}\n`;
        }
        response += `- Active Goals: ${context.summary?.activeGoals || 0}\n`;
        response += `- Key Insights: ${context.summary?.keyInsights?.length || 0} patterns detected.`;
        return { content: response };
      }

      case Intent.WEB_SEARCH: {
        let query = result.entities.find(e => e.type === "query" || e.type === "value")?.value;
        if (!query) {
          query = result.text.replace(/^\/search\s+/i, "").replace(/search for\s+/i, "").replace(/who is\s+/i, "").replace(/what is\s+/i, "").trim();
        }
        return { content: await this.executeToolSafely(userId, "web_search", { query }) };
      }

      case Intent.CALCULATE: {
        let expression = result.entities.find(e => e.type === "value")?.value;
        if (!expression) {
          expression = result.text.replace(/^\/calc\s+/i, "").replace(/^calculate\s+/i, "").replace(/^solve\s+/i, "").trim();
        }
        return { content: await this.executeToolSafely(userId, "calculator", { expression }) };
      }

      case Intent.RUN_SCRIPT: {
        let code = result.entities.find(e => e.type === "code" || e.type === "value")?.value;
        if (!code) {
          code = result.text.replace(/^\/run\s+/i, "").replace(/^run script\s+/i, "").trim();
        }
        return { content: await this.executeToolSafely(userId, "script_execution", { code }) };
      }

      case Intent.VISION_QUERY: {
        const query = result.text;
        return { content: await this.executeToolSafely(userId, "vision_query", { query, userId }) };
      }

      case Intent.CALENDAR_EVENT: {
        logger.debug("Calendar intent detected", { service: !!this.calendarService });

        const timeEntity = result.entities.find(e => e.type === "time");
        const timeStr = timeEntity?.value;

        if (timeStr) {
          const startTime = new Date(Date.now() + 60 * 60 * 1000);
          const hoursMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
          if (hoursMatch && hoursMatch[1]) {
            let hours = parseInt(hoursMatch[1]);
            const minutes = hoursMatch[2] ? parseInt(hoursMatch[2]) : 0;
            const meridian = hoursMatch[3]?.toLowerCase();

            if (meridian === 'pm' && hours < 12) { hours += 12; }
            if (meridian === 'am' && hours === 12) { hours = 0; }

            const now = new Date();
            startTime.setHours(hours, minutes, 0, 0);
            if (startTime < now) {
              startTime.setDate(startTime.getDate() + 1);
            }
          }

          let title = text
            .replace(/^schedule\s+/i, "")
            .replace(/\s+for\s+.*$/i, "")
            .replace(timeStr, "")
            .trim();

          if (!title || title.length < 3) { title = "New Event"; }

          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

          await this.calendarService.createEvent({
            userId,
            title,
            startTime,
            endTime
          });

          return { content: `Scheduled "${title}" for ${startTime.toLocaleString()}.` };
        }

        return { content: "I can help with calendar events. When would you like to schedule the event?" };
      }

      default: {
        const settings = await this.settingsService.getSettings(userId);
        const provider = settings.llmProvider;
        const model = settings.llmModel || 'auto';

        let apiKey: string | undefined;
        if (provider !== 'ollama') {
          const keys = await this.billingService.getApiKeys(userId);
          const keyData = keys.find(k => k.provider === provider);
          if (keyData?.isConfigured) {
            apiKey = (await this.billingService.getDecryptedKey(userId, provider)) || undefined;
          }
        }

        if (!apiKey && provider !== 'ollama') {
          return { content: "I'm not sure how to help with that. Please check your settings." };
        }

        try {
          const response = await this.llmService.generateResponse(
            text,
            `You are AGENT, an advanced AI system.
            
            CORE IDENTITY:
            - Name: AGENT
            - Architecture: React (Frontend), Node.js (Backend), PostgreSQL (Database), Anthropic Claude (Intelligence).
            - Role: Technical, capable, and efficient assistant.
            - Vibe: Terminal/Cyberpunk aesthetic. Cool, direct, and slightly technical tone.
            
            CAPABILITIES:
            - Tools: Web Search, Calculator, Script Execution (Sandbox), Vision (Image Analysis), Calendar, Goals, Health Logging.
            - System Integration: You run on the user's Linux machine.
            - Memory: You have long-term memory access (conversations, patterns).
            - Proactivity: You can suggest actions or run tools autonomously if appropriate.
            
            RULES:
            - User Name: Address the user by name if known (or "Operator" if unknown), avoid "User".
            - Formatting: Use Markdown extensively (bold keys, code blocks).
            - Brevity: Be concise. No fluff.
            - Knowledge: If asked about yourself, describe your architecture.
            `,
            provider,
            model,
            apiKey
          );

          // Ensure metadata is correctly typed or fallback to undefined
          return {
            content: response.content,
            metadata: {
              complexity: response.metadata?.complexity,
              memoryPotential: response.metadata?.memoryPotential
            }
          };
        } catch (error) {
          logger.error("LLM generation failed", { error });
          return { content: "I'm having trouble connecting to my brain right now. Please try again later." };
        }
      }
    }
  }

  /**
   * Safe execution wrapper for tools handling consent
   */
  private async executeToolSafely(userId: string, toolName: string, args: any): Promise<string> {
    try {
      return await this.toolService.executeTool(toolName, args, { userId });
    } catch (error: any) {
      if (error.message.includes("requires usage approval")) {
        const state = await this.conversationService.getOrCreateState(userId);
        state.pendingToolApproval = { toolName, args };
        await this.conversationService.updateState(state);
        return `The tool '${toolName}' requires your permission to run. Do you approve?`;
      }
      throw error;
    }
  }

  /**
   * Get user's phone number
   */
  private async getUserPhoneNumber(userId: string): Promise<string> {
    const result = await (this.smsService as any).db.query(
      "SELECT phone_number FROM users WHERE id = $1",
      [userId]
    );
    return result.rows[0]?.phone_number;
  }
}
