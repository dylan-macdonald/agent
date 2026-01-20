/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { encrypt } from '../../security/encryption.js';
import { AssistantService } from '../../services/assistant.js';
import { CalendarService } from '../../services/calendar.js';
import { ContextService } from '../../services/context.js';
import { ConversationService } from '../../services/conversation.js';
import { GoalService } from '../../services/goal.js';
import { MindfulnessService } from '../../services/health/mindfulness.js';
import { SleepService, WorkoutService } from '../../services/health/service.js';
import { MemoryService } from '../../services/memory.js';
import { MessageProcessor } from '../../services/message-processor.js';
import { PatternService } from '../../services/pattern.js';
import { ReminderService } from '../../services/reminder.js';
import { SmsService } from '../../services/sms.js';
import { ToolService } from '../../services/tools/tool-service.js';
import { ToolCategory } from '../../types/tool.js';

// Mock DB Pool to allow verified execution without live DB
const mockQuery = vi.fn().mockImplementation(async (text: string) => {
    if (text.includes("COUNT(*)")) {
        return { rows: [{ total: '0' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
});
class MockPool {
    query(...args: any[]) { return mockQuery(...args); }
}

class MockRedis {
    async get(_key: string) { return null; }
    async setex(_key: string, _ttl: number, _value: string) { return "OK"; }
    async keys(_pattern: string) { return []; }
    async del(..._keys: string[]) { return 1; }
}

describe('Full System MVP Integration', () => {
    let assistant: AssistantService;
    let mockDb: any;
    let mockRedis: any;
    let smsService: SmsService;

    beforeEach(() => {
        mockDb = new MockPool();
        mockRedis = new MockRedis();
        mockQuery.mockReset();

        // Default Mock Responses with Smart Handling
        mockQuery.mockImplementation(async (text: string) => {
            if (text && typeof text === 'string') {
                if (text.includes("COUNT(*)")) {
                    return { rows: [{ total: '0' }], rowCount: 1 };
                }
                if (text.trim().toUpperCase().startsWith("INSERT") || text.includes("RETURNING")) {
                    return {
                        rows: [{
                            id: 'mock-id',
                            user_id: 'user-123',
                            created_at: new Date(),
                            updated_at: new Date(),
                            type: 'conversation',
                            content: encrypt('mock content'),
                            metadata: {},
                            // Context fields
                            category: 'test',
                            relevance_score: '0.5'
                        }],
                        rowCount: 1
                    };
                }
            }
            return { rows: [], rowCount: 0 };
        });

        // Instantiate ALL Real Services
        const processor = new MessageProcessor();
        const memory = new MemoryService(mockDb, mockRedis);
        const pattern = new PatternService(mockDb);
        const context = new ContextService(mockDb, memory, pattern);
        const conversation = new ConversationService(mockRedis);
        const tools = new ToolService(mockRedis);
        tools.registerTool({
            name: "calculator",
            description: "Perform mathematical calculations",
            category: ToolCategory.CALCULATION,


            execute: async ({ expression }) => {
                // Safe evaluation for test
                try {
                    return String(eval(expression as string));
                } catch (e) {
                    return "Error";
                }
            }
        });
        const calendar = new CalendarService(mockDb);
        const reminder = new ReminderService(mockDb);
        const goal = new GoalService(mockDb);
        const sleep = new SleepService(mockDb);
        const workout = new WorkoutService(mockDb);
        const mindfulness = new MindfulnessService();

        smsService = { sendSms: vi.fn() } as any;

        // Assembly
        assistant = new AssistantService(
            smsService,
            processor,
            context,
            memory,
            conversation,
            tools,
            calendar,
            reminder,
            goal,
            sleep,
            workout,
            mindfulness
        );
    });

    it('Scenario 1: Full Day Productivity Flow', async () => {
        const userId = 'user-123';

        // 1. Morning Check-in (Status)
        // -----------------------------------------------------
        let response = await assistant.handleVoiceMessage(userId, "Good morning, check in please");
        expect(response).toContain("Here is your current status");

        // 2. Schedule Meeting (Calendar)
        // -----------------------------------------------------
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: 'evt-1', title: 'Team Meeting', start_time: new Date() }],
            rowCount: 1
        }); // For INSERT

        response = await assistant.handleVoiceMessage(userId, "Schedule Team Meeting for 2pm today");
        expect(response).toContain("Scheduled");
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO events"), expect.anything());

        // 3. Set a Goal (Goals)
        // -----------------------------------------------------
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: 'goal-1', title: 'Complete MVP', target_date: new Date() }],
            rowCount: 1
        });

        response = await assistant.handleVoiceMessage(userId, "Set a goal to Complete MVP");
        expect(response).toContain("Goal set");

        // 4. Log Workout (Health)
        // -----------------------------------------------------
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: 'work-1', activity_type: 'WORKOUT', duration_mins: 45 }],
            rowCount: 1
        });

        response = await assistant.handleVoiceMessage(userId, "I just ran for 45 minutes");
        expect(response).toContain("Logged a 45 minute workout");

        // 5. Mindfulness (Health)
        // -----------------------------------------------------
        response = await assistant.handleVoiceMessage(userId, "I need to meditate");
        expect(response).toContain("mindfulness prompt");

        // 6. Sleep Log (Health)
        // -----------------------------------------------------
        mockQuery.mockResolvedValueOnce({
            rows: [{ id: 'sleep-1', duration_hours: 7 }],
            rowCount: 1
        });

        response = await assistant.handleVoiceMessage(userId, "I slept 7 hours last night");
        expect(response).toContain("Sleep logged: 7 hours");

        // 7. Math (Tools)
        // -----------------------------------------------------
        response = await assistant.handleVoiceMessage(userId, "Calculate 50 * 4");
        expect(response).toContain("200");
    });
});
