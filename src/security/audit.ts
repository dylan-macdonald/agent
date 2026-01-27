/**
 * Audit Logging Foundation
 * Provides secure, structured logging for security-sensitive operations
 */

import type { UUID } from "@/types/index.js";
import { logger } from "@/utils/logger.js";

/**
 * Types of auditable events
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = "auth.login.success",
  LOGIN_FAILURE = "auth.login.failure",
  LOGOUT = "auth.logout",
  TOKEN_REFRESH = "auth.token.refresh",
  PASSWORD_CHANGE = "auth.password.change",

  // Data access events
  DATA_READ = "data.read",
  DATA_CREATE = "data.create",
  DATA_UPDATE = "data.update",
  DATA_DELETE = "data.delete",

  // User management
  USER_CREATE = "user.create",
  USER_UPDATE = "user.update",
  USER_DELETE = "user.delete",
  USER_PERMISSION_CHANGE = "user.permission.change",

  // Security events
  ENCRYPTION_KEY_ACCESS = "security.key.access",
  RATE_LIMIT_EXCEEDED = "security.rate_limit.exceeded",
  SUSPICIOUS_ACTIVITY = "security.suspicious_activity",
  ACCESS_DENIED = "security.access.denied",

  // System events
  SYSTEM_CONFIG_CHANGE = "system.config.change",
  SYSTEM_ERROR = "system.error",

  // Remote access events
  REMOTE_CONNECTION = "remote.connection",
  REMOTE_COMMAND = "remote.command",

  // Sensitive operations
  SENSITIVE_ACCESS = "security.sensitive_access",
  SELF_MODIFY_PROPOSE = "security.self_modify.propose",
  SELF_MODIFY_EXECUTE = "security.self_modify.execute",
}

/**
 * Audit log entry structure
 */
export interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId?: UUID;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  action: string;
  status: "success" | "failure";
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * In-memory audit log storage (for development)
 * In production, this should write to a secure, append-only log store
 */
const auditLogBuffer: AuditEntry[] = [];
const MAX_BUFFER_SIZE = 10000;

/**
 * Generate a unique ID for audit entries
 */
function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `audit_${timestamp}_${random}`;
}

/**
 * Create an audit log entry
 */
export function createAuditEntry(
  eventType: AuditEventType,
  params: {
    userId?: UUID;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    resource?: string;
    resourceId?: string;
    action: string;
    status: "success" | "failure";
    details?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
): AuditEntry {
  const entry: AuditEntry = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    eventType,
    ...params,
  };

  return entry;
}

/**
 * Write an audit log entry
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  // Placeholder for future async operations (database write)
  await Promise.resolve();

  // Add to in-memory buffer
  auditLogBuffer.push(entry);

  // Prevent memory overflow
  if (auditLogBuffer.length > MAX_BUFFER_SIZE) {
    auditLogBuffer.shift();
  }

  // Log to standard logger for now
  // In production, this should write to a dedicated audit log store
  logger.info("AUDIT", {
    auditId: entry.id,
    eventType: entry.eventType,
    userId: entry.userId,
    action: entry.action,
    status: entry.status,
    resource: entry.resource,
    resourceId: entry.resourceId,
  });

  // TODO: Implement persistent audit log storage
  // - Write to PostgreSQL audit table
  // - Or write to dedicated audit log service
  // - Ensure append-only semantics
  // - Implement log integrity verification
}

/**
 * Convenience function to log an audit event
 */
export async function audit(
  eventType: AuditEventType,
  params: Omit<Parameters<typeof createAuditEntry>[1], "action" | "status"> & {
    action: string;
    status: "success" | "failure";
  }
): Promise<void> {
  const entry = createAuditEntry(eventType, params);
  await writeAuditLog(entry);
}

/**
 * Log a successful authentication
 */
export async function auditLoginSuccess(
  userId: UUID,
  ipAddress: string,
  sessionId: string
): Promise<void> {
  await audit(AuditEventType.LOGIN_SUCCESS, {
    userId,
    ipAddress,
    sessionId,
    action: "User authenticated successfully",
    status: "success",
  });
}

/**
 * Log a failed authentication attempt
 */
export async function auditLoginFailure(
  ipAddress: string,
  details: { reason: string; attemptedEmail?: string }
): Promise<void> {
  await audit(AuditEventType.LOGIN_FAILURE, {
    ipAddress,
    action: "Authentication attempt failed",
    status: "failure",
    details,
  });
}

/**
 * Log data access
 */
export async function auditDataAccess(
  userId: UUID,
  resource: string,
  resourceId: string,
  operation: "read" | "create" | "update" | "delete",
  success: boolean
): Promise<void> {
  const eventTypeMap: Record<string, AuditEventType> = {
    read: AuditEventType.DATA_READ,
    create: AuditEventType.DATA_CREATE,
    update: AuditEventType.DATA_UPDATE,
    delete: AuditEventType.DATA_DELETE,
  };

  const eventType = eventTypeMap[operation];
  if (!eventType) {
    return;
  }

  await audit(eventType, {
    userId,
    resource,
    resourceId,
    action: `${operation} operation on ${resource}`,
    status: success ? "success" : "failure",
  });
}

/**
 * Log security events
 */
export async function auditSecurityEvent(
  eventType: AuditEventType,
  details: {
    userId?: UUID;
    ipAddress?: string;
    description: string;
    severity?: "low" | "medium" | "high" | "critical";
  }
): Promise<void> {
  await audit(eventType, {
    ...(details.userId !== undefined && { userId: details.userId }),
    ...(details.ipAddress !== undefined && { ipAddress: details.ipAddress }),
    action: details.description,
    status: "failure",
    metadata: {
      severity: details.severity ?? "medium",
    },
  });
}

/**
 * Get recent audit logs (for development/debugging)
 */
export function getRecentAuditLogs(count = 100): AuditEntry[] {
  return auditLogBuffer.slice(-count);
}

/**
 * Query audit logs by user
 */
export function queryAuditLogsByUser(userId: UUID, count = 100): AuditEntry[] {
  return auditLogBuffer
    .filter((entry) => entry.userId === userId)
    .slice(-count);
}

/**
 * Query audit logs by event type
 */
export function queryAuditLogsByType(
  eventType: AuditEventType,
  count = 100
): AuditEntry[] {
  return auditLogBuffer
    .filter((entry) => entry.eventType === eventType)
    .slice(-count);
}

export default {
  AuditEventType,
  createAuditEntry,
  writeAuditLog,
  audit,
  auditLoginSuccess,
  auditLoginFailure,
  auditDataAccess,
  auditSecurityEvent,
  getRecentAuditLogs,
  queryAuditLogsByUser,
  queryAuditLogsByType,
};
