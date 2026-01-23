/**
 * Autonomous Agent Service
 *
 * The "brain" that thinks about the user's life independently.
 * Runs periodically to analyze patterns, generate insights, create tasks,
 * and surface forgotten desires.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { CalendarService } from './calendar.js';
import { GoalService, Goal } from './goal.js';
import { ReminderService } from './reminder.js';
import { SleepService, WorkoutService } from './health/service.js';
import { MemoryService } from './memory.js';
import { PatternService } from './pattern.js';
import { SettingsService } from './settings.js';
import { BillingService } from './billing.js';
import { SmsService } from './sms.js';
import { SocketService } from './socket.js';
import { MessagePriority } from '../types/sms.js';

interface AgentInsight {
    type: 'task_suggestion' | 'reminder_suggestion' | 'pattern_observation' |
          'goal_nudge' | 'forgotten_desire' | 'health_insight' | 'recommendation';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    actionable?: {
        type: 'create_task' | 'create_reminder' | 'create_goal' | 'send_message';
        payload: any;
    };
}

interface ThinkingContext {
    userId: string;
    userName?: string;
    currentTime: Date;
    dayOfWeek: string;
    // Life data
    upcomingEvents: any[];
    activeGoals: any[];
    recentReminders: any[];
    // Health patterns
    sleepPatterns: any[];
    workoutPatterns: any[];
    avgSleepHours?: number;
    workoutFrequency?: string;
    // Memory & desires
    memories: any[];
    desires: any[];
    interests: any[];
    pastGoals: any[];
    // Patterns
    behaviorPatterns: any[];
}

export class AutonomousAgentService {
    private thinkingInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    // Think every 4 hours by default
    private thinkingIntervalMs = 4 * 60 * 60 * 1000;

    constructor(
        private db: Pool,
        private calendarService: CalendarService,
        private goalService: GoalService,
        private reminderService: ReminderService,
        private sleepService: SleepService,
        private workoutService: WorkoutService,
        private memoryService: MemoryService,
        private patternService: PatternService,
        private settingsService: SettingsService,
        private billingService: BillingService,
        private smsService: SmsService,
        private socketService: SocketService
    ) {}

    /**
     * Start the autonomous thinking loop
     */
    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        logger.info('Starting Autonomous Agent Loop...');

        // Run immediately on start, then every interval
        void this.runThinkingCycle();

        this.thinkingInterval = setInterval(() => {
            void this.runThinkingCycle();
        }, this.thinkingIntervalMs);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.thinkingInterval) {
            clearInterval(this.thinkingInterval);
            this.thinkingInterval = null;
        }
        logger.info('Autonomous Agent Loop stopped');
    }

    /**
     * Main thinking cycle - runs for each user
     */
    private async runThinkingCycle(): Promise<void> {
        logger.info('Running autonomous thinking cycle...');

        try {
            const result = await this.db.query('SELECT id FROM users');
            const users = result.rows;

            for (const user of users) {
                try {
                    await this.thinkAboutUser(user.id);
                } catch (error) {
                    logger.error(`Error thinking about user ${user.id}`, { error });
                }
            }
        } catch (error) {
            logger.error('Error in thinking cycle', { error });
        }
    }

    /**
     * Deep thinking about a specific user's life
     */
    private async thinkAboutUser(userId: string): Promise<void> {
        logger.info(`Autonomous thinking for user ${userId}`);

        const apiKey = await this.billingService.getDecryptedKey(userId, 'anthropic');
        if (!apiKey) {
            logger.debug(`No API key for user ${userId}, skipping autonomous thinking`);
            return;
        }

        // Gather comprehensive context
        const context = await this.gatherThinkingContext(userId);

        // Generate insights using LLM
        const insights = await this.generateInsights(context, apiKey);

        // Act on insights
        await this.actOnInsights(userId, insights, context);
    }

    /**
     * Gather all context about a user for deep thinking
     */
    private async gatherThinkingContext(userId: string): Promise<ThinkingContext> {
        const settings = await this.settingsService.getSettings(userId);
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Upcoming events (next 7 days)
        const upcomingEvents = await this.calendarService.getEvents(userId, {
            startDate: now,
            endDate: weekFromNow
        });

        // All goals (including completed for pattern analysis)
        const allGoals = await this.goalService.getGoals(userId);
        const activeGoals = allGoals.filter(g => g.status === 'IN_PROGRESS');
        const pastGoals = allGoals.filter(g => g.status === 'COMPLETED' || g.status === 'ABANDONED');

        // Recent reminders
        const reminders = await this.reminderService.getReminders(userId);
        const recentReminders = reminders.slice(0, 20);

        // Health patterns (30 days)
        const sleepPatterns = await this.sleepService.getSleepLogs(userId, 30);
        const workoutPatterns = await this.workoutService.getWorkouts(userId, 30);

        // Calculate averages
        let avgSleepHours: number | undefined;
        if (sleepPatterns.length > 0) {
            const totalHours = sleepPatterns.reduce((sum, log) => {
                const start = new Date(log.startTime);
                const end = new Date(log.endTime);
                return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            }, 0);
            avgSleepHours = Math.round((totalHours / sleepPatterns.length) * 10) / 10;
        }

        // Workout frequency
        let workoutFrequency: string | undefined;
        if (workoutPatterns.length > 0) {
            const perWeek = (workoutPatterns.length / 30) * 7;
            workoutFrequency = `${perWeek.toFixed(1)} times per week`;
        }

        // Get memories - including desires and interests
        let memories: any[] = [];
        let desires: any[] = [];
        let interests: any[] = [];

        try {
            memories = await this.memoryService.getMemories(userId, { limit: 50 });

            // Filter for desires and interests
            desires = memories.filter(m =>
                m.type === 'desire' ||
                m.content.toLowerCase().includes('want to') ||
                m.content.toLowerCase().includes('wish') ||
                m.content.toLowerCase().includes('would like') ||
                m.content.toLowerCase().includes('someday') ||
                m.content.toLowerCase().includes('bucket list')
            );

            interests = memories.filter(m =>
                m.type === 'interest' ||
                m.content.toLowerCase().includes('interested in') ||
                m.content.toLowerCase().includes('love') ||
                m.content.toLowerCase().includes('enjoy') ||
                m.content.toLowerCase().includes('hobby')
            );
        } catch {
            // Memory retrieval optional
        }

        // Behavior patterns
        let behaviorPatterns: any[] = [];
        try {
            behaviorPatterns = await this.patternService.getPatterns(userId);
        } catch {
            // Pattern retrieval optional
        }

        return {
            userId,
            userName: settings.username || undefined,
            currentTime: now,
            dayOfWeek: daysOfWeek[now.getDay()] || 'Unknown',
            upcomingEvents,
            activeGoals,
            recentReminders,
            sleepPatterns,
            workoutPatterns,
            avgSleepHours,
            workoutFrequency,
            memories,
            desires,
            interests,
            pastGoals,
            behaviorPatterns
        };
    }

    /**
     * Use LLM to generate insights from context
     */
    private async generateInsights(context: ThinkingContext, apiKey: string): Promise<AgentInsight[]> {
        try {
            const anthropic = new Anthropic({ apiKey });

            const systemPrompt = `You are an autonomous AI agent that thinks deeply about your user's life.
You have access to their full context: calendar, goals, health patterns, memories, desires, and interests.

Your job is to:
1. Notice patterns they might not see
2. Remember things they've forgotten they wanted to do
3. Suggest tasks and reminders proactively
4. Nudge them towards their goals
5. Surface health insights
6. Make life recommendations based on their stated interests and desires

Be genuinely helpful - like a thoughtful friend who really knows them.
Don't be annoying or over-suggest. Quality over quantity.
Focus on HIGH IMPACT insights that will meaningfully improve their life.

Respond with a JSON array of insights. Each insight should have:
- type: one of "task_suggestion", "reminder_suggestion", "pattern_observation", "goal_nudge", "forgotten_desire", "health_insight", "recommendation"
- priority: "low", "medium", or "high"
- title: short title (under 50 chars)
- description: detailed explanation (1-3 sentences)
- actionable: optional object with { type: "create_task" | "create_reminder" | "create_goal" | "send_message", payload: {...} }

Generate 0-5 insights. Only include truly valuable ones. Return empty array if nothing important.`;

            const userPrompt = this.buildThinkingPrompt(context);

            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-5-20250929', // Use Sonnet for deeper thinking
                max_tokens: 2000,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            });

            if (response.content?.[0]?.type === 'text') {
                const text = response.content[0].text;
                // Extract JSON from response
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }

            return [];
        } catch (error) {
            logger.error('Failed to generate insights', { error });
            return [];
        }
    }

    private buildThinkingPrompt(ctx: ThinkingContext): string {
        let prompt = `Think deeply about ${ctx.userName || 'this user'}'s life.\n\n`;
        prompt += `Current time: ${ctx.currentTime.toLocaleString()}\n`;
        prompt += `Day: ${ctx.dayOfWeek}\n\n`;

        // Upcoming schedule
        prompt += `=== UPCOMING SCHEDULE (next 7 days) ===\n`;
        if (ctx.upcomingEvents.length > 0) {
            ctx.upcomingEvents.forEach(e => {
                const date = new Date(e.startTime);
                prompt += `- ${e.title} on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}\n`;
            });
        } else {
            prompt += `No scheduled events\n`;
        }
        prompt += '\n';

        // Active goals
        prompt += `=== ACTIVE GOALS ===\n`;
        if (ctx.activeGoals.length > 0) {
            ctx.activeGoals.forEach(g => {
                const deadline = g.deadline ? ` (deadline: ${new Date(g.deadline).toLocaleDateString()})` : '';
                prompt += `- ${g.title}: ${g.progress || 0}% complete${deadline}\n`;
                if (g.description) prompt += `  Description: ${g.description}\n`;
            });
        } else {
            prompt += `No active goals\n`;
        }
        prompt += '\n';

        // Past goals (for pattern analysis)
        if (ctx.pastGoals.length > 0) {
            prompt += `=== PAST GOALS (for context) ===\n`;
            ctx.pastGoals.slice(0, 10).forEach(g => {
                prompt += `- ${g.title} [${g.status}]\n`;
            });
            prompt += '\n';
        }

        // Health patterns
        prompt += `=== HEALTH PATTERNS ===\n`;
        if (ctx.avgSleepHours) {
            prompt += `Average sleep: ${ctx.avgSleepHours} hours/night\n`;
        }
        if (ctx.workoutFrequency) {
            prompt += `Workout frequency: ${ctx.workoutFrequency}\n`;
        }
        if (ctx.workoutPatterns.length > 0) {
            const workoutDays = ctx.workoutPatterns.slice(0, 7).map(w =>
                new Date(w.date).toLocaleDateString('en-US', { weekday: 'short' })
            );
            prompt += `Recent workout days: ${workoutDays.join(', ')}\n`;
        }
        prompt += '\n';

        // Desires and interests (THE KEY TO TRUE AUTONOMY)
        if (ctx.desires.length > 0) {
            prompt += `=== THINGS THEY'VE SAID THEY WANT TO DO ===\n`;
            ctx.desires.forEach(d => {
                prompt += `- "${d.content}" (mentioned: ${new Date(d.createdAt).toLocaleDateString()})\n`;
            });
            prompt += '\n';
        }

        if (ctx.interests.length > 0) {
            prompt += `=== INTERESTS & HOBBIES ===\n`;
            ctx.interests.forEach(i => {
                prompt += `- "${i.content}"\n`;
            });
            prompt += '\n';
        }

        // General memories
        if (ctx.memories.length > 0) {
            prompt += `=== MEMORIES & FACTS ABOUT THEM ===\n`;
            const otherMemories = ctx.memories
                .filter(m => !ctx.desires.includes(m) && !ctx.interests.includes(m))
                .slice(0, 15);
            otherMemories.forEach(m => {
                prompt += `- ${m.content}\n`;
            });
            prompt += '\n';
        }

        // Behavior patterns
        if (ctx.behaviorPatterns.length > 0) {
            prompt += `=== OBSERVED BEHAVIOR PATTERNS ===\n`;
            ctx.behaviorPatterns.slice(0, 10).forEach(p => {
                prompt += `- ${p.pattern}\n`;
            });
            prompt += '\n';
        }

        // Recent reminders (to avoid duplicates)
        if (ctx.recentReminders.length > 0) {
            prompt += `=== RECENT REMINDERS (avoid duplicating) ===\n`;
            ctx.recentReminders.slice(0, 10).forEach(r => {
                prompt += `- ${r.title}\n`;
            });
            prompt += '\n';
        }

        prompt += `\nBased on all this context, generate insights that will meaningfully help this person.
Focus on:
1. Forgotten desires they mentioned but never acted on
2. Patterns that could become habits (or break bad ones)
3. Goal progress that needs attention
4. Health optimizations based on their data
5. Proactive task suggestions based on their schedule and interests

Return JSON array of insights.`;

        return prompt;
    }

    /**
     * Act on generated insights
     */
    private async actOnInsights(userId: string, insights: AgentInsight[], context: ThinkingContext): Promise<void> {
        if (insights.length === 0) {
            logger.debug(`No insights generated for user ${userId}`);
            return;
        }

        logger.info(`Acting on ${insights.length} insights for user ${userId}`);

        // Store insights for dashboard
        await this.storeInsights(userId, insights);

        // Notify user via WebSocket
        this.socketService.notifySystemEvent(userId, 'new_insights', {
            count: insights.length,
            insights: insights.map(i => ({ type: i.type, title: i.title, priority: i.priority }))
        });

        // Handle high-priority actionable insights
        for (const insight of insights) {
            if (insight.priority === 'high' && insight.actionable) {
                await this.executeAction(userId, insight, context);
            }
        }

        // Send summary of insights via SMS if there are medium+ priority ones
        const importantInsights = insights.filter(i => i.priority !== 'low');
        if (importantInsights.length > 0) {
            await this.sendInsightsSummary(userId, importantInsights, context);
        }
    }

    /**
     * Store insights in database for dashboard viewing
     */
    private async storeInsights(userId: string, insights: AgentInsight[]): Promise<void> {
        try {
            // Create table if not exists
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS agent_insights (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id),
                    type VARCHAR(50) NOT NULL,
                    priority VARCHAR(20) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL,
                    actionable JSONB,
                    acted_on BOOLEAN DEFAULT FALSE,
                    dismissed BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            for (const insight of insights) {
                await this.db.query(`
                    INSERT INTO agent_insights (user_id, type, priority, title, description, actionable)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [userId, insight.type, insight.priority, insight.title, insight.description,
                    insight.actionable ? JSON.stringify(insight.actionable) : null]);
            }
        } catch (error) {
            logger.error('Failed to store insights', { error });
        }
    }

    /**
     * Execute an actionable insight
     */
    private async executeAction(userId: string, insight: AgentInsight, context: ThinkingContext): Promise<void> {
        if (!insight.actionable) return;

        try {
            switch (insight.actionable.type) {
                case 'create_reminder':
                    await this.reminderService.createReminder({
                        userId,
                        title: insight.actionable.payload.title || insight.title,
                        dueAt: new Date(insight.actionable.payload.dueAt || Date.now() + 24 * 60 * 60 * 1000),
                        description: insight.description
                    });
                    logger.info(`Created reminder from insight: ${insight.title}`);
                    break;

                case 'create_goal':
                    await this.goalService.createGoal({
                        userId,
                        title: insight.actionable.payload.title || insight.title,
                        description: insight.description,
                        targetDate: insight.actionable.payload.targetDate,
                        category: insight.actionable.payload.category || 'personal'
                    });
                    logger.info(`Created goal from insight: ${insight.title}`);
                    break;

                case 'send_message':
                    // Direct message will be handled by sendInsightsSummary
                    break;
            }
        } catch (error) {
            logger.error(`Failed to execute action for insight: ${insight.title}`, { error });
        }
    }

    /**
     * Send a summary of important insights via SMS
     */
    private async sendInsightsSummary(userId: string, insights: AgentInsight[], context: ThinkingContext): Promise<void> {
        try {
            const settings = await this.settingsService.getSettings(userId);
            if (!settings.phoneNumber) return;

            // Don't spam - only send if there's something really important
            const highPriority = insights.filter(i => i.priority === 'high');
            if (highPriority.length === 0) return;

            let message = `Hey${context.userName ? ` ${context.userName}` : ''}! I was thinking about your goals and noticed:\n\n`;

            highPriority.slice(0, 2).forEach(insight => {
                message += `• ${insight.title}\n`;
            });

            message += `\nCheck your dashboard for more details.`;

            await this.smsService.sendMessage({
                userId,
                toNumber: settings.phoneNumber,
                body: message,
                priority: MessagePriority.LOW // Don't interrupt, this is proactive
            });

        } catch (error) {
            logger.error('Failed to send insights summary', { error });
        }
    }

    /**
     * Get pending insights for a user (for dashboard)
     */
    public async getInsights(userId: string, limit = 10): Promise<AgentInsight[]> {
        try {
            const result = await this.db.query(`
                SELECT type, priority, title, description, actionable, created_at
                FROM agent_insights
                WHERE user_id = $1 AND dismissed = FALSE
                ORDER BY
                    CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                    created_at DESC
                LIMIT $2
            `, [userId, limit]);

            return result.rows.map(row => ({
                type: row.type,
                priority: row.priority,
                title: row.title,
                description: row.description,
                actionable: row.actionable
            }));
        } catch {
            return [];
        }
    }

    /**
     * Dismiss an insight
     */
    public async dismissInsight(userId: string, insightId: string): Promise<void> {
        await this.db.query(`
            UPDATE agent_insights SET dismissed = TRUE WHERE id = $1 AND user_id = $2
        `, [insightId, userId]);
    }

    /**
     * Trigger immediate thinking (for testing or on-demand)
     */
    public async thinkNow(userId: string): Promise<AgentInsight[]> {
        const apiKey = await this.billingService.getDecryptedKey(userId, 'anthropic');
        if (!apiKey) return [];

        const context = await this.gatherThinkingContext(userId);
        const insights = await this.generateInsights(context, apiKey);
        await this.actOnInsights(userId, insights, context);

        return insights;
    }
}
