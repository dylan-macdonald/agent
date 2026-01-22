import { useEffect, useState } from 'react';
import {
    Calendar,
    Target,
    MessageSquare,
    Mic,
    Server,
    Database,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ExternalLink,
    Clock,
    Moon,
    Dumbbell,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { api, type OverviewData, type CalendarEvent, type Goal, type Reminder } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface SystemStatus {
    api: 'online' | 'offline' | 'checking';
    database: 'connected' | 'disconnected' | 'checking';
    sms: 'ready' | 'not_configured' | 'checking';
    voice: 'ready' | 'not_configured' | 'checking';
}

export function Overview() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<SystemStatus>({
        api: 'checking',
        database: 'checking',
        sms: 'checking',
        voice: 'checking'
    });
    const [overview, setOverview] = useState<OverviewData['overview'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState<string | null>(null);
    const userId = localStorage.getItem('agent_user_id') || '';

    useEffect(() => {
        checkHealth();
        fetchOverview();
        fetchUsername();
    }, [userId]);

    const checkHealth = async () => {
        const { data, error } = await api.checkHealth();
        if (data && !error) {
            setStatus({
                api: 'online',
                database: 'connected',
                sms: 'ready',
                voice: 'ready'
            });
        } else {
            setStatus({
                api: 'offline',
                database: 'disconnected',
                sms: 'not_configured',
                voice: 'not_configured'
            });
        }
    };

    const fetchOverview = async () => {
        if (!userId) return;
        setLoading(true);
        const { data, error } = await api.getOverview(userId);
        if (data && !error) {
            setOverview(data.overview);
        }
        setLoading(false);
    };

    const fetchUsername = async () => {
        if (!userId) return;
        try {
            const { data } = await api.getSettings(userId);
            if (data?.settings?.username) {
                setUsername(data.settings.username);
            }
        } catch {
            // Ignore - username will stay null
        }
    };

    const displayName = username || 'there';
    const greeting = getGreeting();

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Welcome Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 p-8">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-500/5 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                <div className="relative">
                    <p className="text-zinc-500 text-sm mb-1">{greeting}</p>
                    <h1 className="text-3xl font-bold mb-3">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{displayName}</span>
                    </h1>
                    <p className="text-zinc-400 max-w-xl mb-6">
                        Your AI personal assistant is ready to help with scheduling, reminders,
                        health tracking, and goal management.
                    </p>
                    <button
                        onClick={() => navigate('/chat')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all"
                    >
                        <Sparkles size={16} />
                        Start a conversation
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatusCard
                    icon={<Server size={18} />}
                    label="API Server"
                    status={status.api === 'online' ? 'success' : status.api === 'checking' ? 'warning' : 'error'}
                    statusText={status.api === 'online' ? 'Online' : status.api === 'checking' ? 'Checking...' : 'Offline'}
                />
                <StatusCard
                    icon={<Database size={18} />}
                    label="Database"
                    status={status.database === 'connected' ? 'success' : status.database === 'checking' ? 'warning' : 'error'}
                    statusText={status.database === 'connected' ? 'Connected' : status.database === 'checking' ? 'Checking...' : 'Disconnected'}
                />
                <StatusCard
                    icon={<MessageSquare size={18} />}
                    label="SMS Service"
                    status={status.sms === 'ready' ? 'success' : status.sms === 'checking' ? 'warning' : 'error'}
                    statusText={status.sms === 'ready' ? 'Ready' : status.sms === 'checking' ? 'Checking...' : 'Not Configured'}
                />
                <StatusCard
                    icon={<Mic size={18} />}
                    label="Voice Service"
                    status={status.voice === 'ready' ? 'success' : status.voice === 'checking' ? 'warning' : 'error'}
                    statusText={status.voice === 'ready' ? 'Ready' : status.voice === 'checking' ? 'Checking...' : 'Not Configured'}
                />
            </div>

            {/* Stats & Data */}
            {status.api === 'online' && overview && (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <QuickStatCard
                            icon={<Calendar size={18} className="text-blue-400" />}
                            label="Events"
                            value={overview.counts.totalEvents.toString()}
                            subtext="This week"
                            color="blue"
                        />
                        <QuickStatCard
                            icon={<Target size={18} className="text-emerald-400" />}
                            label="Active Goals"
                            value={overview.counts.totalGoals.toString()}
                            subtext="In progress"
                            color="emerald"
                        />
                        <QuickStatCard
                            icon={<Moon size={18} className="text-indigo-400" />}
                            label="Avg Sleep"
                            value={overview.healthStats.avgSleepHours ? `${overview.healthStats.avgSleepHours}h` : '--'}
                            subtext="This week"
                            color="indigo"
                        />
                        <QuickStatCard
                            icon={<Dumbbell size={18} className="text-rose-400" />}
                            label="Workouts"
                            value={overview.healthStats.workoutsThisWeek.toString()}
                            subtext="This week"
                            color="rose"
                        />
                    </div>

                    {/* Upcoming Events & Reminders */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Upcoming Events */}
                        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Calendar size={16} className="text-blue-400" />
                                    Upcoming Events
                                </h3>
                                <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
                                    {overview.upcomingEvents.length} upcoming
                                </span>
                            </div>
                            {overview.upcomingEvents.length > 0 ? (
                                <div className="space-y-2">
                                    {overview.upcomingEvents.map((event: CalendarEvent) => (
                                        <EventItem key={event.id} event={event} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No upcoming events" />
                            )}
                        </div>

                        {/* Pending Reminders */}
                        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Clock size={16} className="text-amber-400" />
                                    Pending Reminders
                                </h3>
                                <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
                                    {overview.pendingReminders.length} pending
                                </span>
                            </div>
                            {overview.pendingReminders.length > 0 ? (
                                <div className="space-y-2">
                                    {overview.pendingReminders.map((reminder: Reminder) => (
                                        <ReminderItem key={reminder.id} reminder={reminder} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No pending reminders" />
                            )}
                        </div>
                    </div>

                    {/* Active Goals */}
                    {overview.activeGoals.length > 0 && (
                        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Target size={16} className="text-emerald-400" />
                                    Active Goals
                                </h3>
                                <button
                                    onClick={() => navigate('/goals')}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    View all
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {overview.activeGoals.map((goal: Goal) => (
                                    <GoalItem key={goal.id} goal={goal} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Loading State */}
            {loading && status.api === 'online' && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-zinc-500">
                        <div className="w-5 h-5 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
                        Loading your data...
                    </div>
                </div>
            )}

            {/* Setup Instructions */}
            {status.api === 'offline' && (
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-amber-500/10">
                            <AlertCircle className="text-amber-400" size={22} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-amber-300 mb-2">Backend Server Offline</h3>
                            <p className="text-sm text-zinc-400 mb-4">
                                The API server is not running. To use the full features:
                            </p>
                            <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                                <li>Run <code className="px-2 py-0.5 bg-zinc-800/50 rounded text-cyan-400 font-mono text-xs">./setup.sh</code></li>
                                <li>Set up PostgreSQL and Redis databases</li>
                                <li>Configure API keys in <code className="px-2 py-0.5 bg-zinc-800/50 rounded text-cyan-400 font-mono text-xs">.env</code></li>
                                <li>Run <code className="px-2 py-0.5 bg-zinc-800/50 rounded text-cyan-400 font-mono text-xs">npm run dev</code></li>
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

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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

    const bgColors = {
        success: 'bg-emerald-500/10',
        warning: 'bg-amber-500/10',
        error: 'bg-rose-500/10'
    };

    const StatusIcon = status === 'success' ? CheckCircle2 : status === 'warning' ? AlertCircle : XCircle;

    return (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4">
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${bgColors[status]} ${statusColors[status]}`}>
                    {icon}
                </div>
                <StatusIcon size={16} className={statusColors[status]} />
            </div>
            <div className="text-xs text-zinc-500">{label}</div>
            <div className={`text-sm font-medium ${statusColors[status]}`}>{statusText}</div>
        </div>
    );
}

function QuickStatCard({ icon, label, value, subtext, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtext: string;
    color: string;
}) {
    return (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-zinc-500">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-zinc-500">{subtext}</div>
        </div>
    );
}

function EventItem({ event }: { event: CalendarEvent }) {
    const date = new Date(event.startTime);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-blue-500/10 flex flex-col items-center justify-center">
                <span className="text-[10px] text-blue-400 uppercase">{date.toLocaleDateString([], { weekday: 'short' })}</span>
                <span className="text-base font-bold text-blue-400">{date.getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{event.title}</div>
                <div className="text-xs text-zinc-500">{timeStr}</div>
            </div>
        </div>
    );
}

function ReminderItem({ reminder }: { reminder: Reminder }) {
    const date = new Date(reminder.dueAt);
    const timeStr = date.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock size={16} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{reminder.title}</div>
                <div className="text-xs text-zinc-500">{timeStr}</div>
            </div>
        </div>
    );
}

function GoalItem({ goal }: { goal: Goal }) {
    return (
        <div className="p-4 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm truncate flex-1">{goal.title}</div>
                <span className="text-xs font-medium text-emerald-400 ml-2">{goal.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${goal.progress}%` }}
                />
            </div>
            {goal.targetDate && (
                <div className="text-[10px] text-zinc-500 mt-2">
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                </div>
            )}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-sm text-zinc-500 text-center py-8 bg-zinc-800/20 rounded-lg">
            {message}
        </div>
    );
}

function QuickLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
            {label}
            <ExternalLink size={14} />
        </a>
    );
}
