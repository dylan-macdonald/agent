import Anthropic from "@anthropic-ai/sdk";
import { Tool, ToolCategory } from "../../types/tool.js";
import { logger } from "../../utils/logger.js";
import { SocketService } from "../socket.js";

export class VisionTool implements Tool {
    name = "vision_query";
    description = "Analyze the user's current screen content to answer questions or provide descriptions using Claude's vision.";
    category = ToolCategory.VISION;

    constructor(
        private socketService: SocketService,
        private billingService?: any
    ) { }

    async execute(args: { query: string; userId?: string; mode?: "ocr" | "analyze" }, context?: Record<string, unknown>): Promise<string> {
        const { query, userId, mode } = args;

        if (!userId) {
            return "I need a user ID to know which screen to look at.";
        }

        logger.info(`Vision tool executing for user ${userId} with query: "${query}" (mode: ${mode})`);

        try {
            // 1. Get Anthropic API key
            let apiKey: string | null = null;
            if (this.billingService && userId) {
                try {
                    apiKey = await this.billingService.getDecryptedKey(userId, 'anthropic');
                } catch (err) {
                    logger.warn("Failed to fetch user API key for vision", { error: err });
                }
            }

            if (!apiKey) {
                return "Vision analysis requires an Anthropic API key. Please add one in settings.";
            }

            // 2. Request screenshot
            const imageBuffer = await this.socketService.requestScreenshot(userId);

            if (!imageBuffer) {
                return "I couldn't capture the screen. Is the desktop agent running and connected?";
            }

            if (imageBuffer.length === 0) {
                return "Screen capture failed on the device.";
            }

            // 3. Save Screenshot (History)
            await this.saveScreenshot(imageBuffer, userId);

            // 4. Analyze with Claude Vision
            return await this.analyzeWithClaude(imageBuffer, query, apiKey, mode);

        } catch (error: any) {
            logger.error("Vision tool failed", { error: error.message });
            return `Vision analysis failed: ${error.message}`;
        }
    }

    private async saveScreenshot(buffer: Buffer, userId: string): Promise<void> {
        try {
            const fs = await import("fs/promises");
            const path = await import("path");

            const today = new Date().toISOString().split('T')[0] || 'unknown';
            const timestamp = Date.now();
            const filename = `${timestamp}_${userId}.png`;
            const dir = path.join(process.cwd(), ".agent", "screenshots", today);

            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(path.join(dir, filename), buffer);
            logger.debug(`Saved screenshot to ${path.join(dir, filename)}`);
        } catch (error) {
            logger.error("Failed to save screenshot history", { error });
        }
    }

    private async analyzeWithClaude(
        imageBuffer: Buffer,
        query: string,
        apiKey: string,
        mode?: "ocr" | "analyze"
    ): Promise<string> {
        try {
            const anthropic = new Anthropic({ apiKey });
            const base64Image = imageBuffer.toString('base64');

            let prompt = query || "Describe what's on this screen.";
            if (mode === "ocr" || query.toLowerCase().includes("ocr") || query.toLowerCase().includes("text")) {
                prompt = "Extract all visible text from this image verbatim. Preserve layout where possible.\n\n" + prompt;
            }

            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/png',
                                data: base64Image
                            }
                        },
                        {
                            type: 'text',
                            text: prompt
                        }
                    ]
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
                return "I captured the screen, but couldn't analyze it.";
            }

            return result;
        } catch (e: any) {
            logger.error("Claude Vision API call failed", { error: e.message });
            return "I captured the screen, but failed to analyze it with the AI service.";
        }
    }
}
