
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

export interface LlmResponse {
    content: string;
    model: string;
    provider: string;
    metadata?: {
        complexity?: string | undefined;
        memoryPotential?: boolean | undefined;
    };
}

interface RouteDecision {
    complexity: 'SIMPLE' | 'MEDIUM' | 'HARD';
    memory_potential: boolean;
    model_suggestion?: string;
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
     * Smart Route: Uses Haiku to decide complexity AND memory importance
     * Returns a JSON decision object
     */
    private async smartRoute(prompt: string, apiKey: string): Promise<RouteDecision> {
        try {
            const anthropic = new Anthropic({ apiKey });
            const response = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 150,
                messages: [
                    {
                        role: 'user',
                        content: `Analyze this user request.
                        
                        1. COMPLEXITY: "SIMPLE" (formatting, greetings, basic facts), "MEDIUM" (logic, creative writing, multi-step), or "HARD" (complex code, math, deep reasoning).
                        2. MEMORY_POTENTIAL: Should this interaction be saved to long-term memory? YES if it contains personal info, user preferences, specific instructions, or important decisions. NO if it is casual chat, simple questions, or ephemeral requests.

                        Respond in JSON format:
                        {
                            "complexity": "SIMPLE" | "MEDIUM" | "HARD",
                            "memory_potential": boolean
                        }

                        Request: "${prompt.substring(0, 1000)}..."`
                    }
                ]
            });

            // Parse valid JSON
            let decision: RouteDecision = { complexity: 'SIMPLE', memory_potential: false };

            if (response.content?.[0]?.type === 'text') {
                try {
                    // Extract JSON if wrapped in markdown
                    const text = response.content[0].text;
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        decision = JSON.parse(jsonMatch[0]);
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

            logger.info(`[Smart Router] Decision:`, decision as unknown as Record<string, unknown>);
            return decision;

        } catch (error) {
            logger.warn("Smart reasoning failed, failing back to default", { error });
            return { complexity: 'SIMPLE', memory_potential: false };
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
                    memoryPotential: routeDecision?.memory_potential ?? undefined
                }
            };

        } catch (error: any) {
            logger.error("Error generating response", { error });
            throw error;
        }
    }
}
