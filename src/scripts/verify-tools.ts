import { SocketService } from "../services/socket.js";
import { CalculatorTool } from "../services/tools/calculator.js";
import { ScriptExecutionTool } from "../services/tools/script-execution.js";
import { ToolService } from "../services/tools/tool-service.js";
import { VisionTool } from "../services/tools/vision.js";
import { WebSearchTool } from "../services/tools/web-search.js";
import { logger } from "../utils/logger.js";

// Mock Redis
class MockRedis {
    private storage: Map<string, string> = new Map();
    private expiry: Map<string, number> = new Map();

    async get(key: string) { return this.storage.get(key) || null; }
    async setex(key: string, ttl: number, value: string) {
        this.storage.set(key, value);
        this.expiry.set(key, Date.now() + ttl * 1000);
        return "OK";
    }
    async incr(key: string) {
        const val = parseInt(this.storage.get(key) || "0") + 1;
        this.storage.set(key, val.toString());
        return val;
    }
    async expire(_key: string, _ttl: number) { return 1; }
}

// Mock Socket Service
class MockSocketService extends SocketService {
    constructor() {
        super({} as any, {} as any, {} as any); // Mock dependencies
    }
    async requestScreenshot(userId: string): Promise<Buffer | null> {
        logger.info(`[MOCK] Requesting screenshot for ${userId}`);
        // Return a 1x1 png buffer
        return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    }
}

async function verify() {
    logger.info("Starting Tool Verification...");

    const mockRedis = new MockRedis() as any;
    const toolService = new ToolService(mockRedis);
    toolService.registerTool(new WebSearchTool(mockRedis));
    toolService.registerTool(new CalculatorTool());
    toolService.registerTool(new ScriptExecutionTool());

    const mockSocketService = new MockSocketService();
    toolService.registerTool(new VisionTool(mockSocketService));

    // Test Calculator
    logger.info("Testing Calculator...");
    const calcResult = await toolService.executeTool("calculator", { expression: "25 * 4" });
    logger.info(`Calculator Result (25 * 4): ${calcResult}`);
    if (calcResult === "100") {
        logger.info("✅ Calculator Verification Passed");
    } else {
        logger.error(`❌ Calculator Verification Failed: got ${calcResult}`);
    }

    // Test Calculator Units & Dates
    logger.info("Testing Calculator Units & Dates...");
    const unitResult = await toolService.executeTool("calculator", { expression: "10 cm to inch" });
    logger.info(`Unit Result (10 cm to inch): ${unitResult}`);

    // Test Custom Function
    const dateResult = await toolService.executeTool("calculator", { expression: "daysBetween('2025-01-01', '2025-01-10')" });
    logger.info(`Date Result (daysBetween): ${dateResult}`);
    if (dateResult === "9") {
        logger.info("✅ Date Verification Passed");
    } else {
        logger.error(`❌ Date Verification Failed: got ${dateResult}`);
    }

    // Test Web Search (Mock)
    logger.info("Testing Web Search (Mock)...");
    // Ensure no API key implies mock
    const searchResult = await toolService.executeTool("web_search", { query: "AI Agents" });
    logger.info(`Web Search Result: ${searchResult.substring(0, 100)}...`);
    if (searchResult.includes("[MOCK SEARCH]")) {
        logger.info("✅ Web Search (Mock) Verification Passed");
    } else {
        logger.warn("⚠️ Web Search did not return mock (might have API key or failure)");
    }


    // Test Script Execution
    logger.info("Testing Script Execution...");
    const scriptResult = await toolService.executeTool("script_execution", { code: "const x = 10; const y = 20; result = x * y;" }, { isSystem: true });
    logger.info(`Script Result (10 * 20): ${scriptResult}`);
    if (scriptResult === "200") {
        logger.info("✅ Script Execution Verification Passed");
    } else {
        logger.error(`❌ Script Execution Verification Failed: got ${scriptResult}`);
    }

    // Test Vision Tool
    logger.info("Testing Vision Tool...");
    const visionResult = await toolService.executeTool("vision_query", { query: "What is this?", userId: "test-user" });
    logger.info(`Vision Result: ${visionResult}`);
    if (visionResult.includes("[MOCK VISION]")) {
        logger.info("✅ Vision Tool Verification Passed");
    } else {
        logger.error(`❌ Vision Tool Verification Failed: ${visionResult}`);
    }

    logger.info("Verification Complete.");
}

verify().catch(console.error);
