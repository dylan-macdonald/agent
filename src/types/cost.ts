/**
 * Cost Tracking Types
 */

export enum ProviderType {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  TWILIO = "twilio",
  ELEVENLABS = "elevenlabs",
}

export enum ModelType {
  GPT_4 = "gpt-4",
  GPT_3_5 = "gpt-3.5",
  CLAUDE_3_OPUS = "claude-3-opus",
  CLAUDE_3_SONNET = "claude-3-sonnet",
  WHISPER = "whisper",
  TTS = "tts",
  SMS = "sms",
}

export interface CostEntry {
  id: string;
  provider: ProviderType;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  units?: number; // e.g., messages for Twilio, characters for ElevenLabs
  costUsd: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ProviderCostSummary {
  provider: ProviderType;
  totalCostUsd: number;
  entryCount: number;
}

export interface CostSummary {
  totalCostUsd: number;
  byProvider: ProviderCostSummary[];
  timeRange: {
    start: Date;
    end: Date;
  };
}
