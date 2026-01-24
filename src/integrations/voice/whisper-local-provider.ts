/**
 * Local Whisper STT Provider
 * Uses whisper.cpp via Node bindings for offline speech-to-text
 */

import { IVoiceProvider } from "../../types/voice.js";
import { logger } from "../../utils/logger.js";
import { writeFile, unlink } from "fs/promises";
import { spawn } from "child_process";
import path from "path";

interface WhisperConfig {
  modelPath: string; // Path to the .bin model file
  language?: string; // Language code (e.g., 'en', 'es')
  threads?: number; // Number of threads to use
}

export class WhisperLocalProvider implements IVoiceProvider {
  private config: WhisperConfig;

  constructor(config: WhisperConfig) {
    this.config = {
      language: "en",
      threads: 4,
      ...config,
    };
  }

  /**
   * Transcribe audio buffer to text using whisper.cpp
   */
  async speechToText(audioBuffer: Buffer): Promise<string> {
    const tempWavPath = path.join(process.cwd(), `.agent/temp_audio_${Date.now()}.wav`);

    try {
      // Write audio buffer to temporary file
      await writeFile(tempWavPath, audioBuffer);

      // Call whisper.cpp binary
      const transcript = await this.runWhisper(tempWavPath);

      return transcript.trim();
    } catch (error) {
      logger.error("Whisper STT failed", { error });
      throw new Error(`Whisper transcription failed: ${(error as Error).message}`);
    } finally {
      // Clean up temp file
      try {
        await unlink(tempWavPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Run whisper.cpp executable
   */
  private async runWhisper(audioPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Whisper.cpp command
      // Assumes whisper.cpp is installed and 'whisper' binary is in PATH
      // Or use './whisper.cpp/main' if built locally
      const whisperBinary = process.env.WHISPER_BINARY_PATH || "whisper-cpp";

      const args = [
        "-m", this.config.modelPath,
        "-f", audioPath,
        "-l", this.config.language || "en",
        "-t", String(this.config.threads || 4),
        "--no-timestamps", // Just get the text
        "--print-colors", "false",
      ];

      const whisper = spawn(whisperBinary, args);

      let output = "";
      let errorOutput = "";

      whisper.stdout.on("data", (data: Buffer) => {
        output += data.toString();
      });

      whisper.stderr.on("data", (data: Buffer) => {
        errorOutput += data.toString();
        // Whisper outputs progress to stderr, so log it
        logger.debug(`Whisper: ${data.toString().trim()}`);
      });

      whisper.on("close", (code) => {
        if (code === 0) {
          // Extract transcript from output
          // Whisper.cpp outputs format: "[timestamp] text"
          // We want just the text
          const lines = output.split("\n").filter(line => line.trim());
          const transcript = lines
            .map(line => line.replace(/^\[\d+:\d+.\d+ --> \d+:\d+.\d+\]\s*/, ""))
            .join(" ")
            .trim();

          resolve(transcript || "");
        } else {
          reject(new Error(`Whisper exited with code ${code}: ${errorOutput}`));
        }
      });

      whisper.on("error", (err) => {
        reject(new Error(`Failed to start Whisper: ${err.message}`));
      });
    });
  }

  /**
   * TTS not supported by this provider
   */
  async textToSpeech(_text: string): Promise<Buffer> {
    throw new Error("TTS not supported by Whisper provider");
  }
}
