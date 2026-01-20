import { describe, it, expect, beforeEach, vi } from "vitest";
import { VoiceService } from "../../src/services/voice.js";
import { Pool } from "pg";
import {
  IVoiceProvider,
  VoiceMessageStatus,
  VoiceMessageDirection,
} from "../../src/types/voice.js";
import { ValidationError } from "../../src/types/index.js";

// Mock encryption
vi.mock("../../src/security/encryption", () => ({
  encrypt: vi.fn((v) => `enc_${v}`),
  decrypt: vi.fn((v) => v.replace("enc_", "")),
}));

describe("VoiceService", () => {
  let service: VoiceService;
  let mockDb: Pool;
  let mockStt: IVoiceProvider;
  let mockTts: IVoiceProvider;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
    } as unknown as Pool;

    mockStt = {
      name: "MockSTT",
      transcribe: vi.fn(),
    } as unknown as IVoiceProvider;

    mockTts = {
      name: "MockTTS",
      synthesize: vi.fn(),
    } as unknown as IVoiceProvider;

    service = new VoiceService(mockDb, mockStt, mockTts);
  });

  describe("getPrivacySettings", () => {
    it("should return default settings if none exist", async () => {
      vi.spyOn(mockDb, "query").mockResolvedValue({ rows: [] } as never);
      const settings = await service.getPrivacySettings("u123");
      expect(settings.voiceEnabled).toBe(false);
    });

    it("should return stored settings", async () => {
      vi.spyOn(mockDb, "query").mockResolvedValue({
        rows: [{ user_id: "u123", voice_enabled: true, retention_days: 10 }],
      } as never);
      const settings = await service.getPrivacySettings("u123");
      expect(settings.voiceEnabled).toBe(true);
      expect(settings.retentionDays).toBe(10);
    });
  });

  describe("processInboundVoice", () => {
    it("should transcribe and store message when enabled", async () => {
      // Mock privacy check
      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({ rows: [{ voice_enabled: true }] } as never) // getPrivacySettings
        .mockResolvedValueOnce({
          rows: [{ id: "vm123", user_id: "u123" }],
        } as never) // createVoiceMessage
        .mockResolvedValueOnce({ rows: [] } as never) // updateVoiceMessage
        .mockResolvedValueOnce({
          rows: [{ id: "vm123", transcript: "enc_Hello", status: "completed" }],
        } as never); // getVoiceMessage

      (mockStt.transcribe as any).mockResolvedValue({
        text: "Hello",
        duration: 1.5,
      });

      const result = await service.processInboundVoice(
        "u123",
        Buffer.from("audio")
      );

      expect(result.transcript).toBe("Hello");
      expect(result.status).toBe(VoiceMessageStatus.COMPLETED);
      expect(mockStt.transcribe).toHaveBeenCalled();
    });

    it("should throw if voice is disabled", async () => {
      vi.spyOn(mockDb, "query").mockResolvedValue({
        rows: [{ voice_enabled: false }],
      } as never);
      await expect(
        service.processInboundVoice("u123", Buffer.from("audio"))
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("processOutboundVoice", () => {
    it("should synthesize and store message", async () => {
      vi.spyOn(mockDb, "query")
        .mockResolvedValueOnce({ rows: [{ voice_enabled: true }] } as never) // getPrivacySettings
        .mockResolvedValueOnce({ rows: [{ id: "vm456" }] } as never) // createVoiceMessage
        .mockResolvedValueOnce({ rows: [] } as never) // updateVoiceMessage
        .mockResolvedValueOnce({
          rows: [{ id: "vm456", status: "ready" }],
        } as never); // getVoiceMessage

      (mockTts.synthesize as any).mockResolvedValue({
        audioBuffer: Buffer.from("output"),
      });

      const result = await service.processOutboundVoice("u123", "Hello back");

      expect(result.audioBuffer).toBeDefined();
      expect(result.message.id).toBe("vm456");
      expect(mockTts.synthesize).toHaveBeenCalledWith("Hello back", undefined);
    });
  });
});
