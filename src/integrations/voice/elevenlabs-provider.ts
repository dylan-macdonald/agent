/**
 * ElevenLabs TTS Provider
 *
 * Provides Text-to-Speech capabilities using ElevenLabs API
 */

import {
  IVoiceProvider,
  SynthesisResult,
  TranscriptionResult,
} from "../../types/voice.js";
import { logger } from "../../utils/logger.js";

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
}

export class ElevenLabsVoiceProvider implements IVoiceProvider {
  readonly name = "ElevenLabs";
  private readonly baseUrl = "https://api.elevenlabs.io/v1";

  constructor(private config: ElevenLabsConfig) {}

  /**
   * Transcribe (STT) - Not supported by ElevenLabs
   */
  async transcribe(_audioBuffer: Buffer): Promise<TranscriptionResult> {
    throw new Error("Transcription not supported by ElevenLabs provider");
  }

  /**
   * Synthesize (TTS)
   */
  async synthesize(text: string, voiceId?: string): Promise<SynthesisResult> {
    const selectedVoiceId =
      voiceId || this.config.voiceId || "21m00Tcm4TlvDq8ikWAM"; // Default: Rachel
    const url = `${this.baseUrl}/text-to-speech/${selectedVoiceId}`;

    logger.info(
      `Synthesizing text with ElevenLabs: ${text.substring(0, 20)}...`
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": this.config.apiKey,
          "Content-Type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: this.config.modelId || "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`ElevenLabs API error: ${JSON.stringify(error)}`);
      }

      const audioArrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(audioArrayBuffer);

      return {
        audioBuffer,
        providerId: selectedVoiceId,
      };
    } catch (error) {
      logger.error(`ElevenLabs synthesis failed: ${(error as Error).message}`);
      throw error;
    }
  }
}
