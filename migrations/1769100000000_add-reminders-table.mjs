/**
 * Migration: Add Reminders Table
 */

export const up = (pgm) => {
    pgm.createTable('reminders', {
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
        due_at: {
            type: 'timestamptz',
            notNull: true,
        },
        is_recurring: {
            type: 'boolean',
            default: false,
        },
        recurrence_rule: {
            type: 'text',
        },
        status: {
            type: 'varchar(50)',
            notNull: true,
            default: 'PENDING', // PENDING, SENT, FAILED, COMPLETED, CANCELLED
        },
        delivery_method: {
            type: 'varchar(50)',
            notNull: true,
            default: 'SMS', // SMS, VOICE, BOTH
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

    pgm.createIndex('reminders', 'user_id');
    pgm.createIndex('reminders', 'status');
    pgm.createIndex('reminders', 'due_at'); // Critical for polling
    pgm.createIndex('reminders', ['user_id', 'status']);
};

export const down = (pgm) => {
    pgm.dropTable('reminders');
};
