import { MessageSquare, Send, Phone, Mic } from 'lucide-react';

export function Chat() {
    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                        <MessageSquare size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold">AI Assistant</h3>
                        <p className="text-xs text-zinc-500">Always available</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                        <Phone size={18} />
                    </button>
                    <button className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                        <Mic size={18} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 py-6 flex flex-col items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare size={32} className="text-zinc-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Chat Interface</h3>
                    <p className="text-zinc-500 text-sm mb-6">
                        This web chat interface is under development.
                        Currently, you can interact with your assistant via:
                    </p>
                    <div className="space-y-3 text-left">
                        <InfoItem
                            icon="SMS"
                            title="Text Message"
                            description="Send SMS to your configured Twilio number"
                        />
                        <InfoItem
                            icon="Voice"
                            title="Desktop Agent"
                            description="Use the wake word 'Computer' with the Electron app"
                        />
                    </div>
                </div>
            </div>

            {/* Input Area (disabled placeholder) */}
            <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Type a message... (coming soon)"
                        disabled
                        className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 placeholder-zinc-600 cursor-not-allowed"
                    />
                    <button
                        disabled
                        className="p-3 rounded-xl bg-zinc-800 text-zinc-600 cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <p className="text-xs text-zinc-600 mt-2 text-center">
                    Web chat requires WebSocket API endpoints (MVP 8B)
                </p>
            </div>
        </div>
    );
}

function InfoItem({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-medium">
                {icon}
            </div>
            <div>
                <div className="font-medium text-sm">{title}</div>
                <div className="text-xs text-zinc-500">{description}</div>
            </div>
        </div>
    );
}
