/**
 * Socket Service
 *
 * Handles real-time communication with desktop agents and web dashboard via Socket.io
 */

import { randomUUID } from "crypto";
import { Server as HttpServer } from "http";

import { Server as SocketIOServer, Socket } from "socket.io";

import { logger } from "../utils/logger.js";

import { AssistantService } from "./assistant.js";
import { VoiceService } from "./voice.js";

interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ConnectedClient {
  userId: string;
  deviceId: string;
  type: 'desktop' | 'web';
}

export class SocketService {
  private io: SocketIOServer;
  private pendingScreenshots: Map<string, (buffer: Buffer | null) => void> = new Map();
  private connectedClients: Map<string, ConnectedClient> = new Map();
  private chatHistory: Map<string, ChatMessage[]> = new Map();

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
      const deviceId = socket.handshake.query.deviceId as string || 'web';
      const clientType = socket.handshake.query.type as 'desktop' | 'web' || 'desktop';

      if (!userId) {
        logger.warn("Socket connection attempt without userId", {
          socketId: socket.id,
        });
        socket.disconnect();
        return;
      }

      logger.info(
        `Client connected: User=${userId}, Device=${deviceId}, Type=${clientType}`,
        {
          socketId: socket.id,
        }
      );

      socket.join(`user:${userId}`);
      this.connectedClients.set(socket.id, { userId, deviceId, type: clientType });

      // Send connection confirmation
      socket.emit("connected", {
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      // ========== Web Chat Handlers ==========

      // Handle chat message from web dashboard
      socket.on("chat-message", async (data: { content: string }) => {
        try {
          const messageId = randomUUID();
          const userMessage: ChatMessage = {
            id: messageId,
            userId,
            content: data.content,
            role: 'user',
            timestamp: new Date()
          };

          // Store in history
          this.addToHistory(userId, userMessage);

          // Echo the user message back for confirmation
          socket.emit("chat-message-received", userMessage);

          // Emit typing indicator
          socket.emit("assistant-typing", { typing: true });

          // Process with assistant
          const responseText = await this.assistantService.handleVoiceMessage(
            userId,
            data.content
          );

          // Stop typing indicator
          socket.emit("assistant-typing", { typing: false });

          // Create assistant message
          const assistantMessage: ChatMessage = {
            id: randomUUID(),
            userId,
            content: responseText,
            role: 'assistant',
            timestamp: new Date()
          };

          // Store in history
          this.addToHistory(userId, assistantMessage);

          // Send response
          socket.emit("chat-response", assistantMessage);

          // Notify other connected clients (e.g., desktop agent)
          socket.to(`user:${userId}`).emit("chat-update", {
            userMessage,
            assistantMessage
          });

        } catch (error) {
          logger.error("Error processing chat message", {
            error: (error as Error).message,
            userId,
          });
          socket.emit("assistant-typing", { typing: false });
          socket.emit("chat-error", { message: "Failed to process message" });
        }
      });

      // Handle request for chat history
      socket.on("get-chat-history", (data: { limit?: number }) => {
        const history = this.getHistory(userId, data.limit || 50);
        socket.emit("chat-history", { messages: history });
      });

      // ========== Desktop Agent Handlers ==========

      // Handle wake word detection
      socket.on("wake-word-detected", () => {
        logger.debug(`Wake word detected for user ${userId}`);
        // Notify web dashboard
        this.io.to(`user:${userId}`).emit("voice-activity", {
          type: 'wake-word',
          timestamp: new Date().toISOString()
        });
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
            // Notify all user clients about the transcript
            this.io.to(`user:${userId}`).emit("transcript", {
              text: voiceMessage.transcript,
              messageId: voiceMessage.id,
            });

            // Store in chat history
            const userMessage: ChatMessage = {
              id: voiceMessage.id,
              userId,
              content: voiceMessage.transcript,
              role: 'user',
              timestamp: new Date()
            };
            this.addToHistory(userId, userMessage);

            // 2. Assistant: Generate response
            const responseText = await this.assistantService.handleVoiceMessage(
              userId,
              voiceMessage.transcript
            );

            // Notify all clients
            this.io.to(`user:${userId}`).emit("response-text", { text: responseText });

            // Store assistant response in history
            const assistantMessage: ChatMessage = {
              id: randomUUID(),
              userId,
              content: responseText,
              role: 'assistant',
              timestamp: new Date()
            };
            this.addToHistory(userId, assistantMessage);

            // 3. TTS: Synthesize response
            const { audioBuffer: responseAudio } =
              await this.voiceService.processOutboundVoice(
                userId,
                responseText
              );

            // 4. Send audio back to desktop client
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

  /**
   * Add message to user's chat history
   */
  private addToHistory(userId: string, message: ChatMessage): void {
    if (!this.chatHistory.has(userId)) {
      this.chatHistory.set(userId, []);
    }
    const history = this.chatHistory.get(userId)!;
    history.push(message);
    // Keep only last 100 messages in memory
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get chat history for a user
   */
  private getHistory(userId: string, limit: number = 50): ChatMessage[] {
    const history = this.chatHistory.get(userId) || [];
    return history.slice(-limit);
  }

  public async requestScreenshot(userId: string): Promise<Buffer | null> {
    const clientEntry = Array.from(this.connectedClients.entries()).find(
      ([_, info]) => info.userId === userId && info.type === 'desktop'
    );
    if (!clientEntry) {
      logger.warn(`No connected desktop client found for user ${userId}`);
      return null;
    }

    const [socketId] = clientEntry;
    const socket = this.io.sockets.sockets.get(socketId);

    if (!socket) { return null; }

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

  /**
   * Get connected clients info
   */
  public getConnectedClients(userId?: string): ConnectedClient[] {
    const clients = Array.from(this.connectedClients.values());
    if (userId) {
      return clients.filter(c => c.userId === userId);
    }
    return clients;
  }
}
