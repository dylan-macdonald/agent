export interface Tool {
    name: string;
    description: string;
    category: ToolCategory;
    execute(args: Record<string, unknown>, context?: Record<string, unknown>): Promise<string>;
}

export enum ToolCategory {
    INFORMATION = "information",
    CALCULATION = "calculation",
    SYSTEM = "system",
    VISION = "vision",
}

export interface ToolPermission {
    enabled: boolean;
    requiresApproval: boolean;
}

export interface PrivacySettings {
    [toolName: string]: ToolPermission;
}
