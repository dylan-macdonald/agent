import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, Bot, User, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { socketClient, type ChatMessage } from '../lib/socket';

export function Chat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const userId = localStorage.getItem('agent_user_id') || '';

    useEffect(() => {
        // Connect to socket
        socketClient.connect(userId);

        // Setup handlers
        const unsubMessage = socketClient.onMessage((message) => {
            setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
        });

        const unsubTyping = socketClient.onTyping((typing) => {
            setIsTyping(typing);
        });

        const unsubConnection = socketClient.onConnection((isConnected) => {
            setConnected(isConnected);
            if (isConnected) {
                setError(null);
                // Request history on connect
                socketClient.requestHistory(50);
            }
        });

        const unsubError = socketClient.onError((err) => {
            setError(err);
        });

        return () => {
            unsubMessage();
            unsubTyping();
            unsubConnection();
            unsubError();
        };
    }, [userId]);

    useEffect(() => {
        // Scroll to bottom on new messages
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!input.trim() || !connected) return;

        socketClient.sendMessage(input.trim());
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                        <Bot size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold">AI Assistant</h3>
                        <div className="flex items-center gap-2">
                            {connected ? (
                                <>
                                    <Wifi size={12} className="text-emerald-400" />
                                    <span className="text-xs text-emerald-400">Connected</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={12} className="text-rose-400" />
                                    <span className="text-xs text-rose-400">Disconnected</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    {error}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto py-6 space-y-4">
                {messages.length === 0 && !isTyping && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <MessageSquare size={32} className="text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
                        <p className="text-zinc-500 text-sm max-w-md mx-auto">
                            Type a message below to chat with your AI assistant.
                            Your conversation history will appear here.
                        </p>
                    </div>
                )}

                {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                ))}

                {isTyping && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shrink-0">
                            <Bot size={16} className="text-white" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-zinc-800 text-zinc-300">
                            <div className="flex items-center gap-1">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-sm">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="pt-4 border-t border-zinc-800 shrink-0">
                <div className="flex items-end gap-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={connected ? "Type a message..." : "Connecting..."}
                        disabled={!connected}
                        rows={1}
                        className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!connected || !input.trim()}
                        className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed transition-all"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <p className="text-xs text-zinc-600 mt-2 text-center">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user';
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isUser
                    ? 'bg-zinc-700'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-400'
            }`}>
                {isUser ? (
                    <User size={16} className="text-zinc-300" />
                ) : (
                    <Bot size={16} className="text-white" />
                )}
            </div>
            <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl ${
                    isUser
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
                }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <span className={`text-xs text-zinc-600 mt-1 block ${isUser ? 'text-right' : 'text-left'}`}>
                    {time}
                </span>
            </div>
        </div>
    );
}
