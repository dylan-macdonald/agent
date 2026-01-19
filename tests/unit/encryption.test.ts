import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Encryption Module", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env["NODE_ENV"] = "development";
    process.env["ENCRYPTION_KEY"] = "test-encryption-key-for-testing-purposes";
  });

  describe("encrypt/decrypt", () => {
    it("should encrypt and decrypt text correctly", async () => {
      const { encrypt, decrypt } = await import("@/security/encryption.js");

      const plaintext = "Hello, World! This is a test message.";
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext (random IV)", async () => {
      const { encrypt } = await import("@/security/encryption.js");

      const plaintext = "Same message";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle empty strings", async () => {
      const { encrypt, decrypt } = await import("@/security/encryption.js");

      const plaintext = "";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode characters", async () => {
      const { encrypt, decrypt } = await import("@/security/encryption.js");

      const plaintext = "こんにちは世界 🌍 Привет мир";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle large data", async () => {
      const { encrypt, decrypt } = await import("@/security/encryption.js");

      const plaintext = "a".repeat(100000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw on invalid encrypted data", async () => {
      const { decrypt } = await import("@/security/encryption.js");

      expect(() => decrypt("invalid-base64!")).toThrow();
      expect(() => decrypt("aGVsbG8=")).toThrow(); // Valid base64 but invalid format
    });

    it("should throw on tampered data", async () => {
      const { encrypt, decrypt } = await import("@/security/encryption.js");

      const plaintext = "Secret message";
      const encrypted = encrypt(plaintext);

      // Tamper with the encrypted data
      const buffer = Buffer.from(encrypted, "base64");
      buffer[buffer.length - 1] ^= 0xff;
      const tampered = buffer.toString("base64");

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe("encryptObject/decryptObject", () => {
    it("should encrypt and decrypt objects", async () => {
      const { encryptObject, decryptObject } = await import(
        "@/security/encryption.js"
      );

      const obj = {
        name: "John Doe",
        age: 30,
        nested: { key: "value" },
        array: [1, 2, 3],
      };

      const encrypted = encryptObject(obj);
      expect(typeof encrypted).toBe("string");

      const decrypted = decryptObject<typeof obj>(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it("should handle complex objects", async () => {
      const { encryptObject, decryptObject } = await import(
        "@/security/encryption.js"
      );

      const obj = {
        date: new Date().toISOString(),
        null: null,
        boolean: true,
        number: 42.5,
      };

      const encrypted = encryptObject(obj);
      const decrypted = decryptObject<typeof obj>(encrypted);

      expect(decrypted).toEqual(obj);
    });
  });

  describe("hash", () => {
    it("should produce consistent hashes", async () => {
      const { hash } = await import("@/security/encryption.js");

      const data = "password123";
      const hash1 = hash(data);
      const hash2 = hash(data);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", async () => {
      const { hash } = await import("@/security/encryption.js");

      const hash1 = hash("password1");
      const hash2 = hash("password2");

      expect(hash1).not.toBe(hash2);
    });

    it("should produce 64-character hex string (SHA-256)", async () => {
      const { hash } = await import("@/security/encryption.js");

      const result = hash("test");

      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("generateSecureToken", () => {
    it("should generate tokens of specified length", async () => {
      const { generateSecureToken } = await import("@/security/encryption.js");

      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);

      expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(token32).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it("should generate unique tokens", async () => {
      const { generateSecureToken } = await import("@/security/encryption.js");

      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }

      expect(tokens.size).toBe(100);
    });
  });

  describe("secureCompare", () => {
    it("should return true for equal strings", async () => {
      const { secureCompare } = await import("@/security/encryption.js");

      expect(secureCompare("abc123", "abc123")).toBe(true);
    });

    it("should return false for different strings", async () => {
      const { secureCompare } = await import("@/security/encryption.js");

      expect(secureCompare("abc123", "abc124")).toBe(false);
    });

    it("should return false for different length strings", async () => {
      const { secureCompare } = await import("@/security/encryption.js");

      expect(secureCompare("abc", "abcd")).toBe(false);
    });
  });
});
