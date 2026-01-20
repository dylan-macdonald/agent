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
    Dumbbell
} from 'lucide-react';
import { api, type OverviewData, type CalendarEvent, type Goal, type Reminder } from '../lib/api';

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
    const [overview, setOverview] = useState<OverviewData['overview'] | null>(null);
    const [loading, setLoading] = useState(true);
    const userId = localStorage.getItem('agent_user_id') || '';

    useEffect(() => {
        checkHealth();
        fetchOverview();
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
                        health tracking, and goal management.
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

            {/* Stats & Data */}
            {status.api === 'online' && overview && (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <QuickStatCard
                            icon={<Calendar size={20} className="text-blue-400" />}
                            label="Events"
                            value={overview.counts.totalEvents.toString()}
                            subtext="This week"
                        />
                        <QuickStatCard
                            icon={<Target size={20} className="text-emerald-400" />}
                            label="Active Goals"
                            value={overview.counts.totalGoals.toString()}
                            subtext="In progress"
                        />
                        <QuickStatCard
                            icon={<Moon size={20} className="text-indigo-400" />}
                            label="Avg Sleep"
                            value={overview.healthStats.avgSleepHours ? `${overview.healthStats.avgSleepHours}h` : '--'}
                            subtext="This week"
                        />
                        <QuickStatCard
                            icon={<Dumbbell size={20} className="text-rose-400" />}
                            label="Workouts"
                            value={overview.healthStats.workoutsThisWeek.toString()}
                            subtext="This week"
                        />
                    </div>

                    {/* Upcoming Events & Reminders */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Upcoming Events */}
                        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Calendar size={18} className="text-blue-400" />
                                    Upcoming Events
                                </h3>
                                <span className="text-xs text-zinc-500">{overview.upcomingEvents.length} upcoming</span>
                            </div>
                            {overview.upcomingEvents.length > 0 ? (
                                <div className="space-y-3">
                                    {overview.upcomingEvents.map((event: CalendarEvent) => (
                                        <EventItem key={event.id} event={event} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 text-center py-4">No upcoming events</p>
                            )}
                        </div>

                        {/* Pending Reminders */}
                        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Clock size={18} className="text-amber-400" />
                                    Pending Reminders
                                </h3>
                                <span className="text-xs text-zinc-500">{overview.pendingReminders.length} pending</span>
                            </div>
                            {overview.pendingReminders.length > 0 ? (
                                <div className="space-y-3">
                                    {overview.pendingReminders.map((reminder: Reminder) => (
                                        <ReminderItem key={reminder.id} reminder={reminder} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 text-center py-4">No pending reminders</p>
                            )}
                        </div>
                    </div>

                    {/* Active Goals */}
                    {overview.activeGoals.length > 0 && (
                        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Target size={18} className="text-emerald-400" />
                                    Active Goals
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="text-center py-8 text-zinc-500">
                    Loading your data...
                </div>
            )}

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
                                The API server is not running. To use the full features:
                            </p>
                            <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                                <li>Run <code className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">./setup.sh</code></li>
                                <li>Set up PostgreSQL and Redis databases</li>
                                <li>Configure API keys in <code className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">.env</code></li>
                                <li>Run <code className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300">npm run dev</code></li>
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

function QuickStatCard({ icon, label, value, subtext }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtext: string;
}) {
    return (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-sm text-zinc-400">{label}</span>
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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex flex-col items-center justify-center">
                <span className="text-xs text-blue-400">{date.toLocaleDateString([], { weekday: 'short' })}</span>
                <span className="text-lg font-bold text-blue-400">{date.getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{event.title}</div>
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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock size={18} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{reminder.title}</div>
                <div className="text-xs text-zinc-500">{timeStr}</div>
            </div>
        </div>
    );
}

function GoalItem({ goal }: { goal: Goal }) {
    return (
        <div className="p-4 rounded-lg bg-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
                <div className="font-medium truncate flex-1">{goal.title}</div>
                <span className="text-sm text-emerald-400 ml-2">{goal.progress}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${goal.progress}%` }}
                />
            </div>
            {goal.targetDate && (
                <div className="text-xs text-zinc-500 mt-2">
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                </div>
            )}
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
