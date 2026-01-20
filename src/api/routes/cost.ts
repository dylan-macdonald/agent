import { Router } from "express";

import { CostService } from "../../services/cost.js";

export function createCostRouter(costService: CostService): Router {
  const router = Router();

  router.get("/summary", async (req, res) => {
    const days = parseInt(req.query.days as string) ?? 30;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const summary = await costService.getSummary(start, end);
    res.json(summary);
  });

  router.get("/daily", async (req, res) => {
    const days = parseInt(req.query.days as string) || 7;
    const daily = await costService.getDailyUsage(days);
    res.json({ daily });
  });

  return router;
}
