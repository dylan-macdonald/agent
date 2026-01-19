# Database Migrations

This directory contains database migrations managed by [node-pg-migrate](https://github.com/salsita/node-pg-migrate).

## Prerequisites

1. PostgreSQL database running
2. `.env` file with `DATABASE_URL` configured
3. Database user has permissions to create tables, functions, and triggers

## Running Migrations

### Apply all pending migrations

```bash
npm run migrate:up
```

### Rollback last migration

```bash
npm run migrate:down
```

### Create new migration

```bash
npm run migrate:create my-migration-name
```

## Migration Files

- `1768796218558_initial-schema.js` - Creates initial schema with users and user_settings tables

## Initial Schema

### Tables Created

#### `users`

- `id` (UUID, primary key)
- `phone_number` (varchar, unique, encrypted)
- `phone_verified` (boolean)
- `timezone` (varchar)
- `active` (boolean)
- `created_at`, `updated_at`, `last_active_at` (timestamps)

#### `user_settings`

- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `category` (varchar) - e.g., preferences, notifications, privacy, health
- `key` (varchar) - setting name
- `value` (text) - JSON or encrypted string
- `value_type` (varchar) - type indicator
- `created_at`, `updated_at` (timestamps)

### Triggers

- Automatic `updated_at` timestamp updates on both tables

### Indexes

- `users.phone_number` - Fast phone number lookups
- `user_settings(user_id, category, key)` - Unique constraint and fast lookups
- `user_settings.user_id` - Foreign key index

## Testing Migrations

To test migration up/down cycle:

```bash
# Apply migration
npm run migrate:up

# Verify tables were created
psql $DATABASE_URL -c "\dt"

# Rollback migration
npm run migrate:down

# Verify tables were dropped
psql $DATABASE_URL -c "\dt"
```

## Notes

- Migration files use ES modules (`.js` with `export` statements)
- All migrations must include both `up` and `down` functions
- The `down` function should cleanly reverse the `up` function
- Migrations run in order based on timestamp in filename
