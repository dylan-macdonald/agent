/**
 * Migration: Add Goals Table
 */

export const up = (pgm) => {
    pgm.createTable('goals', {
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
        target_date: {
            type: 'timestamptz',
        },
        status: {
            type: 'varchar(50)',
            notNull: true,
            default: 'IN_PROGRESS', // IN_PROGRESS, COMPLETED, ABANDONED
        },
        progress: {
            type: 'integer',
            notNull: true,
            default: 0,
            check: 'progress >= 0 AND progress <= 100',
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

    pgm.createIndex('goals', 'user_id');
    pgm.createIndex('goals', 'status');
};

export const down = (pgm) => {
    pgm.dropTable('goals');
};
