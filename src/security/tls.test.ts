import { describe, it, expect, beforeEach } from "vitest";

import {
  enforceHttps,
  getClientTLSConfig,
  createSecureHttpsAgent,
  MIN_TLS_VERSION,
  PREFERRED_TLS_VERSION,
} from "./tls";

describe("TLS Configuration", () => {
  describe("enforceHttps", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("should keep HTTPS URLs unchanged", () => {
      const url = "https://example.com/api";
      expect(enforceHttps(url)).toBe(url);
    });

    it("should allow HTTP for localhost in development", () => {
      const url = "http://localhost:3000";
      expect(enforceHttps(url)).toBe(url);
    });

    it("should allow HTTP for 127.0.0.1 in development", () => {
      const url = "http://127.0.0.1:3000";
      expect(enforceHttps(url)).toBe(url);
    });

    it("should upgrade HTTP to HTTPS in development for external hosts", () => {
      const url = "http://example.com/api";
      const result = enforceHttps(url);
      expect(result).toBe("https://example.com/api");
    });

    it("should throw error for HTTP in production", () => {
      process.env.NODE_ENV = "production";
      const url = "http://example.com/api";
      expect(() => enforceHttps(url)).toThrow(
        /HTTP connections not allowed in production/
      );
    });
  });

  describe("getClientTLSConfig", () => {
    it("should return TLS config with preferred version", () => {
      const config = getClientTLSConfig();
      expect(config.minVersion).toBe(PREFERRED_TLS_VERSION);
    });

    it("should reject unauthorized certs except in test", () => {
      process.env.NODE_ENV = "production";
      const config = getClientTLSConfig();
      expect(config.rejectUnauthorized).toBe(true);

      process.env.NODE_ENV = "test";
      const testConfig = getClientTLSConfig();
      expect(testConfig.rejectUnauthorized).toBe(false);
    });

    it("should include checkServerIdentity function", () => {
      const config = getClientTLSConfig();
      expect(config.checkServerIdentity).toBeDefined();
      expect(typeof config.checkServerIdentity).toBe("function");
    });
  });

  describe("createSecureHttpsAgent", () => {
    it("should create HTTPS agent with secure settings", () => {
      const agent = createSecureHttpsAgent();
      expect(agent).toBeDefined();
      expect(agent.options.keepAlive).toBe(true);
      expect(agent.options.minVersion).toBe(PREFERRED_TLS_VERSION);
    });

    it("should have reasonable connection pool settings", () => {
      const agent = createSecureHttpsAgent();
      expect(agent.options.maxSockets).toBe(50);
      expect(agent.options.maxFreeSockets).toBe(10);
      expect(agent.options.keepAliveMsecs).toBe(30000);
    });
  });

  describe("TLS constants", () => {
    it("should define minimum TLS version as 1.2", () => {
      expect(MIN_TLS_VERSION).toBe("TLSv1.2");
    });

    it("should prefer TLS version 1.3", () => {
      expect(PREFERRED_TLS_VERSION).toBe("TLSv1.3");
    });
  });
});
