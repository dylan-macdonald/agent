/**
 * OpenAI Voice Provider (Whisper)
 *
 * Provides Speech-to-Text capabilities using OpenAI Whisper API
 */

import {
  IVoiceProvider,
  SynthesisResult,
  TranscriptionResult,
} from "../../types/voice.js";
import { logger } from "../../utils/logger.js";

export interface OpenAiVoiceConfig {
  apiKey: string;
  model?: string;
}

export class OpenAiVoiceProvider implements IVoiceProvider {
  readonly name = "OpenAI";
  private readonly baseUrl = "https://api.openai.com/v1";

  constructor(private config: OpenAiVoiceConfig) {}

  /**
   * Transcribe (STT)
   */
  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    const url = `${this.baseUrl}/audio/transcriptions`;

    // Create form data for file upload
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
    formData.append("file", blob, "audio.mp3");
    formData.append("model", this.config.model || "whisper-1");

    logger.info("Transcribing audio with OpenAI Whisper...");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }

      const result = (await response.json()) as {
        text: string;
        language?: string;
        duration?: number;
      };

      return {
        text: result.text,
        confidence: 1.0, // Whisper doesn't return confidence per segment easily via simple API
        language: result.language || "en",
        duration: result.duration || 0,
      };
    } catch (error) {
      logger.error(`OpenAI transcription failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Synthesize (TTS) - Also supported by OpenAI, but we prefer ElevenLabs for now
   */
  async synthesize(text: string, voice?: string): Promise<SynthesisResult> {
    const url = `${this.baseUrl}/audio/speech`;

    logger.info(`Synthesizing text with OpenAI: ${text.substring(0, 20)}...`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: voice || "alloy",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI TTS error: ${JSON.stringify(error)}`);
      }

      const audioArrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(audioArrayBuffer);

      return {
        audioBuffer,
      };
    } catch (error) {
      logger.error(`OpenAI synthesis failed: ${(error as Error).message}`);
      throw error;
    }
  }
}
