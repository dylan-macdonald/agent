import { Redis } from "ioredis";
import { createHash } from "crypto";
import { Tool, ToolCategory } from "../../types/tool.js";
import { logger } from "../../utils/logger.js";

interface SearchResult {
    title: string;
    url: string;
    snippet?: string;
    score?: number;
}

export class WebSearchTool implements Tool {
    name = "web_search";
    description = "Search the web for information";
    category = ToolCategory.INFORMATION;

    private apiKey: string;
    private redis: Redis;

    constructor(redis: Redis) {
        this.redis = redis;
        this.apiKey = process.env.EXA_API_KEY || "";
        if (!this.apiKey) {
            logger.warn("EXA_API_KEY not found. Web search will use mock results.");
        }
    }

    async execute(args: { query: string }, _context?: any): Promise<string> {
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

        let result: string;
        if (!this.apiKey) {
            result = this.mockSearch(query);
        } else {
            result = await this.performSearch(query);
        }

        // Set cache (24 hours)
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

    private async performSearch(query: string): Promise<string> {
        try {
            const response = await fetch("https://api.exa.ai/search", {
                method: "POST",
                headers: {
                    "x-api-key": this.apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query,
                    numResults: 3,
                    useAutoprompt: true,
                }),
            });

            if (!response.ok) {
                throw new Error(`Exa API error: ${response.statusText}`);
            }

            const data = (await response.json()) as { results: SearchResult[] };
            const results: SearchResult[] = data.results || [];

            if (results.length === 0) {
                return "I couldn't find any results for that.";
            }

            return this.formatResults(results);
        } catch (error) {
            logger.error("Web search failed", { error });
            return "Sorry, I encountered an error while searching the web.";
        }
    }

    private formatResults(results: SearchResult[]): string {
        let output = "Here is what I found:\n\n";
        results.forEach((r, i) => {
            output += `${i + 1}. ${r.title}\n   ${r.url}\n`;
            if (r.snippet) {
                output += `   "${r.snippet}"\n`; // Truncate if too long?
            }
            output += "\n";
        });
        return output.trim();
    }

    private mockSearch(query: string): string {
        return `[MOCK SEARCH] I found some simulated results for "${query}":\n\n` +
            `1. Results for ${query} - Wikipedia\n   https://en.wikipedia.org/wiki/${encodeURIComponent(query)}\n   Overview of ${query}...\n\n` +
            `2. Latest News about ${query}\n   https://news.example.com/${encodeURIComponent(query)}\n   Recent updates regarding ${query}.`;
    }
}
