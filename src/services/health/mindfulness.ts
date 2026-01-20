// import { logger } from "../../utils/logger.js";

export class MindfulnessService {
    private prompts = [
        "Take a deep breath. Inhale for 4 seconds, hold for 7, exhale for 8.",
        "Focus on your surroundings. Name 5 things you can see, 4 you can feel, 3 you can hear.",
        "Scan your body from head to toe. Release tension where you find it.",
        "Think of three things you are grateful for today."
    ];

    public getPrompt(): string {
        const index = Math.floor(Math.random() * this.prompts.length);
        const prompt = this.prompts[index];
        return prompt || "Take a moment to breathe.";
    }
}
