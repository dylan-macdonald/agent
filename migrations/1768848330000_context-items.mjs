/**
 * Migration: Context Items
 *
 * Creates the context_items table for storing aggregated context
 */

export const up = (pgm) => {
  // Context items table
  pgm.createTable('context_items', {
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
    category: {
      type: 'varchar(30)',
      notNull: true,
      comment: 'Context category (current_state, recent_activity, patterns, etc.)',
    },
    relevance: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Relevance level (critical, high, medium, low, minimal)',
    },
    relevance_score: {
      type: 'decimal(3,2)',
      notNull: true,
      comment: 'Calculated relevance score (0-1)',
    },
    time_window: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Time window (now, recent, today, this_week, etc.)',
    },
    timestamp: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
      comment: 'When this context was created/observed',
    },
    expires_at: {
      type: 'timestamp',
      comment: 'When this context becomes stale',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
      comment: 'Context-specific data (memory, pattern, state, etc.)',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Indexes for efficient querying
  pgm.createIndex('context_items', 'user_id');
  pgm.createIndex('context_items', 'category');
  pgm.createIndex('context_items', 'relevance_score');
  pgm.createIndex('context_items', 'expires_at');
  pgm.createIndex('context_items', ['user_id', 'category']);
  pgm.createIndex('context_items', ['user_id', 'relevance_score']);
  pgm.createIndex('context_items', 'metadata', { method: 'gin' });

  // Composite index for common queries
  pgm.createIndex('context_items', ['user_id', 'category', 'expires_at'], {
    name: 'idx_context_user_category_expiry',
  });
};

export const down = (pgm) => {
  pgm.dropTable('context_items');
};
