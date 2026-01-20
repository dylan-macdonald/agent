/**
 * Voice Communication Types
 *
 * Defines structures for voice messages, transcription, and synthesis
 */

export enum VoiceMessageDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

export enum VoiceMessageStatus {
  PENDING = "pending",
  RECORDING = "recording",
  TRANSCRIBING = "transcribing",
  PROCESSING = "processing",
  SYNTHESIZING = "synthesizing",
  READY = "ready",
  PLAYING = "playing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface VoiceMessage {
  id: string;
  userId: string;
  direction: VoiceMessageDirection;
  status: VoiceMessageStatus;
  audioUrl?: string; // Path to encrypted audio file
  transcript?: string; // Encrypted transcript
  durationMs?: number;
  providerName?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoicePrivacySettings {
  userId: string;
  voiceEnabled: boolean;
  retentionDays: number; // 0 = indefinite
  autoDeleteTranscripts: boolean;
  updatedAt: Date;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

export interface SynthesisResult {
  audioBuffer: Buffer;
  audioUrl?: string;
  providerId?: string;
}

export interface IVoiceProvider {
  readonly name: string;

  /**
   * Transcribe audio to text (STT)
   */
  transcribe(audioBuffer: Buffer): Promise<TranscriptionResult>;

  /**
   * Synthesize text to audio (TTS)
   */
  synthesize(text: string, voiceProfile?: string): Promise<SynthesisResult>;
}
