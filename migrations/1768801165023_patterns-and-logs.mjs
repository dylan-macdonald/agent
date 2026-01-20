/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Create patterns table
  pgm.createTable('patterns', {
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
    type: {
      type: 'varchar(30)',
      notNull: true,
      comment: 'Pattern type: sleep_wake, activity, location, communication, preference, routine',
    },
    name: {
      type: 'varchar(200)',
      notNull: true,
      comment: 'Human-readable pattern name',
    },
    description: {
      type: 'text',
      comment: 'Detailed pattern description',
    },
    recurrence: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Recurrence type: daily, weekly, monthly, weekday, weekend, custom',
    },
    confidence: {
      type: 'decimal(3,2)',
      notNull: true,
      default: 0.5,
      comment: 'Confidence score 0.00-1.00',
    },
    data_points: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of observations supporting this pattern',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
      comment: 'Pattern-specific metadata',
    },
    active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Whether pattern is active',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    last_observed_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
      comment: 'Last time this pattern was observed',
    },
  });

  // Create indexes for patterns
  pgm.createIndex('patterns', 'user_id');
  pgm.createIndex('patterns', 'type');
  pgm.createIndex('patterns', 'recurrence');
  pgm.createIndex('patterns', 'confidence');
  pgm.createIndex('patterns', 'active');
  pgm.createIndex('patterns', ['user_id', 'type', 'active']);

  // Create GIN index for JSONB metadata
  pgm.createIndex('patterns', 'metadata', {
    method: 'gin',
  });

  // Create trigger to automatically update updated_at
  pgm.createTrigger('patterns', 'update_patterns_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });

  // Create sleep_wake_logs table
  pgm.createTable('sleep_wake_logs', {
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
    sleep_time: {
      type: 'timestamp',
      notNull: true,
      comment: 'When user went to sleep',
    },
    wake_time: {
      type: 'timestamp',
      notNull: true,
      comment: 'When user woke up',
    },
    duration: {
      type: 'integer',
      notNull: true,
      comment: 'Sleep duration in minutes',
    },
    quality: {
      type: 'decimal(3,2)',
      comment: 'Sleep quality score 0.00-1.00',
    },
    notes: {
      type: 'text',
      comment: 'Optional notes about sleep',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create indexes for sleep_wake_logs
  pgm.createIndex('sleep_wake_logs', 'user_id');
  pgm.createIndex('sleep_wake_logs', 'sleep_time');
  pgm.createIndex('sleep_wake_logs', 'wake_time');
  pgm.createIndex('sleep_wake_logs', ['user_id', 'sleep_time']);

  // Create activity_logs table
  pgm.createTable('activity_logs', {
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
    activity_type: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'Type of activity: exercise, work, meal, etc.',
    },
    start_time: {
      type: 'timestamp',
      notNull: true,
      comment: 'When activity started',
    },
    end_time: {
      type: 'timestamp',
      comment: 'When activity ended',
    },
    duration: {
      type: 'integer',
      comment: 'Activity duration in minutes',
    },
    location: {
      type: 'varchar(200)',
      comment: 'Where activity took place',
    },
    intensity: {
      type: 'varchar(10)',
      comment: 'Activity intensity: low, medium, high',
    },
    notes: {
      type: 'text',
      comment: 'Optional notes about activity',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create indexes for activity_logs
  pgm.createIndex('activity_logs', 'user_id');
  pgm.createIndex('activity_logs', 'activity_type');
  pgm.createIndex('activity_logs', 'start_time');
  pgm.createIndex('activity_logs', ['user_id', 'activity_type']);
  pgm.createIndex('activity_logs', ['user_id', 'start_time']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Drop triggers
  pgm.dropTrigger('patterns', 'update_patterns_updated_at', { ifExists: true });

  // Drop tables
  pgm.dropTable('activity_logs', { ifExists: true });
  pgm.dropTable('sleep_wake_logs', { ifExists: true });
  pgm.dropTable('patterns', { ifExists: true });
};
