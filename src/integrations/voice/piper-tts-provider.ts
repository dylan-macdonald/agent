/**
 * Piper TTS Provider
 * Uses Piper TTS for high-quality, fast, offline text-to-speech
 * https://github.com/rhasspy/piper
 */

import { IVoiceProvider } from "../../types/voice.js";
import { logger } from "../../utils/logger.js";
import { writeFile, readFile, unlink } from "fs/promises";
import { spawn } from "child_process";
import path from "path";

interface PiperConfig {
  modelPath: string; // Path to the .onnx model file
  configPath?: string; // Path to model config JSON (usually same name as model)
  speakerId?: number; // For multi-speaker models
  lengthScale?: number; // Speed control (1.0 = normal, <1.0 = faster, >1.0 = slower)
  sentenceSilence?: number; // Silence between sentences in seconds
}

export class PiperTTSProvider implements IVoiceProvider {
  private config: PiperConfig;

  constructor(config: PiperConfig) {
    this.config = {
      lengthScale: 1.0,
      sentenceSilence: 0.2,
      ...config,
    };

    // Auto-detect config path if not provided
    if (!this.config.configPath && this.config.modelPath.endsWith('.onnx')) {
      this.config.configPath = this.config.modelPath + '.json';
    }
  }

  /**
   * Convert text to speech using Piper TTS
   */
  async textToSpeech(text: string): Promise<Buffer> {
    const tempTextPath = path.join(process.cwd(), `.agent/temp_text_${Date.now()}.txt`);
    const tempWavPath = path.join(process.cwd(), `.agent/temp_audio_${Date.now()}.wav`);

    try {
      // Write text to temp file
      await writeFile(tempTextPath, text, 'utf-8');

      // Run Piper TTS
      await this.runPiper(tempTextPath, tempWavPath);

      // Read generated WAV file
      const audioBuffer = await readFile(tempWavPath);

      return audioBuffer;
    } catch (error) {
      logger.error("Piper TTS failed", { error });
      throw new Error(`Piper TTS failed: ${(error as Error).message}`);
    } finally {
      // Clean up temp files
      try {
        await unlink(tempTextPath);
        await unlink(tempWavPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Run Piper TTS binary
   */
  private async runPiper(textPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Piper binary path
      // Assumes 'piper' is in PATH, or set PIPER_BINARY_PATH env var
      const piperBinary = process.env.PIPER_BINARY_PATH || "piper";

      const args = [
        "--model", this.config.modelPath,
        "--output_file", outputPath,
      ];

      // Add config if specified
      if (this.config.configPath) {
        args.push("--config", this.config.configPath);
      }

      // Add optional parameters
      if (this.config.speakerId !== undefined) {
        args.push("--speaker", String(this.config.speakerId));
      }

      if (this.config.lengthScale !== undefined) {
        args.push("--length_scale", String(this.config.lengthScale));
      }

      if (this.config.sentenceSilence !== undefined) {
        args.push("--sentence_silence", String(this.config.sentenceSilence));
      }

      const piper = spawn(piperBinary, args);

      let errorOutput = "";

      // Pipe text to stdin
      piper.stdin.write(textPath);
      piper.stdin.end();

      piper.stderr.on("data", (data: Buffer) => {
        errorOutput += data.toString();
        logger.debug(`Piper: ${data.toString().trim()}`);
      });

      piper.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Piper exited with code ${code}: ${errorOutput}`));
        }
      });

      piper.on("error", (err) => {
        reject(new Error(`Failed to start Piper: ${err.message}`));
      });
    });
  }

  /**
   * STT not supported by this provider
   */
  async speechToText(_audioBuffer: Buffer): Promise<string> {
    throw new Error("STT not supported by Piper TTS provider");
  }
}
