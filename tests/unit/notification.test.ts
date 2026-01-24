import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotificationPriority, NotificationType, DEFAULT_NOTIFICATION_PREFERENCES } from "../../src/types/notification.js";

describe("Notification Types", () => {
    describe("NotificationPriority", () => {
        it("should have correct priority values", () => {
            expect(NotificationPriority.LOW).toBe("low");
            expect(NotificationPriority.MEDIUM).toBe("medium");
            expect(NotificationPriority.HIGH).toBe("high");
        });
    });

    describe("NotificationType", () => {
        it("should have correct type values", () => {
            expect(NotificationType.INSIGHT).toBe("insight");
            expect(NotificationType.REMINDER).toBe("reminder");
            expect(NotificationType.GOAL_UPDATE).toBe("goal_update");
            expect(NotificationType.CHECK_IN).toBe("check_in");
            expect(NotificationType.SYSTEM).toBe("system");
            expect(NotificationType.VOICE_CALL).toBe("voice_call");
        });
    });

    describe("DEFAULT_NOTIFICATION_PREFERENCES", () => {
        it("should have all notifications enabled by default", () => {
            expect(DEFAULT_NOTIFICATION_PREFERENCES.enabled).toBe(true);
            expect(DEFAULT_NOTIFICATION_PREFERENCES.insightsEnabled).toBe(true);
            expect(DEFAULT_NOTIFICATION_PREFERENCES.remindersEnabled).toBe(true);
            expect(DEFAULT_NOTIFICATION_PREFERENCES.goalUpdatesEnabled).toBe(true);
            expect(DEFAULT_NOTIFICATION_PREFERENCES.checkInsEnabled).toBe(true);
        });

        it("should have low as minimum priority by default", () => {
            expect(DEFAULT_NOTIFICATION_PREFERENCES.minPriority).toBe(NotificationPriority.LOW);
        });

        it("should have sound enabled by default", () => {
            expect(DEFAULT_NOTIFICATION_PREFERENCES.soundEnabled).toBe(true);
        });

        it("should not have quiet hours set by default", () => {
            expect(DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart).toBeUndefined();
            expect(DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd).toBeUndefined();
        });
    });
});

describe("SocketService Notification Methods", () => {
    // Mock socket.io server
    const mockEmit = vi.fn();
    const mockTo = vi.fn().mockReturnThis();

    const createMockSocketService = () => {
        return {
            io: {
                to: mockTo.mockReturnValue({ emit: mockEmit }),
                emit: mockEmit,
                sockets: { sockets: new Map() }
            },
            connectedClients: new Map(),

            sendDesktopNotification: vi.fn((userId: string, notification: any) => {
                mockTo(`user:${userId}`);
                mockEmit('desktop-notification', {
                    ...notification,
                    id: 'test-id',
                    timestamp: new Date()
                });
            }),

            sendInsightNotification: vi.fn((userId: string, title: string, body: string, priority = NotificationPriority.MEDIUM) => {
                mockTo(`user:${userId}`);
                mockEmit('desktop-notification', {
                    type: NotificationType.INSIGHT,
                    priority,
                    title,
                    body
                });
            }),

            sendReminderNotification: vi.fn((userId: string, title: string, body: string, reminderId: string) => {
                mockTo(`user:${userId}`);
                mockEmit('desktop-notification', {
                    type: NotificationType.REMINDER,
                    priority: NotificationPriority.HIGH,
                    title,
                    body,
                    data: { reminderId }
                });
            }),

            hasDesktopAgent: vi.fn((userId: string) => {
                return true; // Mock that desktop agent is connected
            })
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should send desktop notification with correct structure", () => {
        const mockService = createMockSocketService();

        mockService.sendDesktopNotification("user-123", {
            type: NotificationType.INSIGHT,
            priority: NotificationPriority.MEDIUM,
            title: "Test Notification",
            body: "This is a test"
        });

        expect(mockEmit).toHaveBeenCalledWith('desktop-notification', expect.objectContaining({
            type: NotificationType.INSIGHT,
            priority: NotificationPriority.MEDIUM,
            title: "Test Notification",
            body: "This is a test"
        }));
    });

    it("should send insight notification", () => {
        const mockService = createMockSocketService();

        mockService.sendInsightNotification(
            "user-123",
            "New Insight",
            "You've been sleeping well this week!",
            NotificationPriority.LOW
        );

        expect(mockEmit).toHaveBeenCalledWith('desktop-notification', expect.objectContaining({
            type: NotificationType.INSIGHT,
            priority: NotificationPriority.LOW,
            title: "New Insight"
        }));
    });

    it("should send reminder notification with high priority", () => {
        const mockService = createMockSocketService();

        mockService.sendReminderNotification(
            "user-123",
            "Meeting in 15 minutes",
            "Your team standup is starting soon",
            "reminder-456"
        );

        expect(mockEmit).toHaveBeenCalledWith('desktop-notification', expect.objectContaining({
            type: NotificationType.REMINDER,
            priority: NotificationPriority.HIGH,
            data: expect.objectContaining({ reminderId: "reminder-456" })
        }));
    });

    it("should check if desktop agent is connected", () => {
        const mockService = createMockSocketService();

        const hasAgent = mockService.hasDesktopAgent("user-123");
        expect(hasAgent).toBe(true);
    });
});
