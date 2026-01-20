import { evaluate } from "mathjs";

import { Tool, ToolCategory } from "../../types/tool.js";
import { logger } from "../../utils/logger.js";

export class CalculatorTool implements Tool {
    name = "calculator";
    description = "Evaluate mathematical expressions";
    category = ToolCategory.CALCULATION;

    async execute(args: { expression: string }, _context?: any): Promise<string> {
        const { expression } = args;
        if (!expression) {
            return "Please provide a mathematical expression.";
        }

        try {
            // valueOf is needed because mathjs might return an object
            const result = evaluate(expression, this.createScope());

            // Format result
            if (typeof result === 'object' && result !== null && 'toString' in result) {
                return result.toString();
            }
            return `${result}`;
        } catch (error) {
            logger.error(`Calculation failed for "${expression}"`, { error });
            return "I couldn't calculate that. Please check the expression syntax.";
        }
    }

    private createScope() {
        return {
            daysBetween: (start: string, end: string) => {
                const diff = new Date(end).getTime() - new Date(start).getTime();
                return Math.ceil(diff / (1000 * 60 * 60 * 24));
            },
            addDays: (date: string, days: number) => {
                const d = new Date(date);
                d.setDate(d.getDate() + days);
                return d.toISOString().split('T')[0];
            },
            today: () => new Date().toISOString().split('T')[0],
            now: () => new Date().toISOString()
        };
    }
}
