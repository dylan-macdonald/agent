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

export {
  MIN_TLS_VERSION,
  PREFERRED_TLS_VERSION,
  SECURE_CIPHERS,
  loadServerTLSConfig,
  getClientTLSConfig,
  createSecureHttpsAgent,
  secureHttpsAgent,
  enforceHttps,
  checkCertificateExpiration,
  getTLSConfigSummary,
} from "./tls.js";

export type { ServerTLSConfig, ClientTLSConfig } from "./tls.js";
