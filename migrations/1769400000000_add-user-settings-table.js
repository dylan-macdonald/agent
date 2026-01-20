/**
 * Migration: Add user_settings table
 *
 * Stores user preferences for privacy controls and notifications
 */

exports.up = (pgm) => {
    pgm.createTable('user_settings', {
        user_id: {
            type: 'uuid',
            primaryKey: true,
            references: 'users(id)',
            onDelete: 'CASCADE'
        },
        // Privacy Controls
        web_search_enabled: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        script_execution_enabled: {
            type: 'boolean',
            notNull: true,
            default: false
        },
        screen_capture_enabled: {
            type: 'boolean',
            notNull: true,
            default: false
        },
        voice_features_enabled: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        // Notification Settings
        morning_check_ins_enabled: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        evening_reflections_enabled: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        reminder_notifications_enabled: {
            type: 'boolean',
            notNull: true,
            default: true
        },
        // Check-in Times
        morning_check_in_time: {
            type: 'time',
            notNull: true,
            default: '08:00'
        },
        evening_check_in_time: {
            type: 'time',
            notNull: true,
            default: '21:00'
        },
        // Other Settings
        timezone: {
            type: 'varchar(50)',
            notNull: true,
            default: 'UTC'
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('NOW()')
        },
        updated_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Create index for faster lookups
    pgm.createIndex('user_settings', 'user_id');
};

exports.down = (pgm) => {
    pgm.dropTable('user_settings');
};
