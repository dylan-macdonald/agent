
import { Tool, ToolCategory } from "../../types/tool.js";
import { logger } from "../../utils/logger.js";
import { SocketService } from "../socket.js";

export class VisionTool implements Tool {
    name = "vision_query";
    description = "Analyze the user's current screen content to answer questions or provide descriptions.";
    category = ToolCategory.VISION;

    constructor(private socketService: SocketService) { }

    async execute(args: { query: string; userId?: string; mode?: "ocr" | "analyze" }, _context?: Record<string, unknown>): Promise<string> {
        const { query, userId, mode } = args;

        if (!userId) {
            return "I need a user ID to know which screen to look at.";
        }

        logger.info(`Vision tool executing for user ${userId} with query: "${query}" (mode: ${mode})`);

        try {
            // 1. Request screenshot
            const imageBuffer = await this.socketService.requestScreenshot(userId);

            if (!imageBuffer) {
                return "I couldn't capture the screen. Is the desktop agent running and connected?";
            }

            if (imageBuffer.length === 0) {
                return "Screen capture failed on the device.";
            }

            // 2. Save Screenshot (History)
            await this.saveScreenshot(imageBuffer, userId);

            // 3. Process with OpenAI Vision (if key exists)
            const openAiKey = process.env.OPENAI_API_KEY;
            if (!openAiKey) {
                logger.warn("OPENAI_API_KEY missing. Returning mock vision response.");
                return `[MOCK VISION] I see your screen. You asked: "${query}". (Real vision requires OpenAI Key)`;
            }

            return this.analyzeWithOpenAI(imageBuffer, query, openAiKey as string, mode);

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
            const dir = path.join(process.cwd(), ".gemini", "screenshots", today);

            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(path.join(dir, filename), buffer);
            logger.debug(`Saved screenshot to ${path.join(dir, filename)}`);
        } catch (error) {
            logger.error("Failed to save screenshot history", { error });
        }
    }

    private async analyzeWithOpenAI(imageBuffer: Buffer, query: string, apiKey: string, mode?: "ocr" | "analyze"): Promise<string> {
        try {
            const base64Image = imageBuffer.toString('base64');
            const dataUrl = `data:image/png;base64,${base64Image}`;

            let systemPrompt = "You are a helpful assistant analyzing a screenshot.";
            if (mode === "ocr" || query.toLowerCase().includes("ocr") || query.toLowerCase().includes("text")) {
                systemPrompt += " Your task is to extract all visible text from the image verbatim. Preserve layout where possible.";
            }

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: query || "Describe what's on this screen." },
                                { type: "image_url", image_url: { url: dataUrl } }
                            ]
                        }
                    ],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API Error: ${response.status} ${errorText}`);
            }

            const result = await response.json() as { choices: { message: { content: string } }[] };
            const choices = result.choices;
            if (!choices || choices.length === 0 || !choices[0]) {
                return "I captured the screen, but the AI didn't provide a description.";
            }
            return choices[0].message.content;
        } catch (e: any) {
            logger.error("OpenAI Vision API call failed", { error: e.message });
            return "I captured the screen, but failed to analyze it with the AI service.";
        }
    }
}
