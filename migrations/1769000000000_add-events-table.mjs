/**
 * Migration: Add Events Table
 */

export const up = (pgm) => {
    pgm.createTable('events', {
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
        title: {
            type: 'varchar(255)',
            notNull: true,
        },
        description: {
            type: 'text',
        },
        start_time: {
            type: 'timestamptz',
            notNull: true,
        },
        end_time: {
            type: 'timestamptz',
            notNull: true,
        },
        is_all_day: {
            type: 'boolean',
            default: false,
        },
        recurrence_rule: {
            type: 'text',
        },
        location: {
            type: 'varchar(255)',
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.createIndex('events', 'user_id');
    pgm.createIndex('events', ['user_id', 'start_time']);
};

export const down = (pgm) => {
    pgm.dropTable('events');
};
