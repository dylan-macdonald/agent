import { Router } from "express";
import { BillingService } from "../../services/billing.js";

export function createBillingRouter(billingService: BillingService): Router {
  const router = Router();

  // Get all API keys for a user (masked)
  router.get("/:userId/keys", async (req, res) => {
    try {
      const keys = await billingService.getApiKeys(req.params.userId);
      res.json({ keys });
    } catch (err) {
      console.error("Error fetching API keys:", err);
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  // Save/update an API key
  router.post("/:userId/keys", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;

      if (!provider || !apiKey) {
        res.status(400).json({ error: "Provider and apiKey are required" });
        return;
      }

      const validProviders = ['anthropic', 'openai', 'twilio', 'elevenlabs', 'picovoice', 'exa'];
      if (!validProviders.includes(provider)) {
        res.status(400).json({ error: "Invalid provider" });
        return;
      }

      await billingService.saveApiKey(req.params.userId, provider, apiKey);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving API key:", err);
      res.status(500).json({ error: "Failed to save API key" });
    }
  });

  // Delete an API key
  router.delete("/:userId/keys/:provider", async (req, res) => {
    try {
      await billingService.deleteApiKey(req.params.userId, req.params.provider);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting API key:", err);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // Get balances for all configured providers
  router.get("/:userId/balances", async (req, res) => {
    try {
      const balances = await billingService.getBalances(req.params.userId);
      res.json({ balances });
    } catch (err) {
      console.error("Error fetching balances:", err);
      res.status(500).json({ error: "Failed to fetch balances" });
    }
  });

  // Refresh balance for a specific provider
  router.post("/:userId/balances/:provider/refresh", async (req, res) => {
    try {
      const balance = await billingService.refreshBalance(
        req.params.userId,
        req.params.provider
      );
      res.json({ balance });
    } catch (err) {
      console.error("Error refreshing balance:", err);
      res.status(500).json({ error: "Failed to refresh balance" });
    }
  });

  return router;
}
