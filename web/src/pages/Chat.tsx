import { useEffect, useState, useRef } from 'react';
import { Send, Wifi, WifiOff, Bot, User, Paperclip, Sparkles } from 'lucide-react';
import { socketClient, type ChatMessage } from '../lib/socket';
import { api } from '../lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Chat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const storedId = localStorage.getItem('agent_user_id');
    const userId = (storedId && storedId.length > 10 && storedId !== 'default-user')
        ? storedId
        : '00000000-0000-0000-0000-000000000000';

    useEffect(() => {
        fetchUsername();
        socketClient.connect(userId);

        const unsubMessage = socketClient.onMessage((message) => {
            setMessages(prev => {
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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const fetchUsername = async () => {
        if (!userId || userId === '00000000-0000-0000-0000-000000000000') return;
        try {
            const { data } = await api.getSettings(userId);
            if (data?.settings?.username) {
                setUsername(data.settings.username);
            }
        } catch {
            // Ignore
        }
    };

    const handleSend = () => {
        if (!input.trim() || !connected) return;
        socketClient.sendMessage(input.trim());
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    };

    const displayName = username || 'You';
    const userInitials = username
        ? username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Error Banner */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    {error}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
                {messages.length === 0 && !isTyping && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-6">
                            <Sparkles size={32} className="text-cyan-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                        <p className="text-zinc-500 text-sm max-w-md">
                            Ask me about your schedule, set reminders, track goals, or just chat.
                            I'm here to help you stay organized and productive.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {[
                                "What's on my schedule today?",
                                "Create a new goal",
                                "Log my workout",
                                "Set a reminder"
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => {
                                        setInput(suggestion);
                                        textareaRef.current?.focus();
                                    }}
                                    className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/50 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        displayName={displayName}
                        userInitials={userInitials}
                    />
                ))}

                {isTyping && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                            <Bot size={16} className="text-white" />
                        </div>
                        <div className="flex items-center gap-1 py-3 px-4 rounded-2xl bg-zinc-800/50 text-zinc-400">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="pt-4 mt-2 shrink-0">
                <div className="flex items-end gap-2">
                    <div className="flex-1 flex items-end bg-zinc-900/50 border border-zinc-800/50 rounded-2xl focus-within:border-cyan-500/50 focus-within:bg-zinc-900 transition-all">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={connected ? "Type a message..." : "Connecting..."}
                            disabled={!connected}
                            rows={1}
                            className="flex-1 px-4 py-3 bg-transparent text-white placeholder-zinc-500 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-relaxed"
                            style={{ minHeight: '48px', maxHeight: '160px' }}
                        />
                        <button className="p-3 text-zinc-500 hover:text-zinc-300 transition-colors">
                            <Paperclip size={18} />
                        </button>
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!connected || !input.trim()}
                        className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/20 disabled:shadow-none"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                        {connected ? (
                            <>
                                <Wifi size={12} className="text-emerald-500" />
                                <span className="text-emerald-500">Connected</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={12} className="text-rose-500" />
                                <span className="text-rose-500">Disconnected</span>
                            </>
                        )}
                    </div>
                    <span className="text-xs text-zinc-600">Press Enter to send, Shift+Enter for new line</span>
                </div>
            </div>
        </div>
    );
}

function MessageBubble({
    message,
    displayName,
    userInitials
}: {
    message: ChatMessage;
    displayName: string;
    userInitials: string;
}) {
    const isUser = message.role === 'user';
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            {isUser ? (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-xs font-semibold text-zinc-300">
                    {userInitials}
                </div>
            ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-white" />
                </div>
            )}

            {/* Content */}
            <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 text-xs text-zinc-500">
                    <span className="font-medium">{isUser ? displayName : 'Agent'}</span>
                    <span>{time}</span>
                </div>

                <div className={`py-3 px-4 rounded-2xl ${isUser
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                    : 'bg-zinc-800/50 text-zinc-100'
                }`}>
                    <div className={`prose prose-sm max-w-none leading-relaxed ${isUser
                        ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white'
                        : 'prose-invert prose-p:text-zinc-100 prose-headings:text-white prose-strong:text-cyan-400 prose-code:text-cyan-400 prose-code:bg-zinc-900/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded'
                    }`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
}
