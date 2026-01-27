/**
 * Self-Modify Tool
 *
 * Allows the AI agent to propose modifications to its own codebase.
 * All modifications require SMS verification before execution.
 *
 * SECURITY: This is a highly sensitive tool. All modifications are:
 * 1. Stored temporarily as pending proposals
 * 2. Require SMS verification code to execute
 * 3. Logged for audit purposes
 * 4. Restricted to allowed file paths
 */

import { Redis } from "ioredis";
import { promises as fs } from "fs";
import path from "path";

import { Tool, ToolCategory } from "../../types/tool.js";
import { logger } from "../../utils/logger.js";
import { audit, AuditEventType } from "../../security/audit.js";

export interface SelfModifyRequest {
  filePath: string;
  description: string;
  oldContent?: string;
  newContent: string;
  modifyType: "replace" | "append" | "prepend" | "create";
}

export interface PendingModification {
  id: string;
  userId: string;
  request: SelfModifyRequest;
  verificationCode: string;
  createdAt: Date;
  expiresAt: Date;
  status: "pending" | "approved" | "rejected" | "expired";
}

export class SelfModifyTool implements Tool {
  name = "self_modify";
  description =
    "Propose modifications to the agent's own codebase. Requires SMS verification before execution.";
  category = ToolCategory.SYSTEM;

  private readonly CACHE_PREFIX = "self_modify:";
  private readonly PENDING_TTL = 15 * 60; // 15 minutes
  private readonly PROJECT_ROOT: string;

  // Allowed paths for self-modification (relative to project root)
  private readonly ALLOWED_PATHS = [
    "src/services/",
    "src/types/",
    "src/utils/",
    "src/api/",
    "src/integrations/",
    "src/config/",
    "notes/",
  ];

  // Explicitly forbidden paths
  private readonly FORBIDDEN_PATHS = [
    "src/security/",
    ".env",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    ".git/",
    "node_modules/",
  ];

  constructor(
    private redis: Redis,
    projectRoot?: string
  ) {
    this.PROJECT_ROOT = projectRoot || process.cwd();
  }

  async execute(
    args: {
      action: "propose" | "verify" | "status" | "cancel";
      filePath?: string;
      description?: string;
      oldContent?: string;
      newContent?: string;
      modifyType?: "replace" | "append" | "prepend" | "create";
      verificationCode?: string;
      proposalId?: string;
    },
    context?: Record<string, unknown>
  ): Promise<string> {
    const userId = context?.userId as string;

    if (!userId) {
      return "Error: User context required for self-modification.";
    }

    switch (args.action) {
      case "propose":
        return this.proposeModification(userId, args, context);

      case "verify":
        return this.verifyAndExecute(userId, args.verificationCode, args.proposalId);

      case "status":
        return this.getStatus(userId, args.proposalId);

      case "cancel":
        return this.cancelProposal(userId, args.proposalId);

      default:
        return `Unknown action: ${args.action}. Use: propose, verify, status, or cancel.`;
    }
  }

  /**
   * Propose a modification (does not execute yet)
   */
  private async proposeModification(
    userId: string,
    args: {
      filePath?: string;
      description?: string;
      oldContent?: string;
      newContent?: string;
      modifyType?: "replace" | "append" | "prepend" | "create";
    },
    context?: Record<string, unknown>
  ): Promise<string> {
    const { filePath, description, oldContent, newContent, modifyType } = args;

    if (!filePath) {
      return "Error: filePath is required for modification proposals.";
    }

    if (!description) {
      return "Error: description is required to explain the modification purpose.";
    }

    if (!newContent) {
      return "Error: newContent is required.";
    }

    // Validate file path
    const pathValidation = this.validateFilePath(filePath);
    if (!pathValidation.valid) {
      return `Error: ${pathValidation.reason}`;
    }

    // For replace type, oldContent is required
    if (modifyType === "replace" && !oldContent) {
      return "Error: oldContent is required for replace modifications.";
    }

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const proposalId = this.generateProposalId();

    const modification: PendingModification = {
      id: proposalId,
      userId,
      request: {
        filePath,
        description,
        oldContent,
        newContent,
        modifyType: modifyType || "replace",
      },
      verificationCode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.PENDING_TTL * 1000),
      status: "pending",
    };

    // Store in Redis
    const key = this.getCacheKey(userId, proposalId);
    await this.redis.setex(key, this.PENDING_TTL, JSON.stringify(modification));

    // Also store proposal ID for user (for listing)
    const userProposalsKey = `${this.CACHE_PREFIX}user:${userId}:proposals`;
    await this.redis.sadd(userProposalsKey, proposalId);
    await this.redis.expire(userProposalsKey, this.PENDING_TTL);

    // Audit log
    await audit(AuditEventType.SELF_MODIFY_PROPOSE, {
      userId,
      resource: `self_modify:${filePath}`,
      action: `propose modification: ${description}`,
      status: "success",
      details: {
        proposalId,
        filePath,
        description,
        modifyType: modifyType || "replace",
      },
      ipAddress: context?.ipAddress as string,
    });

    logger.info(
      `Self-modification proposed by user ${userId}: ${description} (ID: ${proposalId})`
    );

    // Return info for SMS sending (the assistant service will handle SMS)
    return JSON.stringify({
      status: "pending_verification",
      proposalId,
      verificationCode,
      message: `Self-modification proposed: "${description}". A verification code has been generated. Please verify via SMS to approve this change.`,
      expiresAt: modification.expiresAt.toISOString(),
      filePath,
      modifyType: modifyType || "replace",
    });
  }

  /**
   * Verify and execute a pending modification
   */
  private async verifyAndExecute(
    userId: string,
    verificationCode?: string,
    proposalId?: string
  ): Promise<string> {
    if (!verificationCode) {
      return "Error: verificationCode is required.";
    }

    // Find the pending modification
    let modification: PendingModification | null = null;

    if (proposalId) {
      const key = this.getCacheKey(userId, proposalId);
      const data = await this.redis.get(key);
      if (data) {
        modification = JSON.parse(data);
      }
    } else {
      // Find by verification code
      const userProposalsKey = `${this.CACHE_PREFIX}user:${userId}:proposals`;
      const proposalIds = await this.redis.smembers(userProposalsKey);

      for (const pid of proposalIds) {
        const key = this.getCacheKey(userId, pid);
        const data = await this.redis.get(key);
        if (data) {
          const mod = JSON.parse(data) as PendingModification;
          if (mod.verificationCode === verificationCode && mod.status === "pending") {
            modification = mod;
            proposalId = pid;
            break;
          }
        }
      }
    }

    if (!modification) {
      return "Error: No pending modification found. It may have expired or already been processed.";
    }

    // Verify code
    if (modification.verificationCode !== verificationCode) {
      logger.warn(
        `Invalid verification code for self-modification. User: ${userId}, Proposal: ${proposalId}`
      );
      return "Error: Invalid verification code.";
    }

    // Check expiration
    if (new Date() > new Date(modification.expiresAt)) {
      modification.status = "expired";
      await this.updateModification(userId, proposalId!, modification);
      return "Error: This modification proposal has expired. Please create a new proposal.";
    }

    // Execute the modification
    try {
      await this.executeModification(modification.request);

      // Update status
      modification.status = "approved";
      await this.updateModification(userId, proposalId!, modification);

      // Remove from pending list
      const userProposalsKey = `${this.CACHE_PREFIX}user:${userId}:proposals`;
      await this.redis.srem(userProposalsKey, proposalId!);

      // Audit log
      await audit(AuditEventType.SELF_MODIFY_EXECUTE, {
        userId,
        resource: `self_modify:${modification.request.filePath}`,
        action: `execute modification: ${modification.request.description}`,
        status: "success",
        details: {
          proposalId,
          filePath: modification.request.filePath,
          description: modification.request.description,
          modifyType: modification.request.modifyType,
        },
      });

      logger.info(
        `Self-modification executed: ${modification.request.description} (User: ${userId}, ID: ${proposalId})`
      );

      return `Successfully executed self-modification: "${modification.request.description}" on file "${modification.request.filePath}".`;
    } catch (error) {
      logger.error("Self-modification execution failed", {
        error,
        proposalId,
        userId,
      });
      return `Error executing modification: ${(error as Error).message}`;
    }
  }

  /**
   * Get status of pending modifications
   */
  private async getStatus(userId: string, proposalId?: string): Promise<string> {
    if (proposalId) {
      const key = this.getCacheKey(userId, proposalId);
      const data = await this.redis.get(key);
      if (!data) {
        return "No modification found with that ID.";
      }
      const mod = JSON.parse(data) as PendingModification;
      return JSON.stringify({
        id: mod.id,
        status: mod.status,
        description: mod.request.description,
        filePath: mod.request.filePath,
        createdAt: mod.createdAt,
        expiresAt: mod.expiresAt,
      });
    }

    // List all pending modifications for user
    const userProposalsKey = `${this.CACHE_PREFIX}user:${userId}:proposals`;
    const proposalIds = await this.redis.smembers(userProposalsKey);

    if (proposalIds.length === 0) {
      return "No pending self-modifications.";
    }

    const proposals: Array<{
      id: string;
      description: string;
      filePath: string;
      status: string;
      expiresAt: string;
    }> = [];

    for (const pid of proposalIds) {
      const key = this.getCacheKey(userId, pid);
      const data = await this.redis.get(key);
      if (data) {
        const mod = JSON.parse(data) as PendingModification;
        proposals.push({
          id: mod.id,
          description: mod.request.description,
          filePath: mod.request.filePath,
          status: mod.status,
          expiresAt: new Date(mod.expiresAt).toISOString(),
        });
      }
    }

    return JSON.stringify({ pendingModifications: proposals });
  }

  /**
   * Cancel a pending modification
   */
  private async cancelProposal(userId: string, proposalId?: string): Promise<string> {
    if (!proposalId) {
      return "Error: proposalId is required to cancel.";
    }

    const key = this.getCacheKey(userId, proposalId);
    const data = await this.redis.get(key);

    if (!data) {
      return "No modification found with that ID.";
    }

    const modification = JSON.parse(data) as PendingModification;
    modification.status = "rejected";
    await this.redis.del(key);

    const userProposalsKey = `${this.CACHE_PREFIX}user:${userId}:proposals`;
    await this.redis.srem(userProposalsKey, proposalId);

    logger.info(`Self-modification cancelled by user ${userId}: ${proposalId}`);

    return `Cancelled modification proposal: "${modification.request.description}"`;
  }

  /**
   * Execute the actual file modification
   */
  private async executeModification(request: SelfModifyRequest): Promise<void> {
    const absolutePath = path.resolve(this.PROJECT_ROOT, request.filePath);

    // Double-check path security
    if (!absolutePath.startsWith(this.PROJECT_ROOT)) {
      throw new Error("Path traversal detected. Modification rejected.");
    }

    switch (request.modifyType) {
      case "create": {
        // Ensure directory exists
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(absolutePath, request.newContent, "utf-8");
        break;
      }

      case "append": {
        const existingContent = await fs.readFile(absolutePath, "utf-8");
        await fs.writeFile(
          absolutePath,
          existingContent + "\n" + request.newContent,
          "utf-8"
        );
        break;
      }

      case "prepend": {
        const existingContent = await fs.readFile(absolutePath, "utf-8");
        await fs.writeFile(
          absolutePath,
          request.newContent + "\n" + existingContent,
          "utf-8"
        );
        break;
      }

      case "replace":
      default: {
        if (!request.oldContent) {
          throw new Error("oldContent required for replace operation");
        }

        const existingContent = await fs.readFile(absolutePath, "utf-8");

        if (!existingContent.includes(request.oldContent)) {
          throw new Error(
            "oldContent not found in file. The file may have been modified. Please review and try again."
          );
        }

        const modifiedContent = existingContent.replace(
          request.oldContent,
          request.newContent
        );

        await fs.writeFile(absolutePath, modifiedContent, "utf-8");
        break;
      }
    }
  }

  /**
   * Validate file path is allowed for modification
   */
  private validateFilePath(filePath: string): { valid: boolean; reason?: string } {
    // Normalize path
    const normalizedPath = path.normalize(filePath);

    // Check for path traversal
    if (normalizedPath.includes("..")) {
      return { valid: false, reason: "Path traversal not allowed." };
    }

    // Check forbidden paths
    for (const forbidden of this.FORBIDDEN_PATHS) {
      if (normalizedPath.startsWith(forbidden) || normalizedPath.includes(forbidden)) {
        return {
          valid: false,
          reason: `Modification of ${forbidden} is not allowed for security reasons.`,
        };
      }
    }

    // Check if path is in allowed list
    const isAllowed = this.ALLOWED_PATHS.some((allowed) =>
      normalizedPath.startsWith(allowed)
    );

    if (!isAllowed) {
      return {
        valid: false,
        reason: `Path must be within allowed directories: ${this.ALLOWED_PATHS.join(", ")}`,
      };
    }

    return { valid: true };
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateProposalId(): string {
    return `mod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private getCacheKey(userId: string, proposalId: string): string {
    return `${this.CACHE_PREFIX}${userId}:${proposalId}`;
  }

  private async updateModification(
    userId: string,
    proposalId: string,
    modification: PendingModification
  ): Promise<void> {
    const key = this.getCacheKey(userId, proposalId);
    // Keep with remaining TTL
    const ttl = await this.redis.ttl(key);
    if (ttl > 0) {
      await this.redis.setex(key, ttl, JSON.stringify(modification));
    }
  }
}
