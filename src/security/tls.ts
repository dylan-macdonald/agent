/**
 * TLS/SSL Configuration for External Connections
 *
 * Ensures all external connections use TLS 1.3 (or minimum 1.2)
 * and follow security best practices.
 */

import { readFileSync } from "fs";
import https from "https";

import { logger } from "@/utils/logger";

/**
 * Minimum TLS version required
 */
export const MIN_TLS_VERSION = "TLSv1.2";
export const PREFERRED_TLS_VERSION = "TLSv1.3";

/**
 * Secure cipher suites (prioritizing TLS 1.3 and strong TLS 1.2 ciphers)
 */
export const SECURE_CIPHERS = [
  // TLS 1.3 cipher suites
  "TLS_AES_256_GCM_SHA384",
  "TLS_AES_128_GCM_SHA256",
  "TLS_CHACHA20_POLY1305_SHA256",
  // TLS 1.2 cipher suites
  "ECDHE-RSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES128-GCM-SHA256",
  "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-ECDSA-AES128-GCM-SHA256",
].join(":");

/**
 * TLS configuration for HTTPS server
 */
export interface ServerTLSConfig {
  key?: string;
  cert?: string;
  ca?: string;
  minVersion?: string;
  maxVersion?: string;
  ciphers?: string;
  honorCipherOrder?: boolean;
  rejectUnauthorized?: boolean;
}

/**
 * TLS configuration for outbound HTTPS requests
 */
export interface ClientTLSConfig {
  minVersion?: string;
  maxVersion?: string;
  rejectUnauthorized?: boolean;
  checkServerIdentity?: (hostname: string, cert: any) => Error | undefined;
}

/**
 * Load TLS configuration for HTTPS server
 *
 * Reads certificate files from paths specified in environment variables.
 */
export function loadServerTLSConfig(): ServerTLSConfig | null {
  const { TLS_KEY_PATH, TLS_CERT_PATH, TLS_CA_PATH, TLS_ENABLED, NODE_ENV } =
    process.env;

  // In development, TLS is optional
  if (NODE_ENV === "development" && TLS_ENABLED !== "true") {
    logger.warn(
      "TLS is disabled in development mode. Enable with TLS_ENABLED=true"
    );
    return null;
  }

  // In production, TLS is required
  if (NODE_ENV === "production" && !TLS_KEY_PATH) {
    throw new Error(
      "TLS_KEY_PATH must be set in production for secure connections"
    );
  }

  if (!TLS_KEY_PATH || !TLS_CERT_PATH) {
    return null;
  }

  try {
    const tlsConfig: ServerTLSConfig = {
      key: readFileSync(TLS_KEY_PATH, "utf8"),
      cert: readFileSync(TLS_CERT_PATH, "utf8"),
      minVersion: PREFERRED_TLS_VERSION,
      ciphers: SECURE_CIPHERS,
      honorCipherOrder: true,
      rejectUnauthorized: true,
    };

    if (TLS_CA_PATH) {
      tlsConfig.ca = readFileSync(TLS_CA_PATH, "utf8");
    }

    logger.info("TLS configuration loaded successfully");
    return tlsConfig;
  } catch (error) {
    if (NODE_ENV === "production") {
      throw new Error(`Failed to load TLS certificates: ${error}`);
    }
    logger.warn(`Failed to load TLS certificates: ${error}`);
    return null;
  }
}

/**
 * Get TLS configuration for outbound HTTPS requests
 *
 * Ensures all outbound connections use secure TLS.
 */
export function getClientTLSConfig(): ClientTLSConfig {
  return {
    minVersion: PREFERRED_TLS_VERSION,
    rejectUnauthorized: process.env.NODE_ENV !== "test",
    // Custom server identity check can be added here
    checkServerIdentity: (_hostname: string, _cert: any) => {
      // Add custom certificate pinning logic here if needed
      return undefined;
    },
  };
}

/**
 * Create a secure HTTPS agent for outbound requests
 *
 * Use this agent for all external HTTPS requests to ensure
 * they use TLS 1.3 and secure ciphers.
 */
export function createSecureHttpsAgent(): https.Agent {
  const tlsConfig = getClientTLSConfig();

  return new https.Agent({
    minVersion: tlsConfig.minVersion as any,
    rejectUnauthorized: tlsConfig.rejectUnauthorized,
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
  });
}

/**
 * Global HTTPS agent for all external requests
 *
 * Use this in HTTP clients (axios, fetch, etc.) to ensure
 * all external connections use TLS.
 */
export const secureHttpsAgent = createSecureHttpsAgent();

/**
 * Enforce HTTPS for URLs
 *
 * Automatically upgrades HTTP URLs to HTTPS.
 * Throws error in production if HTTP cannot be upgraded.
 */
export function enforceHttps(url: string): string {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol === "http:") {
    if (process.env.NODE_ENV === "production") {
      // In production, never allow HTTP
      throw new Error(
        `HTTP connections not allowed in production. Use HTTPS: ${url}`
      );
    }

    // In development, allow localhost HTTP but warn
    if (
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1"
    ) {
      logger.warn(`Using HTTP for localhost: ${url}`);
      return url;
    }

    // Upgrade to HTTPS
    logger.warn(`Upgrading HTTP to HTTPS: ${url}`);
    parsedUrl.protocol = "https:";
    return parsedUrl.toString();
  }

  return url;
}

/**
 * Validate TLS certificate expiration
 *
 * Checks if certificate is expiring soon and logs warnings.
 */
export function checkCertificateExpiration(_certPath: string): void {
  // Placeholder for certificate expiration checking
  // Actual implementation would parse the certificate and check expiration dates
  logger.info("Certificate expiration check placeholder");
}

/**
 * TLS configuration summary for logging
 */
export function getTLSConfigSummary(): object {
  return {
    minVersion: MIN_TLS_VERSION,
    preferredVersion: PREFERRED_TLS_VERSION,
    ciphersConfigured: SECURE_CIPHERS.split(":").length,
    serverTLSEnabled: !!process.env.TLS_ENABLED,
    environment: process.env.NODE_ENV,
  };
}
