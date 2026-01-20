/**
 * Migration: Add user API keys table
 *
 * Creates a table to store encrypted API keys for external services
 * (Anthropic, OpenAI, Twilio, ElevenLabs, etc.)
 */

exports.up = (pgm) => {
  // Create user_api_keys table
  pgm.createTable("user_api_keys", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      primaryKey: true,
    },
    user_id: {
      type: "varchar(255)",
      notNull: true,
    },
    provider: {
      type: "varchar(50)",
      notNull: true,
      comment: "Provider name: anthropic, openai, twilio, elevenlabs",
    },
    encrypted_key: {
      type: "text",
      notNull: true,
      comment: "AES-256-GCM encrypted API key",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  // Add unique constraint on user_id + provider
  pgm.addConstraint("user_api_keys", "user_api_keys_user_provider_unique", {
    unique: ["user_id", "provider"],
  });

  // Add index for faster lookups
  pgm.createIndex("user_api_keys", "user_id");

  // Add check constraint for valid providers
  pgm.addConstraint("user_api_keys", "user_api_keys_valid_provider", {
    check: "provider IN ('anthropic', 'openai', 'twilio', 'elevenlabs', 'picovoice')",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("user_api_keys");
};
