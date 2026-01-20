/**
 * Migration: Add adaptive settings
 *
 * Adds columns for proactive/adaptive scheduling preferences
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.addColumns('user_settings', {
        wake_time: {
            type: 'time',
            default: '09:00:00',
            notNull: true
        },
        sleep_time: {
            type: 'time',
            default: '23:00:00',
            notNull: true
        },
        use_voice_alarm: {
            type: 'boolean',
            default: false,
            notNull: true
        },
        adaptive_timing: {
            type: 'boolean',
            default: false,
            notNull: true
        }
    });
};

exports.down = (pgm) => {
    pgm.dropColumns('user_settings', ['wake_time', 'sleep_time', 'use_voice_alarm', 'adaptive_timing']);
};
