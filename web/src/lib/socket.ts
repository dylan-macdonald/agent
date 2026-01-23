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

// Dashboard update types
export interface DashboardUpdate<T = any> {
    action: 'created' | 'updated' | 'deleted' | 'triggered';
    timestamp: string;
    data?: T;
    goal?: T;
    event?: T;
    reminder?: T;
    type?: 'sleep' | 'workout';
}

export interface CheckInEvent {
    type: 'morning' | 'evening';
    message: string;
    timestamp: string;
}

export interface SystemEvent {
    event: string;
    data: any;
    timestamp: string;
}

type MessageHandler = (message: ChatMessage) => void;
type TypingHandler = (typing: boolean) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: string) => void;
type DashboardUpdateHandler<T = any> = (update: DashboardUpdate<T>) => void;
type CheckInHandler = (event: CheckInEvent) => void;
type SystemEventHandler = (event: SystemEvent) => void;

class SocketClient {
    private socket: Socket | null = null;
    private userId: string | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private typingHandlers: Set<TypingHandler> = new Set();
    private connectionHandlers: Set<ConnectionHandler> = new Set();
    private errorHandlers: Set<ErrorHandler> = new Set();
    // Dashboard event handlers
    private goalUpdateHandlers: Set<DashboardUpdateHandler> = new Set();
    private calendarUpdateHandlers: Set<DashboardUpdateHandler> = new Set();
    private reminderUpdateHandlers: Set<DashboardUpdateHandler> = new Set();
    private healthUpdateHandlers: Set<DashboardUpdateHandler> = new Set();
    private checkInHandlers: Set<CheckInHandler> = new Set();
    private systemEventHandlers: Set<SystemEventHandler> = new Set();

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

        // Dashboard real-time events
        this.socket.on('goal-update', (update: DashboardUpdate) => {
            this.goalUpdateHandlers.forEach(handler => handler(update));
        });

        this.socket.on('calendar-update', (update: DashboardUpdate) => {
            this.calendarUpdateHandlers.forEach(handler => handler(update));
        });

        this.socket.on('reminder-update', (update: DashboardUpdate) => {
            this.reminderUpdateHandlers.forEach(handler => handler(update));
        });

        this.socket.on('health-update', (update: DashboardUpdate) => {
            this.healthUpdateHandlers.forEach(handler => handler(update));
        });

        this.socket.on('check-in', (event: CheckInEvent) => {
            this.checkInHandlers.forEach(handler => handler(event));
        });

        this.socket.on('system-event', (event: SystemEvent) => {
            this.systemEventHandlers.forEach(handler => handler(event));
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

    // Dashboard event handlers
    onGoalUpdate(handler: DashboardUpdateHandler): () => void {
        this.goalUpdateHandlers.add(handler);
        return () => this.goalUpdateHandlers.delete(handler);
    }

    onCalendarUpdate(handler: DashboardUpdateHandler): () => void {
        this.calendarUpdateHandlers.add(handler);
        return () => this.calendarUpdateHandlers.delete(handler);
    }

    onReminderUpdate(handler: DashboardUpdateHandler): () => void {
        this.reminderUpdateHandlers.add(handler);
        return () => this.reminderUpdateHandlers.delete(handler);
    }

    onHealthUpdate(handler: DashboardUpdateHandler): () => void {
        this.healthUpdateHandlers.add(handler);
        return () => this.healthUpdateHandlers.delete(handler);
    }

    onCheckIn(handler: CheckInHandler): () => void {
        this.checkInHandlers.add(handler);
        return () => this.checkInHandlers.delete(handler);
    }

    onSystemEvent(handler: SystemEventHandler): () => void {
        this.systemEventHandlers.add(handler);
        return () => this.systemEventHandlers.delete(handler);
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
