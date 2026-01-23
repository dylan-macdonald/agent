import { Redis } from "ioredis";
import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { Tool, ToolCategory } from "../../types/tool.js";
import { logger } from "../../utils/logger.js";

export class WebSearchTool implements Tool {
    name = "web_search";
    description = "Search the web for information using Claude's built-in web search";
    category = ToolCategory.INFORMATION;

    private redis: Redis;
    private billingService?: any;

    constructor(redis: Redis, billingService?: any) {
        this.redis = redis;
        this.billingService = billingService;
    }

    async execute(args: { query: string }, context?: any): Promise<string> {
        const { query } = args;
        if (!query) {
            return "Please provide a search query.";
        }

        // Check cache
        const cacheKey = this.getCacheKey(query);
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                logger.info(`Web search cache hit for: ${query}`);
                return cached;
            }
        } catch (error) {
            logger.warn("Redis cache read failed", { error });
        }

        // Get Anthropic API key
        let apiKey: string | null = null;
        if (this.billingService && context?.userId) {
            try {
                apiKey = await this.billingService.getDecryptedKey(context.userId, 'anthropic');
            } catch (err) {
                logger.warn("Failed to fetch user API key for web search", { error: err });
            }
        }

        if (!apiKey) {
            return "Web search requires an Anthropic API key. Please add one in settings.";
        }

        const result = await this.performSearch(query, apiKey);

        // Cache for 24 hours
        try {
            await this.redis.setex(cacheKey, 86400, result);
        } catch (error) {
            logger.warn("Redis cache write failed", { error });
        }

        return result;
    }

    private getCacheKey(query: string): string {
        const hash = createHash("md5").update(query.trim().toLowerCase()).digest("hex");
        return `web_search:${hash}`;
    }

    private async performSearch(query: string, apiKey: string): Promise<string> {
        try {
            const anthropic = new Anthropic({ apiKey });

            // Use Claude with web search capability
            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: `Search the web for: ${query}\n\nProvide a concise summary of the most relevant and recent information you find. Include sources with URLs when available.`
                }],
                // Enable web search (this is built into Claude)
                tools: [{
                    type: 'web_search_20250116' as any,
                    name: 'web_search',
                }]
            });

            // Extract text from response
            let result = '';
            for (const block of response.content) {
                if (block.type === 'text') {
                    result += block.text;
                }
            }

            if (!result) {
                return "I couldn't find any results for that query.";
            }

            return result;
        } catch (error) {
            logger.error("Web search failed", { error });
            return "Sorry, I encountered an error while searching the web.";
        }
    }
}
