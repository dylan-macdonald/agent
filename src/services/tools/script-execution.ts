
import vm from "vm";

import { Tool, ToolCategory } from "../../types/tool.js";
import { logger } from "../../utils/logger.js";

export class ScriptExecutionTool implements Tool {
    name = "script_execution";
    description = "Execute safe JavaScript code to transform data or perform calculations. NO network or file access.";
    category = ToolCategory.CALCULATION;

    async execute(args: { code: string; data?: any }, _context?: Record<string, unknown>): Promise<string> {
        const { code, data } = args;

        if (!code) {
            return "Please provide the code to execute.";
        }

        try {
            // Create a restricted context
            const sandbox = {
                data: data || {},
                result: null,
                console: {
                    log: (..._args: any[]) => { /* separate capture if needed, or ignore */ },
                    error: (..._args: any[]) => { /* separate capture */ },
                },
                // Allow basic standard objects
                Object, Array, Number, String, Boolean, Date, Math, JSON, RegExp,
            };

            const context = vm.createContext(sandbox);

            // Execute with timeout to prevent infinite loops
            const script = new vm.Script(code);
            const executionResult = script.runInContext(context, {
                timeout: 1000, // 1 second timeout
                displayErrors: true,
            });

            // If sandbox.result is set, use it. Otherwise use the execution return value.
            const finalResult = sandbox.result !== null && sandbox.result !== undefined
                ? sandbox.result
                : executionResult;

            return this.formatResult(finalResult);

        } catch (error: any) {
            logger.error("Script execution failed", { error: error.message, code });
            return `Script execution error: ${error.message}`;
        }
    }

    private formatResult(result: any): string {
        if (result === undefined) {return "Script executed successfully (no return value).";}
        if (typeof result === "object") {
            try {
                return JSON.stringify(result, null, 2);
            } catch (e) {
                return "[Object] (Circular or non-serializable)";
            }
        }
        return String(result);
    }
}
