import { useEffect, useState, useRef } from 'react';
import { Send, Wifi, WifiOff, Terminal, Paperclip } from 'lucide-react';
import { socketClient, type ChatMessage } from '../lib/socket';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Chat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get robust UUID
    const storedId = localStorage.getItem('agent_user_id');
    const userId = (storedId && storedId.length > 10 && storedId !== 'default-user')
        ? storedId
        : '00000000-0000-0000-0000-000000000000';

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
        <div className="max-w-5xl mx-auto h-full flex flex-col font-mono text-sm">
            {/* Chat Header (Status Line) */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900 shrink-0 mb-4">
                <div className="flex items-center gap-2 text-zinc-500 uppercase tracking-widest text-[10px]">
                    <span className="text-[var(--color-terminal-accent)]">SESSION_ID:</span>
                    <span>{userId.substring(0, 8)}</span>
                </div>
                <div className="flex items-center gap-2">
                    {connected ? (
                        <>
                            <Wifi size={14} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Link Established</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={14} className="text-rose-500" />
                            <span className="text-[10px] text-rose-500 font-bold tracking-widest uppercase">Link Offline</span>
                        </>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-4 p-3 bg-rose-950/30 border border-rose-900 text-rose-500 text-xs font-mono">
                    ERROR: {error}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-4">
                {messages.length === 0 && !isTyping && (
                    <div className="text-center py-24 opacity-50">
                        <div className="w-16 h-16 bg-zinc-900 flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                            <Terminal size={32} className="text-zinc-600" />
                        </div>
                        <h3 className="text-base font-bold mb-2 uppercase tracking-widest text-zinc-400">System Ready</h3>
                        <p className="text-zinc-600 text-xs font-mono">
                            Awaiting input command...
                        </p>
                    </div>
                )}

                {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                ))}

                {isTyping && (
                    <div className="flex items-start gap-4 animate-pulse">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 border border-[var(--color-terminal-accent)]/50 bg-[var(--color-terminal-accent)]/10 text-[var(--color-terminal-accent)]">
                            <Terminal size={14} />
                        </div>
                        <div className="py-2 px-3 text-[var(--color-terminal-accent)] text-xs uppercase tracking-widest">
                            &gt; Processing...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="pt-4 mt-2 shrink-0 relative group">
                {/* Input Decorators */}
                <div className="absolute left-0 top-6 ml-4 text-[var(--color-terminal-accent)] pointer-events-none z-10">
                    {'>'}
                </div>

                <div className="flex items-end gap-0 bg-black border border-zinc-800 focus-within:border-[var(--color-terminal-accent)] transition-colors relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={connected ? "Enter command or message..." : "Connecting..."}
                        disabled={!connected}
                        rows={1}
                        className="flex-1 px-4 py-4 pl-8 bg-transparent text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm leading-relaxed"
                        style={{ minHeight: '54px', maxHeight: '160px' }}
                    />

                    {/* Attachment Button (Placeholder for now) */}
                    <button className="p-4 text-zinc-600 hover:text-zinc-400 transition-colors">
                        <Paperclip size={16} />
                    </button>

                    <button
                        onClick={handleSend}
                        disabled={!connected || !input.trim()}
                        className="p-4 text-zinc-600 hover:text-[var(--color-terminal-accent)] disabled:text-zinc-800 disabled:cursor-not-allowed transition-all"
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-zinc-600 uppercase font-bold tracking-widest px-1">
                    <span>Markdown Enabled</span>
                    <span>SHIFT+ENTER for New Line</span>
                </div>
            </div>
        </div>
    );
}

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user';
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    return (
        <div className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''} group`}>
            {/* Avatar */}
            <div className={`w-8 h-8 shrink-0 flex items-center justify-center border font-bold text-xs ${isUser
                ? 'border-zinc-700 bg-zinc-900 text-zinc-400'
                : 'border-[var(--color-terminal-accent)] bg-[var(--color-terminal-accent)]/10 text-[var(--color-terminal-accent)]'
                }`}>
                {isUser ? 'OP' : 'AG'}
            </div>

            {/* Content */}
            <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Meta Line */}
                <div className="flex items-center gap-2 mb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-bold">
                    <span>{isUser ? 'OPERATOR' : 'AGENT'}</span>
                    <span>[{time}]</span>
                </div>

                {/* Bubble/Block */}
                <div className={`py-2 px-0 ${isUser
                    ? 'text-zinc-300 text-right'
                    : 'text-[var(--color-terminal-fg)]'
                    }`}>
                    <div className={`prose prose-sm prose-invert max-w-none font-mono leading-relaxed ${isUser ? '' : 'prose-p:text-[var(--color-terminal-fg)] prose-headings:text-[var(--color-terminal-accent)] prose-strong:text-[var(--color-terminal-accent)] prose-code:text-[var(--color-terminal-accent)] prose-code:bg-zinc-900/50 prose-code:border-zinc-800'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
}
