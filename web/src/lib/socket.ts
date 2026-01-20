/**
 * Socket.io Client for Real-time Chat
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export interface ChatMessage {
    id: string;
    userId: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: string;
}

type MessageHandler = (message: ChatMessage) => void;
type TypingHandler = (typing: boolean) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: string) => void;

class SocketClient {
    private socket: Socket | null = null;
    private userId: string | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private typingHandlers: Set<TypingHandler> = new Set();
    private connectionHandlers: Set<ConnectionHandler> = new Set();
    private errorHandlers: Set<ErrorHandler> = new Set();

    connect(userId: string): void {
        if (this.socket?.connected && this.userId === userId) {
            return;
        }

        this.disconnect();

        this.userId = userId;
        this.socket = io(SOCKET_URL, {
            query: {
                userId,
                type: 'web',
                deviceId: 'web-dashboard'
            },
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.notifyConnectionHandlers(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this.notifyConnectionHandlers(false);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.notifyErrorHandlers('Connection failed');
        });

        // Chat events
        this.socket.on('chat-message-received', (message: ChatMessage) => {
            this.notifyMessageHandlers(message);
        });

        this.socket.on('chat-response', (message: ChatMessage) => {
            this.notifyMessageHandlers(message);
        });

        this.socket.on('chat-history', (data: { messages: ChatMessage[] }) => {
            data.messages.forEach(msg => this.notifyMessageHandlers(msg));
        });

        this.socket.on('assistant-typing', (data: { typing: boolean }) => {
            this.notifyTypingHandlers(data.typing);
        });

        this.socket.on('chat-error', (data: { message: string }) => {
            this.notifyErrorHandlers(data.message);
        });

        // Voice activity from desktop
        this.socket.on('transcript', (data: { text: string; messageId: string }) => {
            this.notifyMessageHandlers({
                id: data.messageId,
                userId,
                content: data.text,
                role: 'user',
                timestamp: new Date().toISOString()
            });
        });

        this.socket.on('response-text', (data: { text: string }) => {
            this.notifyMessageHandlers({
                id: Date.now().toString(),
                userId,
                content: data.text,
                role: 'assistant',
                timestamp: new Date().toISOString()
            });
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.userId = null;
    }

    sendMessage(content: string): void {
        if (!this.socket?.connected) {
            this.notifyErrorHandlers('Not connected');
            return;
        }
        this.socket.emit('chat-message', { content });
    }

    requestHistory(limit: number = 50): void {
        if (!this.socket?.connected) return;
        this.socket.emit('get-chat-history', { limit });
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    // Event handlers
    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    onTyping(handler: TypingHandler): () => void {
        this.typingHandlers.add(handler);
        return () => this.typingHandlers.delete(handler);
    }

    onConnection(handler: ConnectionHandler): () => void {
        this.connectionHandlers.add(handler);
        return () => this.connectionHandlers.delete(handler);
    }

    onError(handler: ErrorHandler): () => void {
        this.errorHandlers.add(handler);
        return () => this.errorHandlers.delete(handler);
    }

    private notifyMessageHandlers(message: ChatMessage): void {
        this.messageHandlers.forEach(handler => handler(message));
    }

    private notifyTypingHandlers(typing: boolean): void {
        this.typingHandlers.forEach(handler => handler(typing));
    }

    private notifyConnectionHandlers(connected: boolean): void {
        this.connectionHandlers.forEach(handler => handler(connected));
    }

    private notifyErrorHandlers(error: string): void {
        this.errorHandlers.forEach(handler => handler(error));
    }
}

export const socketClient = new SocketClient();
