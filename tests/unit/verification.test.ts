import { describe, it, expect, beforeEach, vi } from "vitest";
import { VerificationService } from "../../src/services/verification.js";
import Redis from "ioredis";
import { SmsService } from "../../src/services/sms.js";
import { UserProfileService } from "../../src/services/userProfile.js";
import { ValidationError } from "../../src/types/index.js";

describe("VerificationService", () => {
  let service: VerificationService;
  let mockRedis: Redis;
  let mockSms: SmsService;
  let mockUser: UserProfileService;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
    } as unknown as Redis;

    mockSms = {
      sendMessage: vi.fn(),
    } as unknown as SmsService;

    mockUser = {
      getUserById: vi.fn(),
      updateUser: vi.fn(),
    } as unknown as UserProfileService;

    service = new VerificationService(mockRedis, mockSms, mockUser);
  });

  describe("sendVerificationCode", () => {
    it("should send code when user is not verified", async () => {
      (mockUser.getUserById as any).mockResolvedValue({
        id: "u123",
        phoneNumber: "+1234567890",
        phoneVerified: false,
      });

      await service.sendVerificationCode("u123");

      expect(mockRedis.setex).toHaveBeenCalled();
      expect(mockSms.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u123",
          toNumber: "+1234567890",
        })
      );
    });

    it("should throw if already verified", async () => {
      (mockUser.getUserById as any).mockResolvedValue({
        id: "u123",
        phoneVerified: true,
      });

      await expect(service.sendVerificationCode("u123")).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("verifyCode", () => {
    it("should return true and update user on correct code", async () => {
      vi.spyOn(mockRedis, "get").mockResolvedValue("123456");

      const result = await service.verifyCode("u123", "123456");

      expect(result).toBe(true);
      expect(mockUser.updateUser).toHaveBeenCalledWith("u123", {
        phoneVerified: true,
      });
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it("should return false on wrong code", async () => {
      vi.spyOn(mockRedis, "get").mockResolvedValue("123456");

      const result = await service.verifyCode("u123", "000000");

      expect(result).toBe(false);
      expect(mockUser.updateUser).not.toHaveBeenCalled();
    });

    it("should handle expired codes", async () => {
      vi.spyOn(mockRedis, "get").mockResolvedValue(null);
      const result = await service.verifyCode("u123", "123456");
      expect(result).toBe(false);
    });

    it("should generate 6-digit numeric codes", async () => {
      // @ts-ignore
      const code = service.generateCode();
      expect(code).toMatch(/^\d{6}$/);
    });
  });
});
