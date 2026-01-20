/**
 * Migration: SMS Messages
 *
 * Creates the sms_messages table for storing SMS communication
 */

exports.up = (pgm) => {
  // SMS messages table
  pgm.createTable('sms_messages', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    direction: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'inbound or outbound',
    },
    from_number: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'E.164 format phone number',
    },
    to_number: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'E.164 format phone number',
    },
    body: {
      type: 'text',
      notNull: true,
      comment: 'Message content',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'pending, queued, sent, delivered, failed, undelivered',
    },
    priority: {
      type: 'varchar(20)',
      notNull: true,
      default: 'normal',
      comment: 'low, normal, high, urgent',
    },
    provider_id: {
      type: 'varchar(100)',
      comment: 'ID from SMS provider (Twilio SID, etc.)',
    },
    provider_name: {
      type: 'varchar(50)',
      comment: 'Which provider sent this message',
    },
    error_code: {
      type: 'varchar(50)',
      comment: 'Error code if failed',
    },
    error_message: {
      type: 'text',
      comment: 'Error message if failed',
    },
    sent_at: {
      type: 'timestamp',
      comment: 'When message was sent',
    },
    delivered_at: {
      type: 'timestamp',
      comment: 'When message was delivered',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Indexes for efficient querying
  pgm.createIndex('sms_messages', 'user_id');
  pgm.createIndex('sms_messages', 'direction');
  pgm.createIndex('sms_messages', 'status');
  pgm.createIndex('sms_messages', 'created_at');
  pgm.createIndex('sms_messages', ['user_id', 'direction']);
  pgm.createIndex('sms_messages', ['user_id', 'created_at']);

  // Composite index for rate limiting queries
  pgm.createIndex('sms_messages', ['user_id', 'direction', 'created_at'], {
    name: 'idx_sms_rate_limiting',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('sms_messages');
};
