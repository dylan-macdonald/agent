/**
 * Qwen3-TTS Provider
 * Uses Qwen3-TTS for high-quality, fast, offline text-to-speech
 * https://huggingface.co/Qwen/Qwen3-TTS
 */

import { IVoiceProvider } from "../../types/voice.js";
import { logger } from "../../utils/logger.js";
import { writeFile, readFile, unlink } from "fs/promises";
import { spawn } from "child_process";
import path from "path";

interface Qwen3Config {
  pythonPath?: string; // Path to Python binary
  modelPath?: string; // Path to downloaded Qwen3-TTS model (optional, auto-downloads)
  voiceId?: string; // Voice variant (if model supports multiple)
  speed?: number; // Speech speed (0.5 - 2.0, default 1.0)
  temperature?: number; // Sampling temperature for variety
}

export class Qwen3TtsProvider implements IVoiceProvider {
  private config: Qwen3Config;

  constructor(config: Qwen3Config = {}) {
    this.config = {
      pythonPath: config.pythonPath || "python3",
      speed: config.speed || 1.0,
      temperature: config.temperature || 0.7,
      ...config,
    };
  }

  /**
   * Convert text to speech using Qwen3-TTS
   */
  async textToSpeech(text: string): Promise<Buffer> {
    const tempTextPath = path.join(process.cwd(), `.agent/temp_text_${Date.now()}.txt`);
    const tempWavPath = path.join(process.cwd(), `.agent/temp_audio_${Date.now()}.wav`);

    try {
      // Write text to temp file
      await writeFile(tempTextPath, text, 'utf-8');

      // Run Qwen3-TTS Python script
      await this.runQwen3TTS(tempTextPath, tempWavPath);

      // Read generated WAV file
      const audioBuffer = await readFile(tempWavPath);

      return audioBuffer;
    } catch (error) {
      logger.error("Qwen3-TTS failed", { error });
      throw new Error(`Qwen3-TTS failed: ${(error as Error).message}`);
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
   * Run Qwen3-TTS Python script
   */
  private async runQwen3TTS(textPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Path to our Python TTS script
      const scriptPath = path.join(process.cwd(), "scripts", "qwen3_tts.py");

      const args = [
        scriptPath,
        "--text-file", textPath,
        "--output", outputPath,
        "--speed", String(this.config.speed || 1.0),
      ];

      // Add optional parameters
      if (this.config.modelPath) {
        args.push("--model-path", this.config.modelPath);
      }

      if (this.config.voiceId) {
        args.push("--voice", this.config.voiceId);
      }

      if (this.config.temperature !== undefined) {
        args.push("--temperature", String(this.config.temperature));
      }

      const python = spawn(this.config.pythonPath || "python3", args);

      let errorOutput = "";

      python.stdout.on("data", (data: Buffer) => {
        logger.debug(`Qwen3-TTS: ${data.toString().trim()}`);
      });

      python.stderr.on("data", (data: Buffer) => {
        errorOutput += data.toString();
        logger.debug(`Qwen3-TTS stderr: ${data.toString().trim()}`);
      });

      python.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Qwen3-TTS exited with code ${code}: ${errorOutput}`));
        }
      });

      python.on("error", (err) => {
        reject(new Error(`Failed to start Qwen3-TTS Python script: ${err.message}`));
      });
    });
  }

  /**
   * STT not supported by this provider
   */
  async speechToText(_audioBuffer: Buffer): Promise<string> {
    throw new Error("STT not supported by Qwen3-TTS provider");
  }
}
