/**
 * Migration: Add Health Tables (Sleep, Workouts)
 */

exports.up = (pgm) => {
    // Sleep Logs
    pgm.createTable('sleep_logs', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: '"users"',
            onDelete: 'CASCADE',
        },
        start_time: {
            type: 'timestamptz',
            notNull: true,
        },
        end_time: {
            type: 'timestamptz',
            notNull: true,
        },
        quality: {
            type: 'integer',
            check: 'quality >= 0 AND quality <= 100',
        },
        notes: {
            type: 'text',
        },
        source: {
            type: 'varchar(50)',
            default: 'MANUAL',
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.createIndex('sleep_logs', 'user_id');
    pgm.createIndex('sleep_logs', 'start_time');

    // Workouts
    pgm.createTable('workouts', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: '"users"',
            onDelete: 'CASCADE',
        },
        activity_type: {
            type: 'varchar(100)',
            notNull: true,
        },
        duration_mins: {
            type: 'integer',
            notNull: true,
        },
        calories_burned: {
            type: 'integer',
        },
        notes: {
            type: 'text',
        },
        started_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.createIndex('workouts', 'user_id');
    pgm.createIndex('workouts', 'started_at');
};

exports.down = (pgm) => {
    pgm.dropTable('workouts');
    pgm.dropTable('sleep_logs');
};
