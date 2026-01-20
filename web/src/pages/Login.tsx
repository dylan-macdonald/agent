import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowRight, Zap, Shield, MessageSquare } from 'lucide-react';

export function Login() {
    const [userId, setUserId] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (userId.trim()) {
            localStorage.setItem('agent_user_id', userId.trim());
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen flex bg-zinc-950 text-white overflow-hidden">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-12 flex-col justify-between">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                            <Bot size={24} className="text-white" />
                        </div>
                        <span className="text-xl font-semibold tracking-tight">Agent</span>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 space-y-6">
                    <h1 className="text-4xl font-bold leading-tight">
                        Your AI-powered<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                            personal assistant
                        </span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-md">
                        Scheduling, reminders, health tracking, and goal management -
                        all with natural language via SMS or voice.
                    </p>
                </div>

                {/* Features */}
                <div className="relative z-10 space-y-4">
                    <Feature icon={<MessageSquare size={18} />} text="Two-way SMS & Voice communication" />
                    <Feature icon={<Zap size={18} />} text="Proactive reminders & check-ins" />
                    <Feature icon={<Shield size={18} />} text="End-to-end encrypted data" />
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                            <Bot size={28} className="text-white" />
                        </div>
                        <span className="text-2xl font-semibold tracking-tight">Agent</span>
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold">Welcome back</h2>
                        <p className="mt-2 text-zinc-500">
                            Enter your user ID to access the dashboard
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="userId" className="block text-sm font-medium text-zinc-300">
                                User ID
                            </label>
                            <input
                                type="text"
                                id="userId"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all text-white placeholder-zinc-600 font-mono"
                                placeholder="user-123"
                                autoFocus
                                autoComplete="off"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!userId.trim()}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transform transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>Access Dashboard</span>
                            <ArrowRight size={18} className={`transition-transform ${isHovered && userId.trim() ? 'translate-x-1' : ''}`} />
                        </button>
                    </form>

                    <div className="pt-6 border-t border-zinc-800">
                        <p className="text-sm text-zinc-500 text-center">
                            This dashboard connects to your AI Personal Assistant backend.
                            <br />
                            <span className="text-zinc-600">Ensure the server is running on port 3000.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-center gap-3 text-zinc-400">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-blue-400">
                {icon}
            </div>
            <span className="text-sm">{text}</span>
        </div>
    );
}
