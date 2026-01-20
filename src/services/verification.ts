/**
 * Verification Service
 *
 * Handles phone number verification via SMS codes
 */

import { Redis } from "ioredis";

import { ValidationError } from "../types/index.js";
import { logger } from "../utils/logger.js";

import { SmsService } from "./sms.js";
import { UserProfileService } from "./userProfile.js";

export class VerificationService {
  private readonly CACHE_PREFIX = "verify:";
  private readonly CODE_TTL = 10 * 60; // 10 minutes

  constructor(
    private redis: Redis,
    private smsService: SmsService,
    private userService: UserProfileService
  ) {}

  /**
   * Send a verification code to a user's phone number
   */
  public async sendVerificationCode(userId: string): Promise<void> {
    const user = await this.userService.getUserById(userId);

    if (user.phoneVerified) {
      throw new ValidationError("Phone number already verified");
    }

    const code = this.generateCode();
    const key = this.getCacheKey(userId);

    await this.redis.setex(key, this.CODE_TTL, code);

    await this.smsService.sendMessage({
      userId,
      toNumber: user.phoneNumber,
      body: `Your AI Assistant verification code is: ${code}. Valid for 10 minutes.`,
    });

    logger.info(`Sent verification code to user ${userId}`);
  }

  /**
   * Verify a code for a user
   */
  public async verifyCode(userId: string, code: string): Promise<boolean> {
    const key = this.getCacheKey(userId);
    const storedCode = await this.redis.get(key);

    if (!storedCode || storedCode !== code) {
      return false;
    }

    // Mark user as verified
    await this.userService.updateUser(userId, { phoneVerified: true });

    // Clear code
    await this.redis.del(key);

    logger.info(`User ${userId} successfully verified phone number`);
    return true;
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getCacheKey(userId: string): string {
    return `${this.CACHE_PREFIX}${userId}`;
  }
}
