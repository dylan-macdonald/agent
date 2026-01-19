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
  // Create memories table
  pgm.createTable('memories', {
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
      type: 'varchar(20)',
      notNull: true,
      comment: 'Memory type: fact, observation, pattern, preference, conversation, event',
    },
    content: {
      type: 'text',
      notNull: true,
      comment: 'Encrypted memory content',
    },
    summary: {
      type: 'varchar(500)',
      comment: 'Short unencrypted summary for quick lookup',
    },
    importance: {
      type: 'integer',
      notNull: true,
      default: 2,
      comment: 'Importance level: 1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
      comment: 'Status: active, archived, expired, deleted',
    },
    tags: {
      type: 'text[]',
      default: '{}',
      comment: 'Searchable tags array',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
      comment: 'Additional structured metadata',
    },
    source: {
      type: 'varchar(50)',
      comment: 'Source of memory: sms, web, conversation, system',
    },
    related_memory_ids: {
      type: 'uuid[]',
      default: '{}',
      comment: 'IDs of related memories',
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
    expires_at: {
      type: 'timestamp',
      comment: 'Auto-archive after this date',
    },
    last_accessed_at: {
      type: 'timestamp',
      comment: 'Last time this memory was retrieved',
    },
    access_count: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of times this memory has been retrieved',
    },
  });

  // Create indexes for efficient querying
  pgm.createIndex('memories', 'user_id');
  pgm.createIndex('memories', 'type');
  pgm.createIndex('memories', 'status');
  pgm.createIndex('memories', 'importance');
  pgm.createIndex('memories', 'created_at');
  pgm.createIndex('memories', 'expires_at');
  pgm.createIndex('memories', 'last_accessed_at');

  // Create composite index for common query pattern
  pgm.createIndex('memories', ['user_id', 'status', 'type']);

  // Create GIN index for tags array
  pgm.createIndex('memories', 'tags', {
    method: 'gin',
  });

  // Create GIN index for JSONB metadata
  pgm.createIndex('memories', 'metadata', {
    method: 'gin',
  });

  // Create full-text search index for content search
  pgm.sql(`
    CREATE INDEX memories_summary_search_idx ON memories
    USING gin(to_tsvector('english', coalesce(summary, '')))
  `);

  // Create trigger to automatically update updated_at
  pgm.createTrigger('memories', 'update_memories_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Drop trigger
  pgm.dropTrigger('memories', 'update_memories_updated_at', { ifExists: true });

  // Drop table
  pgm.dropTable('memories', { ifExists: true });
};
