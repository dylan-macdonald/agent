/**
 * AES-256 Encryption Utility
 * Provides secure encryption/decryption for data at rest
 */

import crypto from "crypto";

import { getConfig } from "@/config/index.js";
import { AppError } from "@/types/index.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive a proper 256-bit key from the encryption key in config
 * Uses PBKDF2 for key derivation
 */
function deriveKey(salt: Buffer): Buffer {
  const configKey = getConfig().security.encryptionKey;
  return crypto.pbkdf2Sync(configKey, salt, 100000, KEY_LENGTH, "sha256");
}

/**
 * Generate a random salt
 */
function generateSalt(): Buffer {
  return crypto.randomBytes(16);
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @returns Base64 encoded string containing salt, IV, auth tag, and ciphertext
 */
export function encrypt(plaintext: string): string {
  try {
    const salt = generateSalt();
    const key = deriveKey(salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Combine: salt (16) + iv (16) + authTag (16) + ciphertext
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);

    return combined.toString("base64");
  } catch (error) {
    throw new AppError(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "ENCRYPTION_ERROR",
      500
    );
  }
}

/**
 * Decrypt data that was encrypted with encrypt()
 * @param encryptedData - Base64 encoded encrypted data
 * @returns The original plaintext
 */
export function decrypt(encryptedData: string): string {
  try {
    const combined = Buffer.from(encryptedData, "base64");

    // Minimum length: salt (16) + IV (16) + authTag (16) = 48 bytes
    // Ciphertext can be 0 bytes for empty input
    const HEADER_LENGTH = 16 + IV_LENGTH + AUTH_TAG_LENGTH;
    if (combined.length < HEADER_LENGTH) {
      throw new Error("Invalid encrypted data: too short");
    }

    // Extract components
    const salt = combined.subarray(0, 16);
    const iv = combined.subarray(16, 16 + IV_LENGTH);
    const authTag = combined.subarray(
      16 + IV_LENGTH,
      16 + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const ciphertext = combined.subarray(16 + IV_LENGTH + AUTH_TAG_LENGTH);

    const key = deriveKey(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new AppError(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "DECRYPTION_ERROR",
      500
    );
  }
}

/**
 * Encrypt an object (JSON serializable)
 */
export function encryptObject<T>(obj: T): string {
  const json = JSON.stringify(obj);
  return encrypt(json);
}

/**
 * Decrypt to an object
 */
export function decryptObject<T>(encryptedData: string): T {
  const json = decrypt(encryptedData);
  return JSON.parse(json) as T;
}

/**
 * Hash a string using SHA-256 (one-way, for password comparison etc.)
 */
export function hash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Compare two strings in constant time (prevents timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export default {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  hash,
  generateSecureToken,
  secureCompare,
};
