import { Redis } from "ioredis";
import { Tool, ToolCategory, ToolPermission, PrivacySettings } from "../../types/tool.js";
import { logger } from "../../utils/logger.js";

interface ToolRateLimit {
    maxRequestsPerDay: number;
}

export class ToolService {
    private tools: Map<string, Tool> = new Map();
    private redis: Redis;

    // Default permissions: Scripts require approval, others enabled
    private defaultPermissions: PrivacySettings = {
        "script_execution": { enabled: true, requiresApproval: true },
        "vision_query": { enabled: true, requiresApproval: false },
        "web_search": { enabled: true, requiresApproval: false },
        "calculator": { enabled: true, requiresApproval: false },
    };

    // Tool specific rate limits
    private rateLimits: Record<string, ToolRateLimit> = {
        "web_search": { maxRequestsPerDay: 50 },
        "vision_query": { maxRequestsPerDay: 20 },
    };

    constructor(redis: Redis) {
        this.redis = redis;
    }

    public registerTool(tool: Tool): void {
        if (this.tools.has(tool.name)) {
            logger.warn(`Tool ${tool.name} is already registered. Overwriting.`);
        }
        this.tools.set(tool.name, tool);
        logger.info(`Registered tool: ${tool.name} [${tool.category}]`);
    }

    public getTool(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    public getToolsByCategory(category: ToolCategory): Tool[] {
        return Array.from(this.tools.values()).filter(
            (tool) => tool.category === category
        );
    }

    public getAllTools(): Tool[] {
        return Array.from(this.tools.values());
    }

    public async executeTool(
        name: string,
        args: any,
        context?: any
    ): Promise<string> {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }

        // Check privacy settings/permissions
        const perm: ToolPermission = this.defaultPermissions[name] || { enabled: true, requiresApproval: false };

        if (!perm.enabled) {
            throw new Error(`Tool ${name} is disabled by privacy settings.`);
        }

        const isSystem = context?.isSystem === true;

        if (perm.requiresApproval && !isSystem) {
            // If explicit approval is passed in context, allow it.
            if (context?.approved !== true) {
                // In a real flow, this would trigger a request to the user.
                throw new Error(`Tool ${name} requires usage approval.`);
            }
        }

        // Rate Limiting
        const userId = context?.userId;
        if (userId && !isSystem) {
            await this.checkRateLimit(name, userId);
        }

        logger.info(`Executing tool: ${name} with args: ${JSON.stringify(args)}`);
        try {
            return await tool.execute(args, context as Record<string, unknown>);
        } catch (error) {
            logger.error(`Error executing tool ${name}`, { error });
            throw error;
        }
    }

    private async checkRateLimit(toolName: string, userId: string): Promise<void> {
        const limitConfig = this.rateLimits[toolName];
        if (!limitConfig) {
            return; // No limit for this tool
        }

        const today = new Date().toISOString().split('T')[0];
        const key = `tool_limit:${toolName}:${userId}:${today}`;

        try {
            const currentUsage = await this.redis.incr(key);

            // Set expiry for 24 hours if new key
            if (currentUsage === 1) {
                await this.redis.expire(key, 86400);
            }

            if (currentUsage > limitConfig.maxRequestsPerDay) {
                logger.warn(`Rate limit exceeded for tool ${toolName} user ${userId} (${currentUsage}/${limitConfig.maxRequestsPerDay})`);
                throw new Error(`Daily limit exceeded for tool: ${toolName}. Please try again tomorrow.`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes("Daily limit exceeded")) {
                throw error;
            }
            // Fail open on Redis errors to avoid blocking functionality
            logger.error("Rate limit check failed", { error });
        }
    }
}
