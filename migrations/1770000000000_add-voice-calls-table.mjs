/**
 * Migration: Add voice_calls table
 *
 * Creates the voice_calls table for tracking Twilio voice alarm calls.
 */

export async function up(pgm) {
    // Create voice_calls table
    pgm.createTable('voice_calls', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()')
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE'
        },
        call_sid: {
            type: 'varchar(64)',
            comment: 'Twilio Call SID'
        },
        phone_number: {
            type: 'varchar(20)',
            notNull: true
        },
        type: {
            type: 'varchar(20)',
            notNull: true,
            default: 'wake_up',
            comment: 'Call type: wake_up, reminder, urgent, check_in'
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: 'queued',
            comment: 'Call status: queued, ringing, in-progress, completed, busy, no-answer, failed, canceled'
        },
        message: {
            type: 'text',
            notNull: true,
            comment: 'Message spoken during the call'
        },
        duration: {
            type: 'integer',
            comment: 'Call duration in seconds'
        },
        cost: {
            type: 'decimal(10,4)',
            comment: 'Call cost in USD'
        },
        acknowledged: {
            type: 'boolean',
            notNull: true,
            default: false,
            comment: 'Whether user acknowledged the call'
        },
        retry_count: {
            type: 'integer',
            notNull: true,
            default: 0
        },
        related_id: {
            type: 'uuid',
            comment: 'Related reminder/insight ID if applicable'
        },
        error_message: {
            type: 'text'
        },
        scheduled_at: {
            type: 'timestamp with time zone'
        },
        started_at: {
            type: 'timestamp with time zone'
        },
        ended_at: {
            type: 'timestamp with time zone'
        },
        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('NOW()')
        },
        updated_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('NOW()')
        }
    });

    // Create indexes
    pgm.createIndex('voice_calls', 'user_id');
    pgm.createIndex('voice_calls', 'call_sid');
    pgm.createIndex('voice_calls', 'status');
    pgm.createIndex('voice_calls', 'created_at');
}

export async function down(pgm) {
    pgm.dropTable('voice_calls');
}
