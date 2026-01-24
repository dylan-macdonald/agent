import { Porcupine, BuiltinKeyword, getBuiltinKeywordPath } from "@picovoice/porcupine-node";
import recorder from "node-record-lpcm16";
import log from "electron-log";
import { EventEmitter } from "events";

export enum AudioState {
  IDLE = "IDLE",
  LISTENING_WAKE = "LISTENING_WAKE",
  LISTENING_ACTIVE = "LISTENING_ACTIVE",
  PROCESSING = "PROCESSING",
  PLAYING = "PLAYING",
}

export class AudioManager extends EventEmitter {
  private porcupine: Porcupine | null = null;
  private state: AudioState = AudioState.IDLE;
  private audioBuffer: number[] = [];
  private recording: any = null;

  constructor(private accessKey: string) {
    super();
  }

  async init() {
    try {
      // Initialize Porcupine with "Hey Claude" or built-in keywords
      this.porcupine = new Porcupine(
        this.accessKey,
        [getBuiltinKeywordPath(BuiltinKeyword.COMPUTER)], // keywords (paths)
        [0.5] // sensitivities
      );

      log.info(`Porcupine initialized. Frame length: ${this.porcupine.frameLength}`);
    } catch (error) {
      log.error(`Failed to init Porcupine: ${(error as Error).message}`);
    }
  }

  start() {
    if (!this.porcupine || this.state !== AudioState.IDLE) return;

    this.state = AudioState.LISTENING_WAKE;
    this.emit("state-change", this.state);

    // Detect platform and use appropriate recorder
    const isWindows = process.platform === "win32";
    const recorderBinary = isWindows ? "sox" : "rec"; // On Windows, use sox if available

    this.recording = recorder.record({
      sampleRate: this.porcupine.sampleRate,
      channels: 1,
      device: null,
      recorder: recorderBinary,
      // Windows-specific: use default audio device
      ...(isWindows && { audioType: "waveaudio" })
    });

    this.recording.stream().on("data", (chunk: Buffer) => {
      this.handleAudioChunk(chunk);
    });

    this.recording.stream().on("error", (err: any) => {
      log.error("Audio stream error: ", err);
    });

    log.info("Audio capture started");
  }

  private handleAudioChunk(chunk: Buffer) {
    if (!this.porcupine) return;

    // Convert Buffer to Int16Array values and append to our internal buffer
    // chunk is raw frames (16-bit little-endian)
    for (let i = 0; i < chunk.length; i += 2) {
      this.audioBuffer.push(chunk.readInt16LE(i));
    }

    // Process depending on state
    if (this.state === AudioState.LISTENING_WAKE) {
      this.processWakeWord();
    } else if (this.state === AudioState.LISTENING_ACTIVE) {
      // Stream raw data to main process -> socket
      // We emit the chunk directly to avoid overhead of buffering everything here
      this.emit("audio-data", chunk);
      this.audioBuffer = []; // Clear buffer since we just emitted the raw chunk
    }
  }

  private processWakeWord() {
    if (!this.porcupine) return;
    const frameLength = this.porcupine.frameLength;

    // While we have enough samples for a frame
    while (this.audioBuffer.length >= frameLength) {
      const frame = new Int16Array(this.audioBuffer.slice(0, frameLength));
      this.audioBuffer.splice(0, frameLength); // Remove processed samples

      const keywordIndex = this.porcupine.process(frame);

      if (keywordIndex >= 0) {
        log.info("Wake word detected!");
        this.state = AudioState.LISTENING_ACTIVE;
        this.emit("state-change", this.state);
        this.emit("wake-word");
        // Clear any remaining buffer to start clean for active listening? 
        // Actually, we might want to keep it if the user spoke quickly after wake word.
        // But for simplicity/logic, we just continue streaming from here.
      }
    }
  }

  stop() {
    this.state = AudioState.IDLE;
    this.emit("state-change", this.state);
    if (this.recording) {
      this.recording.stop();
      this.recording = null;
    }
    this.audioBuffer = [];
  }

  setState(newState: AudioState) {
    this.state = newState;
    this.emit("state-change", this.state);
  }
}

