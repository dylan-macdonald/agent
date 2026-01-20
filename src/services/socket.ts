/**
 * Socket Service
 *
 * Handles real-time communication with desktop agents via Socket.io
 */

import { randomUUID } from "crypto";
import { Server as HttpServer } from "http";

import { Server as SocketIOServer, Socket } from "socket.io";

import { logger } from "../utils/logger.js";

import { AssistantService } from "./assistant.js";
import { VoiceService } from "./voice.js";



export class SocketService {
  private io: SocketIOServer;
  private pendingScreenshots: Map<string, (buffer: Buffer | null) => void> = new Map();
  private connectedClients: Map<string, { userId: string; deviceId: string }> = new Map();

  constructor(
    private httpServer: HttpServer,
    private assistantService: AssistantService,
    private voiceService: VoiceService
  ) {
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*", // In production, restrict this
        methods: ["GET", "POST"],
      },
    });

    this.setupHandlers();
    logger.info("Socket.io service initialized");
  }

  /**
   * Setup socket event handlers
   */
  private setupHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      const userId = socket.handshake.query.userId as string;
      const deviceId = socket.handshake.query.deviceId as string;

      if (!userId) {
        logger.warn("Socket connection attempt without userId", {
          socketId: socket.id,
        });
        socket.disconnect();
        return;
      }

      logger.info(
        `Desktop agent connected: User=${userId}, Device=${deviceId}`,
        {
          socketId: socket.id,
        }
      );

      socket.join(`user:${userId}`);
      this.connectedClients.set(socket.id, { userId, deviceId });

      // Handle wake word detection
      socket.on("wake-word-detected", () => {
        logger.debug(`Wake word detected for user ${userId}`);
        // Optionally notify other devices or log
      });

      // Handle audio stream (voice data)
      socket.on("voice-data", async (audioBuffer: Buffer) => {
        try {
          logger.debug(
            `Received voice data from user ${userId} (${audioBuffer.length} bytes)`
          );

          // 1. STT: Process voice message
          const voiceMessage = await this.voiceService.processInboundVoice(
            userId,
            audioBuffer
          );

          if (voiceMessage.transcript) {
            socket.emit("transcript", {
              text: voiceMessage.transcript,
              messageId: voiceMessage.id,
            });

            // 2. Assistant: Generate response
            const responseText = await this.assistantService.handleVoiceMessage(
              userId,
              voiceMessage.transcript
            );

            socket.emit("response-text", { text: responseText });

            // 3. TTS: Synthesize response
            const { audioBuffer: responseAudio } =
              await this.voiceService.processOutboundVoice(
                userId,
                responseText
              );

            // 4. Send audio back to client
            socket.emit("voice-response", responseAudio);
          }
        } catch (error) {
          logger.error("Error processing voice data over socket", {
            error: (error as Error).message,
            userId,
          });
          socket.emit("error", { message: "Failed to process voice data" });
        }
      });

      socket.on("screen-captured", (data: { requestId: string; image: Buffer }) => {
        logger.info(`Received screenshot response for ${data.requestId}`);
        const resolver = this.pendingScreenshots.get(data.requestId);
        if (resolver) {
          resolver(data.image);
          this.pendingScreenshots.delete(data.requestId);
        }
      });

      socket.on("screen-capture-error", (data: { requestId: string; error: string }) => {
        logger.error(`Screenshot error for ${data.requestId}: ${data.error}`);
        const resolver = this.pendingScreenshots.get(data.requestId);
        if (resolver) {
          resolver(null); // Resolve with null to indicate failure
          this.pendingScreenshots.delete(data.requestId);
        }
      });

      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  public async requestScreenshot(userId: string): Promise<Buffer | null> {
    const clientEntry = Array.from(this.connectedClients.entries()).find(([_, info]) => info.userId === userId);
    if (!clientEntry) {
      logger.warn(`No connected desktop client found for user ${userId}`);
      return null;
    }

    const [socketId, _] = clientEntry;
    const socket = this.io.sockets.sockets.get(socketId);

    if (!socket) {return null;}

    const requestId = randomUUID();
    return new Promise((resolve) => {
      this.pendingScreenshots.set(requestId, resolve);
      socket.emit("capture-screen", { requestId });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingScreenshots.has(requestId)) {
          logger.warn(`Screenshot request ${requestId} timed out`);
          this.pendingScreenshots.delete(requestId);
          resolve(null); // Return null on timeout
        }
      }, 5000);
    });
  }

  /**
   * Send a notification to a specific user's devices
   */
  public notifyUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to all connected agents
   */
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }
}
