/**
 * Security Module Exports
 */

export {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  hash,
  generateSecureToken,
  secureCompare,
} from "./encryption.js";

export {
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
} from "./audit.js";

export type { AuditEntry } from "./audit.js";
