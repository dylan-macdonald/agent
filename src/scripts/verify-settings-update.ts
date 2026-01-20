
import "dotenv/config";
import { Pool } from "pg";
import Redis from "ioredis";
import { SettingsService } from "../services/settings.js";
import { BillingService } from "../services/billing.js";
import { getConfig } from "../config/index.js";

async function verifySettings() {
    console.log("Starting settings verification...");

    const config = getConfig();
    console.log("DEBUG: process.env.DATABASE_URL:", process.env.DATABASE_URL ? "Defined" : "Undefined");
    console.log("DEBUG: config.database.url starts with:", config.database.url.substring(0, 25));

    const pool = new Pool({
        connectionString: config.database.url,
        ssl: config.database.ssl,
        max: config.database.maxConnections
    });
    const redis = new Redis(config.redis.url);

    const settingsService = new SettingsService(pool, redis);
    const billingService = new BillingService(pool);

    // Insert test user to satisfy FK constraint
    console.log("0. Creating test user...");
    const userResult = await pool.query(
        "INSERT INTO users (phone_number, phone_verified) VALUES ($1, $2) RETURNING id",
        ['+19998887777', true]
    );
    const userId = userResult.rows[0].id;
    console.log(`Using userId: ${userId}`);

    try {
        // 1. Create/Get Default Settings
        console.log("1. Fetching default settings...");
        let settings = await settingsService.getSettings(userId);
        if (!settings.llmProvider || settings.llmProvider !== 'anthropic') {
            throw new Error("Default llmProvider is incorrect");
        }
        console.log("✅ Default settings correct");

        // 2. Update Settings
        console.log("2. Updating settings (llmProvider, username, phone)...");
        settings = await settingsService.updateSettings(userId, {
            llmProvider: 'openai',
            username: 'Test User',
            phoneNumber: '+15550001111'
        });

        if (settings.llmProvider !== 'openai') throw new Error("Failed to update llmProvider");
        if (settings.username !== 'Test User') throw new Error("Failed to update username");
        if (settings.phoneNumber !== '+15550001111') throw new Error("Failed to update phoneNumber");
        console.log("✅ Settings update successful");

        // 3. Save API Key
        console.log("3. Saving 'exa' API key...");
        await billingService.saveApiKey(userId, 'exa', 'test-exa-key-123');

        // 4. Retrieve API Keys
        console.log("4. Retrieving API keys...");
        const keys = await billingService.getApiKeys(userId);
        const exaKey = keys.find(k => k.provider === 'exa');

        if (!exaKey) throw new Error("Exa key not found");
        if (exaKey.maskedKey !== 'test...-123') throw new Error(`Exa key masking failed: ${exaKey.maskedKey}`);
        console.log("✅ API key saved and retrieved (masked) successfully");

        console.log("🎉 All validations passed!");
    } catch (err) {
        console.error("❌ Verification failed:", err);
        process.exit(1);
    } finally {
        // Cleanup
        await pool.query("DELETE FROM user_api_keys WHERE user_id = $1", [userId]);
        await pool.query("DELETE FROM user_settings WHERE user_id = $1", [userId]);
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        await pool.end();
        await redis.quit();
    }
}

verifySettings();
