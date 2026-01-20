/**
 * Migration: Voice Tables
 *
 * Creates tables for voice messages and privacy settings
 */

export const up = (pgm) => {
  // Voice Privacy Settings
  pgm.createTable("voice_privacy_settings", {
    user_id: {
      type: "uuid",
      primaryKey: true,
      references: "users",
      onDelete: "CASCADE",
    },
    voice_enabled: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    retention_days: {
      type: "integer",
      notNull: true,
      default: 30,
    },
    auto_delete_transcripts: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  // Voice Messages
  pgm.createTable("voice_messages", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    direction: {
      type: "varchar(20)",
      notNull: true,
    },
    status: {
      type: "varchar(20)",
      notNull: true,
    },
    audio_url: {
      type: "text",
    },
    transcript: {
      type: "text", // Encrypted
    },
    duration_ms: {
      type: "integer",
    },
    provider_name: {
      type: "varchar(50)",
    },
    metadata: {
      type: "jsonb",
      default: "{}",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  // Voice Audit Log
  pgm.createTable("voice_audit_log", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    action: {
      type: "varchar(50)",
      notNull: true,
    },
    details: {
      type: "jsonb",
      default: "{}",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.createIndex("voice_messages", "user_id");
  pgm.createIndex("voice_messages", "created_at");
  pgm.createIndex("voice_audit_log", "user_id");
};

export const down = (pgm) => {
  pgm.dropTable("voice_audit_log");
  pgm.dropTable("voice_messages");
  pgm.dropTable("voice_privacy_settings");
};
