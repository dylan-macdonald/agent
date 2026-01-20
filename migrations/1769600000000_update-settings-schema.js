/**
 * Migration: Update settings schema
 *
 * Adds fields for AI personalization and updates allowed API providers
 */

export const up = (pgm) => {
    // Add new columns to user_settings
    pgm.addColumns("user_settings", {
        llm_provider: {
            type: "varchar(50)",
            notNull: true,
            default: "anthropic",
            comment: "Selected LLM provider: anthropic, openai",
        },
        username: {
            type: "varchar(100)",
            comment: "Preferred name for the AI to use",
        },
        phone_number: {
            type: "varchar(20)",
            comment: "User phone number for SMS features",
        },
    });

    // Update constraint on user_api_keys to allow 'exa'
    pgm.dropConstraint("user_api_keys", "user_api_keys_valid_provider");
    pgm.addConstraint("user_api_keys", "user_api_keys_valid_provider", {
        check:
            "provider IN ('anthropic', 'openai', 'twilio', 'elevenlabs', 'picovoice', 'exa')",
    });
};

export const down = (pgm) => {
    // Revert columns
    pgm.dropColumns("user_settings", ["llm_provider", "username", "phone_number"]);

    // Revert constraint
    pgm.dropConstraint("user_api_keys", "user_api_keys_valid_provider");
    pgm.addConstraint("user_api_keys", "user_api_keys_valid_provider", {
        check:
            "provider IN ('anthropic', 'openai', 'twilio', 'elevenlabs', 'picovoice')",
    });
};
