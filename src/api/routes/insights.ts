import { Router, Request, Response } from "express";
import { AutonomousAgentService } from "../../services/autonomous-agent.js";
import { logger } from "../../utils/logger.js";

export function createInsightsRouter(
    autonomousAgent: AutonomousAgentService
): Router {
    const router = Router();

    /**
     * GET /api/insights/:userId
     * Get pending insights for a user
     */
    router.get("/:userId", async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;
            const limit = parseInt(req.query.limit as string) || 10;

            const insights = await autonomousAgent.getInsights(userId, limit);

            return res.json({ insights });
        } catch (error) {
            logger.error("Failed to get insights", { error });
            return res.status(500).json({ error: "Failed to get insights" });
        }
    });

    /**
     * POST /api/insights/:userId/think
     * Trigger immediate thinking for a user
     */
    router.post("/:userId/think", async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;

            logger.info(`Triggering immediate thinking for ${userId}`);
            const insights = await autonomousAgent.thinkNow(userId);

            return res.json({
                message: "Thinking complete",
                insightsGenerated: insights.length,
                insights
            });
        } catch (error) {
            logger.error("Failed to trigger thinking", { error });
            return res.status(500).json({ error: "Failed to trigger thinking" });
        }
    });

    /**
     * POST /api/insights/:userId/dismiss/:insightId
     * Dismiss an insight
     */
    router.post("/:userId/dismiss/:insightId", async (req: Request, res: Response) => {
        try {
            const { userId, insightId } = req.params;

            await autonomousAgent.dismissInsight(userId, insightId);

            return res.json({ success: true });
        } catch (error) {
            logger.error("Failed to dismiss insight", { error });
            return res.status(500).json({ error: "Failed to dismiss insight" });
        }
    });

    return router;
}
