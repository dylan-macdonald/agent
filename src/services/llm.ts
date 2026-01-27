
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

export interface LlmResponse {
    content: string;
    model: string;
    provider: string;
    metadata?: {
        complexity?: string | undefined;
        memoryPotential?: boolean | undefined;
        // Desire/Interest detection for autonomous agent
        containsDesire?: boolean | undefined;
        containsInterest?: boolean | undefined;
        containsGoal?: boolean | undefined;
        extractedDesire?: string | undefined;
        extractedInterest?: string | undefined;
        extractedGoal?: string | undefined;
        // Suggested tools for the responding model
        suggestedTools?: string[] | undefined;
    };
}

interface RouteDecision {
    complexity: 'SIMPLE' | 'MEDIUM' | 'HARD';
    memory_potential: boolean;
    model_suggestion?: string;
    // Desire/Interest detection
    contains_desire?: boolean;
    contains_interest?: boolean;
    contains_goal?: boolean;
    extracted_desire?: string;
    extracted_interest?: string;
    extracted_goal?: string;
    // Tool suggestions for the responding model
    suggested_tools?: string[];
}

export class LlmService {
    constructor() { }

    /**
     * List available models (Anthropic Only)
     */
    public async listModels(provider: string, _apiKey?: string): Promise<string[]> {
        if (provider === 'anthropic') {
            return [
                'claude-haiku-4-5-20251001', // The Judge / Fast
                'claude-sonnet-4-5-20250929', // The Workhorse
                'claude-opus-4-5-20251101'   // The Expert
            ];
        }
        return [];
    }

    /**
     * Smart Route: Uses Haiku to decide complexity, memory importance, AND tool suggestions
     * Returns a JSON decision object
     */
    private async smartRoute(prompt: string, apiKey: string): Promise<RouteDecision> {
        try {
            const anthropic = new Anthropic({ apiKey });
            const response = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 500,
                messages: [
                    {
                        role: 'user',
                        content: `Analyze this user message for routing, intent extraction, AND tool suggestions.

1. COMPLEXITY: "SIMPLE" | "MEDIUM" | "HARD"
2. MEMORY_POTENTIAL: true if contains personal info, preferences, important decisions
3. CONTAINS_DESIRE: true if user expresses wanting to do something
4. CONTAINS_INTEREST: true if user expresses interest/enjoyment
5. CONTAINS_GOAL: true if user expresses a goal/intention
6. SUGGESTED_TOOLS: Array of tools that would help answer this query

AVAILABLE TOOLS:
- "web_search": For current events, real-time info, facts that may have changed
- "calculator": For math, unit conversions, date calculations
- "script_execution": For data transformation, code execution, complex logic
- "vision_query": For analyzing images, screenshots, visual content
- "calendar": For scheduling, events, availability checking
- "goals": For goal tracking, progress updates
- "health": For health logging (sleep, workouts, etc.)
- "self_modify": For agent self-improvement requests

Respond in JSON:
{
  "complexity": "SIMPLE" | "MEDIUM" | "HARD",
  "memory_potential": boolean,
  "contains_desire": boolean,
  "contains_interest": boolean,
  "contains_goal": boolean,
  "extracted_desire": "string or null",
  "extracted_interest": "string or null",
  "extracted_goal": "string or null",
  "suggested_tools": ["tool1", "tool2"] or []
}

Message: "${prompt.substring(0, 1500)}"`
                    }
                ]
            });

            // Parse valid JSON
            let decision: RouteDecision = {
                complexity: 'SIMPLE',
                memory_potential: false,
                contains_desire: false,
                contains_interest: false,
                contains_goal: false,
                suggested_tools: []
            };

            if (response.content?.[0]?.type === 'text') {
                try {
                    // Extract JSON if wrapped in markdown
                    const text = response.content[0].text;
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        decision = {
                            complexity: parsed.complexity || 'SIMPLE',
                            memory_potential: parsed.memory_potential || false,
                            contains_desire: parsed.contains_desire || false,
                            contains_interest: parsed.contains_interest || false,
                            contains_goal: parsed.contains_goal || false,
                            extracted_desire: parsed.extracted_desire || undefined,
                            extracted_interest: parsed.extracted_interest || undefined,
                            extracted_goal: parsed.extracted_goal || undefined,
                            suggested_tools: Array.isArray(parsed.suggested_tools) ? parsed.suggested_tools : []
                        };
                    } else {
                        // Fallback parsing
                        const upper = text.toUpperCase();
                        decision.complexity = upper.includes('HARD') ? 'HARD' : upper.includes('MEDIUM') ? 'MEDIUM' : 'SIMPLE';
                        decision.memory_potential = upper.includes('YES') || upper.includes('TRUE');
                    }
                } catch (e) {
                    logger.warn("Smart Router JSON parse failed", { text: response.content[0].text });
                }
            }

            // Log desire/interest detection
            if (decision.contains_desire || decision.contains_interest || decision.contains_goal) {
                logger.info(`[Smart Router] Detected intent:`, {
                    desire: decision.extracted_desire,
                    interest: decision.extracted_interest,
                    goal: decision.extracted_goal
                });
            }

            // Log tool suggestions
            if (decision.suggested_tools && decision.suggested_tools.length > 0) {
                logger.info(`[Smart Router] Suggested tools: ${decision.suggested_tools.join(', ')}`);
            }

            logger.info(`[Smart Router] Decision:`, decision as unknown as Record<string, unknown>);
            return decision;

        } catch (error) {
            logger.warn("Smart reasoning failed, failing back to default", { error });
            return { complexity: 'SIMPLE', memory_potential: false, suggested_tools: [] };
        }
    }

    private getModelFromComplexity(complexity: string): string {
        if (complexity === 'HARD') return 'claude-opus-4-5-20251101';
        if (complexity === 'MEDIUM') return 'claude-sonnet-4-5-20250929';
        return 'claude-haiku-4-5-20251001';
    }

    /**
     * Generate response with Anthropic + Native Web Search
     */
    public async generateResponse(
        prompt: string,
        systemPrompt: string,
        _provider: 'anthropic' | 'openai' | 'ollama',
        model: string | undefined, // If empty, uses Smart Router
        apiKey?: string
    ): Promise<LlmResponse> {
        try {
            if (!apiKey) throw new Error("Anthropic API key is missing");

            let selectedModel = model;
            let routeDecision: RouteDecision | undefined;

            // 1. Smart Routing (if auto or undefined)
            if (!selectedModel || selectedModel === 'auto') {
                routeDecision = await this.smartRoute(prompt, apiKey);
                selectedModel = this.getModelFromComplexity(routeDecision.complexity);
            }

            logger.info(`[LlmService] Using model: ${selectedModel}`);

            const anthropic = new Anthropic({ apiKey });

            // 2. Define Tools
            const tools: any[] = [{
                name: "web_search",
                type: "web_search_20250305" as any
            }];

            // 3. Call API
            const response = await anthropic.messages.create({
                model: selectedModel,
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: prompt }
                ],
                tools: tools as any
            });

            // 4. Parse Content
            let content = '';
            if (response.content) {
                for (const block of response.content) {
                    if (block.type === 'text') {
                        content += block.text + "\n";
                    } else if (block.type === 'tool_use') {
                        content += `[Web Search Tool Invocation: ${block.name}]\n`;
                    }
                }
            }

            return {
                content: content.trim(),
                model: selectedModel,
                provider: 'anthropic',
                metadata: {
                    complexity: routeDecision?.complexity ?? undefined,
                    memoryPotential: routeDecision?.memory_potential ?? undefined,
                    // Desire/Interest/Goal detection for autonomous agent
                    containsDesire: routeDecision?.contains_desire ?? undefined,
                    containsInterest: routeDecision?.contains_interest ?? undefined,
                    containsGoal: routeDecision?.contains_goal ?? undefined,
                    extractedDesire: routeDecision?.extracted_desire ?? undefined,
                    extractedInterest: routeDecision?.extracted_interest ?? undefined,
                    extractedGoal: routeDecision?.extracted_goal ?? undefined,
                    // Tool suggestions from the smart router
                    suggestedTools: routeDecision?.suggested_tools ?? undefined
                }
            };

        } catch (error: any) {
            logger.error("Error generating response", { error });
            throw error;
        }
    }

    /**
     * Generate a proactive briefing/message (for check-ins, alarms, etc.)
     * Uses Haiku for speed since these are frequent and should be snappy
     */
    public async generateBriefing(
        context: BriefingContext,
        apiKey: string
    ): Promise<string> {
        try {
            const anthropic = new Anthropic({ apiKey });

            const systemPrompt = `You are a personal AI assistant named Agent. You're proactively reaching out to your user.

Your personality:
- Warm but not overly effusive
- Concise and action-oriented
- Knows the user personally (use their name if provided)
- Speaks naturally, like a helpful friend/manager
- For SMS: Keep under 160 chars if possible, max 300
- For Voice: Speak naturally, can be slightly longer

IMPORTANT: This is a PROACTIVE message - you're initiating contact, not responding to the user.`;

            const userPrompt = this.buildBriefingPrompt(context);

            const response = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001', // Fast for proactive messages
                max_tokens: 500,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            });

            if (response.content?.[0]?.type === 'text') {
                return response.content[0].text.trim();
            }

            return this.getFallbackMessage(context.type);
        } catch (error) {
            logger.error("Failed to generate briefing", { error });
            return this.getFallbackMessage(context.type);
        }
    }

    private buildBriefingPrompt(ctx: BriefingContext): string {
        let prompt = `Generate a ${ctx.type} message for ${ctx.userName || 'the user'}.\n\n`;
        prompt += `Current time: ${new Date().toLocaleString()}\n`;
        prompt += `Delivery method: ${ctx.deliveryMethod}\n\n`;

        if (ctx.events && ctx.events.length > 0) {
            prompt += `TODAY'S SCHEDULE:\n`;
            ctx.events.forEach(e => {
                prompt += `- ${e.title} at ${e.time}${e.location ? ` (${e.location})` : ''}\n`;
            });
            prompt += '\n';
        } else {
            prompt += `TODAY'S SCHEDULE: Clear - no events\n\n`;
        }

        if (ctx.reminders && ctx.reminders.length > 0) {
            prompt += `PENDING REMINDERS:\n`;
            ctx.reminders.forEach(r => {
                prompt += `- ${r.title}${r.isOverdue ? ' (OVERDUE)' : ''}\n`;
            });
            prompt += '\n';
        }

        if (ctx.goals && ctx.goals.length > 0) {
            prompt += `ACTIVE GOALS:\n`;
            ctx.goals.forEach(g => {
                prompt += `- ${g.title}: ${g.progress}% complete\n`;
            });
            prompt += '\n';
        }

        if (ctx.healthInsights) {
            prompt += `HEALTH INSIGHTS:\n`;
            if (ctx.healthInsights.avgSleep) {
                prompt += `- Average sleep this week: ${ctx.healthInsights.avgSleep} hours\n`;
            }
            if (ctx.healthInsights.workoutsThisWeek !== undefined) {
                prompt += `- Workouts this week: ${ctx.healthInsights.workoutsThisWeek}\n`;
            }
            if (ctx.healthInsights.lastWorkout) {
                prompt += `- Last workout: ${ctx.healthInsights.lastWorkout}\n`;
            }
            prompt += '\n';
        }

        if (ctx.recentMemories && ctx.recentMemories.length > 0) {
            prompt += `THINGS TO REMEMBER ABOUT USER:\n`;
            ctx.recentMemories.forEach(m => {
                prompt += `- ${m}\n`;
            });
            prompt += '\n';
        }

        // Type-specific instructions
        if (ctx.type === 'morning_wakeup') {
            prompt += `\nGenerate a wake-up call message. Be energizing but gentle. Mention the most important thing on their schedule if any. Keep it brief for voice delivery.`;
        } else if (ctx.type === 'morning_briefing') {
            prompt += `\nGenerate a morning briefing. Summarize their day, highlight priorities, and set a positive tone. End with a question or call to action.`;
        } else if (ctx.type === 'evening_reflection') {
            prompt += `\nGenerate an evening reflection prompt. Ask about their day, celebrate wins, and gently prompt them to wind down. Be warm and supportive.`;
        }

        return prompt;
    }

    private getFallbackMessage(type: BriefingType): string {
        switch (type) {
            case 'morning_wakeup':
                return "Good morning! Time to start your day.";
            case 'morning_briefing':
                return "Good morning! Ready to tackle the day?";
            case 'evening_reflection':
                return "Good evening! How did your day go?";
            default:
                return "Hello! Just checking in.";
        }
    }

    /**
     * Break down a goal into actionable milestones/sub-tasks
     * Uses Haiku for speed - goal breakdown should be fast
     */
    public async breakdownGoal(
        goal: { title: string; description?: string; targetDate?: Date },
        apiKey: string
    ): Promise<GoalMilestone[]> {
        try {
            const anthropic = new Anthropic({ apiKey });

            const daysUntilTarget = goal.targetDate
                ? Math.ceil((goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 30;

            const prompt = `Break down this goal into 3-5 actionable milestones that will help achieve it.

GOAL: ${goal.title}
${goal.description ? `DESCRIPTION: ${goal.description}` : ''}
TIMEFRAME: ${daysUntilTarget} days

For each milestone, provide:
- title: Short, action-oriented title (e.g., "Research options", "Complete first draft")
- description: Brief explanation of what this involves
- order: Sequential order (1, 2, 3, etc.)
- estimatedEffort: "small" (< 1 hour), "medium" (1-4 hours), or "large" (> 4 hours)

Respond in JSON format:
{
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "order": number,
      "estimatedEffort": "small" | "medium" | "large"
    }
  ]
}

Make milestones specific and achievable. First milestone should be something that can be started immediately.`;

            const response = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            });

            if (response.content?.[0]?.type === 'text') {
                const text = response.content[0].text;
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.milestones && Array.isArray(parsed.milestones)) {
                        return parsed.milestones.map((m: any, idx: number) => ({
                            id: `milestone_${idx + 1}`,
                            title: m.title || `Step ${idx + 1}`,
                            description: m.description || '',
                            order: m.order || idx + 1,
                            estimatedEffort: m.estimatedEffort || 'medium',
                            completed: false,
                            completedAt: undefined
                        }));
                    }
                }
            }

            // Fallback: generate simple milestones
            return this.generateDefaultMilestones(goal.title);
        } catch (error) {
            logger.error("Failed to breakdown goal", { error, goal: goal.title });
            return this.generateDefaultMilestones(goal.title);
        }
    }

    private generateDefaultMilestones(goalTitle: string): GoalMilestone[] {
        return [
            {
                id: 'milestone_1',
                title: 'Research and plan',
                description: `Research what's needed to ${goalTitle.toLowerCase()}`,
                order: 1,
                estimatedEffort: 'small',
                completed: false
            },
            {
                id: 'milestone_2',
                title: 'Take first action',
                description: 'Complete the first concrete step toward this goal',
                order: 2,
                estimatedEffort: 'medium',
                completed: false
            },
            {
                id: 'milestone_3',
                title: 'Review and adjust',
                description: 'Assess progress and adjust approach if needed',
                order: 3,
                estimatedEffort: 'small',
                completed: false
            }
        ];
    }
}

// Goal milestone type for multi-step planning
export interface GoalMilestone {
    id: string;
    title: string;
    description: string;
    order: number;
    estimatedEffort: 'small' | 'medium' | 'large';
    completed: boolean;
    completedAt?: Date;
}

// Types for briefing generation
export type BriefingType = 'morning_wakeup' | 'morning_briefing' | 'evening_reflection' | 'reminder' | 'custom';

export interface BriefingContext {
    type: BriefingType;
    userName?: string;
    deliveryMethod: 'sms' | 'voice' | 'push';
    events?: Array<{ title: string; time: string; location?: string }>;
    reminders?: Array<{ title: string; isOverdue: boolean }>;
    goals?: Array<{ title: string; progress: number }>;
    healthInsights?: {
        avgSleep?: number;
        workoutsThisWeek?: number;
        lastWorkout?: string;
    };
    recentMemories?: string[];
}
