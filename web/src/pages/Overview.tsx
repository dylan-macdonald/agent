import { useEffect, useState } from 'react';
import {
    Activity,
    Calendar,
    Target,
    Heart,
    MessageSquare,
    Mic,
    Server,
    Database,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ExternalLink
} from 'lucide-react';

interface SystemStatus {
    api: 'online' | 'offline' | 'checking';
    database: 'connected' | 'disconnected' | 'checking';
    sms: 'ready' | 'not_configured' | 'checking';
    voice: 'ready' | 'not_configured' | 'checking';
}

export function Overview() {
    const [status, setStatus] = useState<SystemStatus>({
        api: 'checking',
        database: 'checking',
        sms: 'checking',
        voice: 'checking'
    });
    const userId = localStorage.getItem('agent_user_id');

    useEffect(() => {
        checkHealth();
    }, []);

    const checkHealth = async () => {
        try {
            const response = await fetch('http://localhost:3000/health');
            if (response.ok) {
                setStatus({
                    api: 'online',
                    database: 'connected',
                    sms: 'ready',
                    voice: 'ready'
                });
            } else {
                setStatus(prev => ({ ...prev, api: 'offline' }));
            }
        } catch {
            setStatus({
                api: 'offline',
                database: 'disconnected',
                sms: 'not_configured',
                voice: 'not_configured'
            });
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Welcome Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back, <span className="text-blue-400">{userId}</span>
                    </h1>
                    <p className="text-zinc-400 max-w-xl">
                        Your AI personal assistant is ready to help with scheduling, reminders,
                        health tracking, and goal management. Interact via SMS or voice.
                    </p>
                </div>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatusCard
                    icon={<Server size={20} />}
                    label="API Server"
                    status={status.api === 'online' ? 'success' : status.api === 'checking' ? 'warning' : 'error'}
                    statusText={status.api === 'online' ? 'Online' : status.api === 'checking' ? 'Checking...' : 'Offline'}
                />
                <StatusCard
                    icon={<Database size={20} />}
                    label="Database"
                    status={status.database === 'connected' ? 'success' : status.database === 'checking' ? 'warning' : 'error'}
                    statusText={status.database === 'connected' ? 'Connected' : status.database === 'checking' ? 'Checking...' : 'Disconnected'}
                />
                <StatusCard
                    icon={<MessageSquare size={20} />}
                    label="SMS Service"
                    status={status.sms === 'ready' ? 'success' : status.sms === 'checking' ? 'warning' : 'error'}
                    statusText={status.sms === 'ready' ? 'Ready' : status.sms === 'checking' ? 'Checking...' : 'Not Configured'}
                />
                <StatusCard
                    icon={<Mic size={20} />}
                    label="Voice Service"
                    status={status.voice === 'ready' ? 'success' : status.voice === 'checking' ? 'warning' : 'error'}
                    statusText={status.voice === 'ready' ? 'Ready' : status.voice === 'checking' ? 'Checking...' : 'Not Configured'}
                />
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard
                    icon={<Calendar className="text-blue-400" size={24} />}
                    title="Calendar & Events"
                    description="Schedule events and manage your calendar via natural language commands."
                    status="Backend Ready"
                />
                <FeatureCard
                    icon={<Target className="text-emerald-400" size={24} />}
                    title="Goals & Reminders"
                    description="Set goals, track progress, and receive proactive reminders."
                    status="Backend Ready"
                />
                <FeatureCard
                    icon={<Heart className="text-rose-400" size={24} />}
                    title="Health & Wellness"
                    description="Log sleep, workouts, and receive mindfulness prompts."
                    status="Backend Ready"
                />
                <FeatureCard
                    icon={<Activity className="text-amber-400" size={24} />}
                    title="Context & Memory"
                    description="Your assistant remembers your preferences and learns your patterns."
                    status="Backend Ready"
                />
            </div>

            {/* Setup Instructions */}
            {status.api === 'offline' && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <AlertCircle className="text-amber-400" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-amber-200 mb-2">Backend Server Offline</h3>
                            <p className="text-sm text-zinc-400 mb-4">
                                The API server is not running. To use the full features of your assistant:
                            </p>
                            <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                                <li>Run <code className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">./setup.sh</code> to configure your environment</li>
                                <li>Set up your PostgreSQL and Redis databases</li>
                                <li>Configure your API keys in <code className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">.env</code></li>
                                <li>Run <code className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">npm run dev</code> to start the server</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Links */}
            <div className="flex flex-wrap gap-3">
                <QuickLink href="http://localhost:3000/cost-dashboard.html" label="Cost Dashboard" />
                <QuickLink href="http://localhost:3000/health" label="API Health" />
            </div>
        </div>
    );
}

function StatusCard({ icon, label, status, statusText }: {
    icon: React.ReactNode;
    label: string;
    status: 'success' | 'warning' | 'error';
    statusText: string;
}) {
    const statusColors = {
        success: 'text-emerald-400',
        warning: 'text-amber-400',
        error: 'text-rose-400'
    };

    const StatusIcon = status === 'success' ? CheckCircle2 : status === 'warning' ? AlertCircle : XCircle;

    return (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                    {icon}
                </div>
                <StatusIcon size={18} className={statusColors[status]} />
            </div>
            <div className="text-sm text-zinc-500">{label}</div>
            <div className={`font-medium ${statusColors[status]}`}>{statusText}</div>
        </div>
    );
}

function FeatureCard({ icon, title, description, status }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    status: string;
}) {
    return (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-zinc-800">
                    {icon}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{title}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                            {status}
                        </span>
                    </div>
                    <p className="text-sm text-zinc-400">{description}</p>
                </div>
            </div>
        </div>
    );
}

function QuickLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
            {label}
            <ExternalLink size={14} />
        </a>
    );
}
