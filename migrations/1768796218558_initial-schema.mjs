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
  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    phone_number: {
      type: 'varchar(20)',
      notNull: true,
      unique: true,
      comment: 'User phone number (encrypted)',
    },
    phone_verified: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    timezone: {
      type: 'varchar(50)',
      default: 'UTC',
    },
    active: {
      type: 'boolean',
      notNull: true,
      default: true,
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
    last_active_at: {
      type: 'timestamp',
    },
  });

  // Create index on phone_number for fast lookups
  pgm.createIndex('users', 'phone_number');

  // Create user_settings table
  pgm.createTable('user_settings', {
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
      type: 'varchar(50)',
      notNull: true,
      comment: 'Setting category: preferences, notifications, privacy, health, etc.',
    },
    key: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'Setting key',
    },
    value: {
      type: 'text',
      comment: 'Setting value (JSON or encrypted string)',
    },
    value_type: {
      type: 'varchar(20)',
      notNull: true,
      default: 'string',
      comment: 'Type: string, number, boolean, json, encrypted',
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
  });

  // Create composite unique index on user_id, category, and key
  pgm.createIndex('user_settings', ['user_id', 'category', 'key'], {
    unique: true,
  });

  // Create index on user_id for fast lookups
  pgm.createIndex('user_settings', 'user_id');

  // Create updated_at trigger function
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
      NEW.updated_at = current_timestamp;
      RETURN NEW;
    END;
    `
  );

  // Create triggers to automatically update updated_at
  pgm.createTrigger('users', 'update_users_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });

  pgm.createTrigger('user_settings', 'update_user_settings_updated_at', {
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
  // Drop triggers
  pgm.dropTrigger('user_settings', 'update_user_settings_updated_at', {
    ifExists: true,
  });
  pgm.dropTrigger('users', 'update_users_updated_at', { ifExists: true });

  // Drop function
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });

  // Drop tables (user_settings first due to foreign key)
  pgm.dropTable('user_settings', { ifExists: true });
  pgm.dropTable('users', { ifExists: true });
};
