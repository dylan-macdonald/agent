import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    Target,
    Server,
    AlertCircle,
    ExternalLink,
    Clock,
    Moon,
    Dumbbell,
    Sparkles,
    Sun,
    Zap,
    TrendingUp,
    Bell
} from 'lucide-react';
import { api, type OverviewData, type CalendarEvent, type Goal, type Reminder } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { AnimatedPage, FadeIn, AnimatedList, AnimatedItem } from '../components/AnimatedPage';
import { DashboardSkeleton } from '../components/Skeleton';

interface SystemStatus {
    api: 'online' | 'offline' | 'checking';
    database: 'connected' | 'disconnected' | 'checking';
}

export function Overview() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<SystemStatus>({
        api: 'checking',
        database: 'checking',
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
            setStatus({ api: 'online', database: 'connected' });
        } else {
            setStatus({ api: 'offline', database: 'disconnected' });
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
            // Ignore
        }
    };

    const displayName = username || 'there';
    const greeting = getGreeting();
    const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    if (loading && status.api === 'checking') {
        return <DashboardSkeleton />;
    }

    return (
        <AnimatedPage className="max-w-6xl mx-auto space-y-6">
            {/* Hero Section */}
            <FadeIn>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 p-8">
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-500/5 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                    <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
                                <GreetingIcon />
                                <span>{todayDate}</span>
                            </div>
                            <h1 className="text-3xl font-bold mb-2">
                                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{displayName}</span>
                            </h1>
                            <p className="text-zinc-400 max-w-lg">
                                {getMotivationalMessage(overview)}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/chat')}
                                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all"
                            >
                                <Sparkles size={18} />
                                Start Chat
                            </motion.button>
                        </div>
                    </div>
                </div>
            </FadeIn>

            {/* Quick Stats */}
            {status.api === 'online' && overview && (
                <FadeIn delay={0.1}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <QuickStatCard
                            icon={<Calendar size={18} className="text-blue-400" />}
                            label="Today's Events"
                            value={overview.upcomingEvents.filter(e => isToday(e.startTime)).length.toString()}
                            subtext={`${overview.counts.totalEvents} this week`}
                            onClick={() => navigate('/calendar')}
                        />
                        <QuickStatCard
                            icon={<Bell size={18} className="text-amber-400" />}
                            label="Reminders"
                            value={overview.pendingReminders.length.toString()}
                            subtext="pending"
                        />
                        <QuickStatCard
                            icon={<Target size={18} className="text-emerald-400" />}
                            label="Active Goals"
                            value={overview.activeGoals.length.toString()}
                            subtext={`${getAverageProgress(overview.activeGoals)}% avg progress`}
                            onClick={() => navigate('/goals')}
                        />
                        <QuickStatCard
                            icon={<Zap size={18} className="text-violet-400" />}
                            label="This Week"
                            value={overview.healthStats.workoutsThisWeek.toString()}
                            subtext={`workouts · ${overview.healthStats.avgSleepHours || '--'}h sleep`}
                            onClick={() => navigate('/health')}
                        />
                    </div>
                </FadeIn>
            )}

            {/* Main Content Grid */}
            {status.api === 'online' && overview && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left Column - Schedule */}
                    <FadeIn delay={0.15} className="lg:col-span-2 space-y-4">
                        {/* Today's Schedule */}
                        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Calendar size={16} className="text-blue-400" />
                                    Today's Schedule
                                </h3>
                                <button
                                    onClick={() => navigate('/calendar')}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    View calendar
                                </button>
                            </div>

                            {overview.upcomingEvents.length > 0 ? (
                                <AnimatedList className="space-y-2">
                                    {overview.upcomingEvents.slice(0, 4).map((event) => (
                                        <AnimatedItem key={event.id}>
                                            <EventItem event={event} />
                                        </AnimatedItem>
                                    ))}
                                </AnimatedList>
                            ) : (
                                <EmptyState
                                    icon={<Calendar size={24} className="text-zinc-600" />}
                                    message="No events scheduled"
                                    action={{ label: 'Add event', onClick: () => navigate('/calendar') }}
                                />
                            )}
                        </div>

                        {/* Active Goals */}
                        {overview.activeGoals.length > 0 && (
                            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Target size={16} className="text-emerald-400" />
                                        Goal Progress
                                    </h3>
                                    <button
                                        onClick={() => navigate('/goals')}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                        View all
                                    </button>
                                </div>
                                <AnimatedList className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {overview.activeGoals.slice(0, 4).map((goal) => (
                                        <AnimatedItem key={goal.id}>
                                            <GoalItem goal={goal} />
                                        </AnimatedItem>
                                    ))}
                                </AnimatedList>
                            </div>
                        )}
                    </FadeIn>

                    {/* Right Column - Quick Info */}
                    <FadeIn delay={0.2} className="space-y-4">
                        {/* Reminders */}
                        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Clock size={16} className="text-amber-400" />
                                    Reminders
                                </h3>
                                <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
                                    {overview.pendingReminders.length}
                                </span>
                            </div>
                            {overview.pendingReminders.length > 0 ? (
                                <AnimatedList className="space-y-2">
                                    {overview.pendingReminders.slice(0, 3).map((reminder) => (
                                        <AnimatedItem key={reminder.id}>
                                            <ReminderItem reminder={reminder} />
                                        </AnimatedItem>
                                    ))}
                                </AnimatedList>
                            ) : (
                                <EmptyState
                                    icon={<Bell size={20} className="text-zinc-600" />}
                                    message="No pending reminders"
                                    small
                                />
                            )}
                        </div>

                        {/* Health Summary */}
                        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <TrendingUp size={16} className="text-rose-400" />
                                    Health This Week
                                </h3>
                            </div>
                            <div className="space-y-3">
                                <HealthMetric
                                    icon={<Moon size={16} className="text-indigo-400" />}
                                    label="Avg Sleep"
                                    value={overview.healthStats.avgSleepHours ? `${overview.healthStats.avgSleepHours}h` : '--'}
                                />
                                <HealthMetric
                                    icon={<Dumbbell size={16} className="text-emerald-400" />}
                                    label="Workouts"
                                    value={overview.healthStats.workoutsThisWeek.toString()}
                                />
                            </div>
                            <button
                                onClick={() => navigate('/health')}
                                className="w-full mt-4 text-xs text-center text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                View health details →
                            </button>
                        </div>

                        {/* System Status */}
                        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                            <h3 className="font-semibold flex items-center gap-2 mb-4">
                                <Server size={16} className="text-zinc-400" />
                                System Status
                            </h3>
                            <div className="space-y-2">
                                <StatusRow
                                    label="API Server"
                                    status={status.api === 'online' ? 'online' : 'offline'}
                                />
                                <StatusRow
                                    label="Database"
                                    status={status.database === 'connected' ? 'online' : 'offline'}
                                />
                            </div>
                        </div>
                    </FadeIn>
                </div>
            )}

            {/* Offline State */}
            {status.api === 'offline' && (
                <FadeIn delay={0.1}>
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 rounded-xl bg-amber-500/10">
                                <AlertCircle className="text-amber-400" size={22} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-amber-300 mb-2">Backend Offline</h3>
                                <p className="text-sm text-zinc-400 mb-4">
                                    Start the backend server to access all features.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <code className="px-3 py-1.5 bg-zinc-800/50 rounded-lg text-cyan-400 font-mono text-xs">
                                        ./setup.sh
                                    </code>
                                    <code className="px-3 py-1.5 bg-zinc-800/50 rounded-lg text-cyan-400 font-mono text-xs">
                                        npm run dev
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            )}

            {/* Quick Links */}
            <FadeIn delay={0.25}>
                <div className="flex flex-wrap gap-3">
                    <QuickLink href="http://localhost:3000/cost-dashboard.html" label="Cost Dashboard" />
                    <QuickLink href="http://localhost:3000/health" label="API Health" />
                </div>
            </FadeIn>
        </AnimatedPage>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function GreetingIcon() {
    const hour = new Date().getHours();
    if (hour < 12) return <Sun size={14} className="text-amber-400" />;
    if (hour < 17) return <Sun size={14} className="text-orange-400" />;
    return <Moon size={14} className="text-indigo-400" />;
}

function getMotivationalMessage(overview: OverviewData['overview'] | null): string {
    if (!overview) return "Your AI assistant is ready to help you stay organized.";

    const events = overview.upcomingEvents.filter(e => isToday(e.startTime)).length;
    const goals = overview.activeGoals.length;

    if (events === 0 && overview.pendingReminders.length === 0) {
        return "You have a clear schedule today. Perfect time to focus on your goals!";
    }
    if (events > 3) {
        return `Busy day ahead with ${events} events. Let's stay on track!`;
    }
    if (goals > 0) {
        const avgProgress = getAverageProgress(overview.activeGoals);
        if (avgProgress > 70) {
            return "You're making great progress on your goals. Keep it up!";
        }
    }
    return "Your AI assistant is ready to help you stay organized and productive.";
}

function isToday(dateStr: string): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function getAverageProgress(goals: Goal[]): number {
    if (goals.length === 0) return 0;
    const total = goals.reduce((acc, g) => acc + (g.progress || 0), 0);
    return Math.round(total / goals.length);
}

function QuickStatCard({ icon, label, value, subtext, onClick }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtext: string;
    onClick?: () => void;
}) {
    return (
        <motion.div
            whileHover={onClick ? { scale: 1.02 } : undefined}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            onClick={onClick}
            className={`rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4 ${onClick ? 'cursor-pointer hover:border-zinc-700/50' : ''} transition-colors`}
        >
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-zinc-500">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-zinc-500">{subtext}</div>
        </motion.div>
    );
}

function EventItem({ event }: { event: CalendarEvent }) {
    const date = new Date(event.startTime);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isNow = Math.abs(date.getTime() - Date.now()) < 30 * 60 * 1000;

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            isNow ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-zinc-800/30 hover:bg-zinc-800/50'
        }`}>
            <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center ${
                isNow ? 'bg-cyan-500/20' : 'bg-blue-500/10'
            }`}>
                <span className={`text-[10px] uppercase ${isNow ? 'text-cyan-400' : 'text-blue-400'}`}>
                    {date.toLocaleDateString([], { weekday: 'short' })}
                </span>
                <span className={`text-base font-bold ${isNow ? 'text-cyan-400' : 'text-blue-400'}`}>
                    {date.getDate()}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{event.title}</div>
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <Clock size={10} />
                    {timeStr}
                    {isNow && <span className="ml-2 text-cyan-400 animate-pulse">• Now</span>}
                </div>
            </div>
        </div>
    );
}

function ReminderItem({ reminder }: { reminder: Reminder }) {
    const date = new Date(reminder.dueAt);
    const isOverdue = date < new Date();
    const timeStr = date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            isOverdue ? 'bg-rose-500/10' : 'bg-zinc-800/30 hover:bg-zinc-800/50'
        }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isOverdue ? 'bg-rose-500/20' : 'bg-amber-500/10'
            }`}>
                <Bell size={14} className={isOverdue ? 'text-rose-400' : 'text-amber-400'} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{reminder.title}</div>
                <div className={`text-xs ${isOverdue ? 'text-rose-400' : 'text-zinc-500'}`}>
                    {isOverdue ? 'Overdue · ' : ''}{timeStr}
                </div>
            </div>
        </div>
    );
}

function GoalItem({ goal }: { goal: Goal }) {
    const progress = goal.progress || 0;

    return (
        <div className="p-4 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm truncate flex-1">{goal.title}</div>
                <span className="text-xs font-medium text-emerald-400 ml-2">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                />
            </div>
        </div>
    );
}

function HealthMetric({ icon, label, value }: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm text-zinc-400">{label}</span>
            </div>
            <span className="text-sm font-medium">{value}</span>
        </div>
    );
}

function StatusRow({ label, status }: { label: string; status: 'online' | 'offline' }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{label}</span>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                    status === 'online' ? 'bg-emerald-400' : 'bg-rose-400'
                }`} />
                <span className={status === 'online' ? 'text-emerald-400' : 'text-rose-400'}>
                    {status === 'online' ? 'Online' : 'Offline'}
                </span>
            </div>
        </div>
    );
}

function EmptyState({ icon, message, action, small }: {
    icon: React.ReactNode;
    message: string;
    action?: { label: string; onClick: () => void };
    small?: boolean;
}) {
    return (
        <div className={`text-center ${small ? 'py-4' : 'py-8'}`}>
            <div className={`mx-auto mb-3 ${small ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-zinc-800/50 flex items-center justify-center`}>
                {icon}
            </div>
            <p className="text-sm text-zinc-500 mb-3">{message}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                    {action.label} →
                </button>
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
            {label}
            <ExternalLink size={14} />
        </a>
    );
}
