/**
 * Notification Types
 *
 * Types for desktop notifications from autonomous agent insights
 */

export enum NotificationPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

export enum NotificationType {
    INSIGHT = 'insight',
    REMINDER = 'reminder',
    GOAL_UPDATE = 'goal_update',
    CHECK_IN = 'check_in',
    SYSTEM = 'system',
    VOICE_CALL = 'voice_call'
}

export interface DesktopNotification {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    body: string;
    icon?: string;
    /** URL to open when notification is clicked */
    actionUrl?: string;
    /** Whether the notification requires interaction (stays visible) */
    requireInteraction?: boolean;
    /** Custom data payload */
    data?: Record<string, unknown>;
    timestamp: Date;
}

export interface NotificationPreferences {
    /** Master toggle for all notifications */
    enabled: boolean;
    /** Enable insight notifications */
    insightsEnabled: boolean;
    /** Enable reminder notifications */
    remindersEnabled: boolean;
    /** Enable goal update notifications */
    goalUpdatesEnabled: boolean;
    /** Enable check-in notifications */
    checkInsEnabled: boolean;
    /** Minimum priority level to show (low, medium, high) */
    minPriority: NotificationPriority;
    /** Quiet hours start (HH:MM) */
    quietHoursStart?: string;
    /** Quiet hours end (HH:MM) */
    quietHoursEnd?: string;
    /** Play sound with notifications */
    soundEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    enabled: true,
    insightsEnabled: true,
    remindersEnabled: true,
    goalUpdatesEnabled: true,
    checkInsEnabled: true,
    minPriority: NotificationPriority.LOW,
    soundEnabled: true
};

export interface NotificationEvent {
    userId: string;
    notification: DesktopNotification;
}
