
import { Router, Request, Response } from 'express';
import { LlmService } from '../../services/llm.js';
import { logger } from '../../utils/logger.js';
import { BillingService } from '../../services/billing.js';

export const createLlmRoutes = (llmService: LlmService, _billingService: BillingService): Router => {
    const router = Router();

    router.get('/:userId/models/:provider', async (req: Request, res: Response) => {
        const { provider } = req.params as { userId: string, provider: string };

        try {
            let apiKey: string | undefined;
            // Fetch API key logic if needed in future, currently LlmService handles it internally 
            // or doesn't need it for listing hardcoded models.
            // If we need to fetch models from provider dynamically (e.g. models listing API), we can fetch key here.

            const models = await llmService.listModels(provider, apiKey);
            res.json(models);
        } catch (error) {
            logger.error('Error fetching models', { error, provider });
            res.status(500).json({ error: 'Failed to fetch models' });
        }
    });

    return router;
};
