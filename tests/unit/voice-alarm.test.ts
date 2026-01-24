import { describe, it, expect, beforeEach, vi } from "vitest";
import { VoiceAlarmService } from "../../src/services/voice-alarm.js";
import { BillingService } from "../../src/services/billing.js";
import { SettingsService } from "../../src/services/settings.js";
import { CostService } from "../../src/services/cost.js";
import { VoiceCallType, VoiceCallStatus } from "../../src/types/voice-call.js";
import { Pool } from "pg";

describe("VoiceAlarmService", () => {
    let voiceAlarmService: VoiceAlarmService;
    let mockDb: Pool;
    let mockBillingService: BillingService;
    let mockSettingsService: SettingsService;
    let mockCostService: CostService;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDb = {
            query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
        } as unknown as Pool;

        mockBillingService = {
            getDecryptedKey: vi.fn().mockResolvedValue(null)
        } as unknown as BillingService;

        mockSettingsService = {
            getSettings: vi.fn().mockResolvedValue({
                useVoiceAlarm: true,
                reminderNotificationsEnabled: true
            })
        } as unknown as SettingsService;

        mockCostService = {
            logApiCost: vi.fn().mockResolvedValue(undefined)
        } as unknown as CostService;

        voiceAlarmService = new VoiceAlarmService(
            mockDb,
            mockBillingService,
            mockSettingsService,
            mockCostService,
            "https://example.com"
        );
    });

    describe("generateAlarmTwiML", () => {
        it("should generate wake-up TwiML with acknowledgment prompt", () => {
            const twiml = voiceAlarmService.generateAlarmTwiML(
                "Good morning! Time to wake up.",
                "call-123",
                VoiceCallType.WAKE_UP
            );

            expect(twiml).toContain("<?xml version");
            expect(twiml).toContain("<Response>");
            expect(twiml).toContain("<Say");
            expect(twiml).toContain("Good morning! Time to wake up.");
            expect(twiml).toContain("<Gather");
            expect(twiml).toContain('input="speech"');
            expect(twiml).toContain("callId=call-123");
        });

        it("should generate reminder TwiML with simpler acknowledgment", () => {
            const twiml = voiceAlarmService.generateAlarmTwiML(
                "Reminder: Your meeting starts in 15 minutes.",
                "call-456",
                VoiceCallType.REMINDER
            );

            expect(twiml).toContain("<Response>");
            expect(twiml).toContain("Reminder: Your meeting starts in 15 minutes.");
            expect(twiml).toContain("Press any key or say OK");
        });

        it("should escape XML special characters in message", () => {
            const twiml = voiceAlarmService.generateAlarmTwiML(
                "Test with <special> & 'characters'",
                "call-789",
                VoiceCallType.WAKE_UP
            );

            expect(twiml).not.toContain("<special>");
            expect(twiml).toContain("&lt;special&gt;");
            expect(twiml).toContain("&amp;");
            expect(twiml).toContain("&apos;characters&apos;");
        });
    });

    describe("generateResponseTwiML", () => {
        it("should generate acknowledgment TwiML when user responds", () => {
            const twiml = voiceAlarmService.generateResponseTwiML(true);

            expect(twiml).toContain("<Response>");
            expect(twiml).toContain("Have a wonderful day");
            expect(twiml).toContain("<Hangup/>");
        });

        it("should generate retry TwiML when user does not respond clearly", () => {
            const twiml = voiceAlarmService.generateResponseTwiML(false);

            expect(twiml).toContain("<Response>");
            expect(twiml).toContain("didn't catch that");
            expect(twiml).toContain("<Redirect>");
        });
    });

    describe("triggerAlarm", () => {
        it("should return null when voice alarms are disabled", async () => {
            (mockSettingsService.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
                useVoiceAlarm: false
            });

            const result = await voiceAlarmService.triggerAlarm(
                "user-123",
                "+15555555555",
                "Wake up!"
            );

            expect(result).toBeNull();
        });

        it("should create a call record when triggering alarm", async () => {
            const mockCallRow = {
                id: "call-123",
                user_id: "user-123",
                phone_number: "+15555555555",
                type: VoiceCallType.WAKE_UP,
                status: VoiceCallStatus.QUEUED,
                message: "Wake up!",
                acknowledged: false,
                retry_count: 0,
                created_at: new Date(),
                updated_at: new Date()
            };

            (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                rows: [mockCallRow],
                rowCount: 1
            });

            const result = await voiceAlarmService.triggerAlarm(
                "user-123",
                "+15555555555",
                "Wake up!"
            );

            expect(mockDb.query).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result?.phoneNumber).toBe("+15555555555");
        });
    });

    describe("handleStatusCallback", () => {
        it("should update call status in database", async () => {
            (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                rows: [{
                    id: "call-123",
                    user_id: "user-123",
                    status: VoiceCallStatus.COMPLETED,
                    retry_count: 0
                }],
                rowCount: 1
            });

            await voiceAlarmService.handleStatusCallback(
                "CA123456789",
                "completed",
                60,
                0.05
            );

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE voice_calls"),
                expect.arrayContaining(["completed", 60, 0.05, "CA123456789"])
            );
        });

        it("should log cost when call completes with duration", async () => {
            (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                rows: [{
                    id: "call-123",
                    user_id: "user-123",
                    status: VoiceCallStatus.COMPLETED,
                    retry_count: 0
                }],
                rowCount: 1
            });

            await voiceAlarmService.handleStatusCallback(
                "CA123456789",
                "completed",
                60
            );

            expect(mockCostService.logApiCost).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: "user-123",
                    provider: "twilio",
                    operation: "voice_call"
                })
            );
        });
    });

    describe("handleAcknowledgment", () => {
        it("should update acknowledgment status in database", async () => {
            (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                rows: [{ id: "call-123", acknowledged: true }],
                rowCount: 1
            });

            await voiceAlarmService.handleAcknowledgment("call-123", true);

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE voice_calls"),
                expect.arrayContaining([true, "call-123"])
            );
        });
    });

    describe("getCallHistory", () => {
        it("should return call history for user", async () => {
            const mockCalls = [
                {
                    id: "call-1",
                    user_id: "user-123",
                    phone_number: "+15555555555",
                    type: VoiceCallType.WAKE_UP,
                    status: VoiceCallStatus.COMPLETED,
                    message: "Wake up!",
                    acknowledged: true,
                    retry_count: 0,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];

            (mockDb.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                rows: mockCalls,
                rowCount: 1
            });

            const history = await voiceAlarmService.getCallHistory("user-123", 10);

            expect(history).toHaveLength(1);
            expect(history[0].type).toBe(VoiceCallType.WAKE_UP);
            expect(history[0].acknowledged).toBe(true);
        });
    });

    describe("cleanup", () => {
        it("should clear retry queue", () => {
            // This mainly tests that cleanup doesn't throw
            voiceAlarmService.cleanup();
            // If we had access to the retry queue we could verify it's empty
        });
    });
});
