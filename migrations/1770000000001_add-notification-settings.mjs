/**
 * Migration: Add notification settings columns
 *
 * Adds desktop notification preference columns to user_settings table.
 */

export async function up(pgm) {
    // Add desktop notification settings columns
    pgm.addColumns('user_settings', {
        desktop_notifications_enabled: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        insight_notifications_enabled: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        goal_notifications_enabled: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        notification_min_priority: {
            type: 'varchar(10)',
            notNull: true,
            default: 'low',
            comment: 'Minimum priority level for notifications: low, medium, high'
        },
        notification_sound_enabled: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        notification_quiet_hours_start: {
            type: 'time',
            comment: 'Quiet hours start time (HH:MM)'
        },
        notification_quiet_hours_end: {
            type: 'time',
            comment: 'Quiet hours end time (HH:MM)'
        }
    });
}

export async function down(pgm) {
    pgm.dropColumns('user_settings', [
        'desktop_notifications_enabled',
        'insight_notifications_enabled',
        'goal_notifications_enabled',
        'notification_min_priority',
        'notification_sound_enabled',
        'notification_quiet_hours_start',
        'notification_quiet_hours_end'
    ]);
}
