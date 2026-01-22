import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Moon, Dumbbell, Brain, TrendingUp, Plus, Loader2, AlertCircle, X, Clock, Flame, Sparkles } from 'lucide-react';
import { api, type SleepLog, type Workout } from '../lib/api';
import { BarChart } from '../components/Chart';
import { AnimatedPage, FadeIn, AnimatedList, AnimatedItem } from '../components/AnimatedPage';
import { SkeletonStats, SkeletonChart } from '../components/Skeleton';

export function Health() {
    const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSleepModal, setShowSleepModal] = useState(false);
    const [showWorkoutModal, setShowWorkoutModal] = useState(false);

    const userId = localStorage.getItem('agent_user_id') || 'default-user';

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            setError(null);
            const [sleepResponse, workoutResponse] = await Promise.all([
                api.getSleepLogs(userId, 7),
                api.getWorkouts(userId, 7),
            ]);
            if (sleepResponse.error) throw new Error(sleepResponse.error);
            if (workoutResponse.error) throw new Error(workoutResponse.error);
            setSleepLogs(sleepResponse.data?.sleepLogs || []);
            setWorkouts(workoutResponse.data?.workouts || []);
        } catch (err) {
            setError('Failed to load health data');
            console.error('Health data load error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogSleep(startTime: string, endTime: string, quality: number) {
        try {
            const { data, error: apiError } = await api.logSleep(userId, { startTime, endTime, quality });
            if (apiError || !data?.sleepLog) throw new Error(apiError || 'Failed to log sleep');
            setSleepLogs(prev => [data.sleepLog, ...prev]);
            setShowSleepModal(false);
        } catch (err) {
            console.error('Failed to log sleep:', err);
        }
    }

    async function handleLogWorkout(activityType: string, durationMins: number) {
        try {
            const { data, error: apiError } = await api.logWorkout(userId, { activityType, durationMins });
            if (apiError || !data?.workout) throw new Error(apiError || 'Failed to log workout');
            setWorkouts(prev => [data.workout, ...prev]);
            setShowWorkoutModal(false);
        } catch (err) {
            console.error('Failed to log workout:', err);
        }
    }

    const getSleepDuration = (log: SleepLog) => {
        const start = new Date(log.startTime).getTime();
        const end = new Date(log.endTime).getTime();
        return (end - start) / (1000 * 60 * 60);
    };

    const avgSleep = sleepLogs.length > 0
        ? (sleepLogs.reduce((acc, log) => acc + getSleepDuration(log), 0) / sleepLogs.length).toFixed(1)
        : '--';

    const weeklyWorkouts = workouts.length;
    const totalWorkoutMinutes = workouts.reduce((acc, w) => acc + w.durationMins, 0);

    const sleepChartData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (6 - i));
            return d;
        });

        return last7Days.map(date => {
            const dayLog = sleepLogs.find(log => {
                const logDate = new Date(log.startTime);
                return logDate.toDateString() === date.toDateString();
            });
            return {
                label: days[date.getDay()] || '',
                value: dayLog ? getSleepDuration(dayLog) : 0,
            };
        });
    }, [sleepLogs]);

    const workoutChartData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (6 - i));
            return d;
        });

        return last7Days.map(date => {
            const dayWorkouts = workouts.filter(w => {
                const workoutDate = new Date(w.startedAt);
                return workoutDate.toDateString() === date.toDateString();
            });
            const totalMinutes = dayWorkouts.reduce((acc, w) => acc + w.durationMins, 0);
            return {
                label: days[date.getDay()] || '',
                value: totalMinutes,
            };
        });
    }, [workouts]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <SkeletonStats />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SkeletonChart />
                    <SkeletonChart />
                </div>
            </div>
        );
    }

    return (
        <AnimatedPage className="max-w-4xl mx-auto space-y-6">
            {error && (
                <FadeIn>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                </FadeIn>
            )}

            {/* Overview Cards */}
            <FadeIn>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard
                        icon={<Moon className="text-indigo-400" size={22} />}
                        label="Avg Sleep"
                        value={avgSleep}
                        unit="hours/night"
                        trend={sleepLogs.length > 0 ? `${sleepLogs.length} logs this week` : 'No data yet'}
                        color="indigo"
                        delay={0}
                    />
                    <MetricCard
                        icon={<Dumbbell className="text-emerald-400" size={22} />}
                        label="Workouts"
                        value={weeklyWorkouts.toString()}
                        unit="this week"
                        trend={totalWorkoutMinutes > 0 ? `${totalWorkoutMinutes} min total` : 'Log your first workout'}
                        color="emerald"
                        delay={0.05}
                    />
                    <MetricCard
                        icon={<Brain className="text-amber-400" size={22} />}
                        label="Mindfulness"
                        value="--"
                        unit="minutes"
                        trend="Available via Voice"
                        color="amber"
                        delay={0.1}
                    />
                </div>
            </FadeIn>

            {/* Weekly Trends */}
            <FadeIn delay={0.15}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <Moon size={14} className="text-indigo-400" />
                                Sleep (hours/night)
                            </h3>
                        </div>
                        <BarChart
                            data={sleepChartData}
                            height={100}
                            color="#818cf8"
                            emptyMessage="No sleep data this week"
                        />
                    </div>
                    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <Dumbbell size={14} className="text-emerald-400" />
                                Workouts (minutes/day)
                            </h3>
                        </div>
                        <BarChart
                            data={workoutChartData}
                            height={100}
                            color="#34d399"
                            emptyMessage="No workout data this week"
                        />
                    </div>
                </div>
            </FadeIn>

            {/* Quick Actions */}
            <FadeIn delay={0.2}>
                <div className="flex gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowSleepModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors font-medium"
                    >
                        <Plus size={16} />
                        Log Sleep
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowWorkoutModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium"
                    >
                        <Plus size={16} />
                        Log Workout
                    </motion.button>
                </div>
            </FadeIn>

            {/* Recent Activity */}
            <FadeIn delay={0.25}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sleep Logs */}
                    <section>
                        <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                            <Moon size={14} className="text-indigo-400" />
                            Recent Sleep
                        </h3>
                        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 divide-y divide-zinc-800/50 overflow-hidden">
                            {sleepLogs.length > 0 ? (
                                <AnimatedList>
                                    {sleepLogs.slice(0, 5).map((log) => (
                                        <AnimatedItem key={log.id}>
                                            <div className="p-4 hover:bg-zinc-800/30 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-sm font-medium flex items-center gap-2">
                                                            {getSleepDuration(log).toFixed(1)} hours
                                                            {getSleepDuration(log) >= 7 && (
                                                                <Sparkles size={12} className="text-emerald-400" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-zinc-500">
                                                            {new Date(log.startTime).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <QualityBadge quality={log.quality} />
                                                </div>
                                            </div>
                                        </AnimatedItem>
                                    ))}
                                </AnimatedList>
                            ) : (
                                <div className="p-8 text-center text-sm text-zinc-500">
                                    No sleep logs yet. Start tracking your sleep!
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Workout Logs */}
                    <section>
                        <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                            <Dumbbell size={14} className="text-emerald-400" />
                            Recent Workouts
                        </h3>
                        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 divide-y divide-zinc-800/50 overflow-hidden">
                            {workouts.length > 0 ? (
                                <AnimatedList>
                                    {workouts.slice(0, 5).map((workout) => (
                                        <AnimatedItem key={workout.id}>
                                            <div className="p-4 hover:bg-zinc-800/30 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-sm font-medium capitalize flex items-center gap-2">
                                                            {workout.activityType}
                                                            {workout.durationMins >= 30 && (
                                                                <Flame size={12} className="text-orange-400" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                                                            <Clock size={10} />
                                                            {workout.durationMins} min
                                                            <span className="text-zinc-600">·</span>
                                                            {new Date(workout.startedAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    {workout.caloriesBurned && (
                                                        <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                                                            {workout.caloriesBurned} cal
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </AnimatedItem>
                                    ))}
                                </AnimatedList>
                            ) : (
                                <div className="p-8 text-center text-sm text-zinc-500">
                                    No workouts logged yet. Get moving!
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </FadeIn>

            {/* Info Section */}
            <FadeIn delay={0.3}>
                <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/10">
                            <Heart size={24} className="text-rose-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold mb-1">Quick Commands</h3>
                            <p className="text-sm text-zinc-400 mb-4">
                                Track your health via natural language commands.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <code className="text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                                    "I slept 8 hours last night"
                                </code>
                                <code className="text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                                    "I ran for 30 minutes"
                                </code>
                                <code className="text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                                    "How did I sleep this week?"
                                </code>
                                <code className="text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                                    "Start a 5 minute meditation"
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeIn>

            {/* Modals */}
            <AnimatePresence>
                {showSleepModal && (
                    <SleepModal
                        onClose={() => setShowSleepModal(false)}
                        onSubmit={handleLogSleep}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showWorkoutModal && (
                    <WorkoutModal
                        onClose={() => setShowWorkoutModal(false)}
                        onSubmit={handleLogWorkout}
                    />
                )}
            </AnimatePresence>
        </AnimatedPage>
    );
}

function MetricCard({ icon, label, value, unit, trend, color, delay = 0 }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    unit: string;
    trend: string;
    color: string;
    delay?: number;
}) {
    const bgColors: Record<string, string> = {
        indigo: 'bg-indigo-500/10',
        emerald: 'bg-emerald-500/10',
        amber: 'bg-amber-500/10',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5 hover:border-zinc-700/50 transition-colors"
        >
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${bgColors[color] || 'bg-zinc-800'}`}>
                    {icon}
                </div>
                <TrendingUp size={16} className="text-zinc-600" />
            </div>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="text-xs text-zinc-500">{label} · {unit}</div>
            <div className="text-xs text-zinc-600 mt-2">{trend}</div>
        </motion.div>
    );
}

function QualityBadge({ quality }: { quality?: number }) {
    if (!quality) return null;

    const colors = quality >= 4
        ? 'bg-emerald-500/10 text-emerald-400'
        : quality >= 3
        ? 'bg-amber-500/10 text-amber-400'
        : 'bg-red-500/10 text-red-400';

    return (
        <span className={`text-xs px-2 py-1 rounded-lg ${colors}`}>
            {quality}/5
        </span>
    );
}

function SleepModal({ onClose, onSubmit }: {
    onClose: () => void;
    onSubmit: (startTime: string, endTime: string, quality: number) => void;
}) {
    const [bedtime, setBedtime] = useState('23:00');
    const [wakeTime, setWakeTime] = useState('07:00');
    const [quality, setQuality] = useState(3);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0] || '');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const startTimeISO = new Date(`${date}T${bedtime}`).toISOString();
        const endTimeISO = new Date(`${date}T${wakeTime}`).toISOString();
        await onSubmit(startTimeISO, endTimeISO, quality);
        setSubmitting(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl"
            >
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Moon size={18} className="text-indigo-400" />
                        Log Sleep
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Bedtime</label>
                            <input
                                type="time"
                                value={bedtime}
                                onChange={(e) => setBedtime(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Wake time</label>
                            <input
                                type="time"
                                value={wakeTime}
                                onChange={(e) => setWakeTime(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Sleep quality</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((q) => (
                                <motion.button
                                    key={q}
                                    type="button"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setQuality(q)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                        quality === q
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50'
                                    }`}
                                >
                                    {q}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-3 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            Log Sleep
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function WorkoutModal({ onClose, onSubmit }: {
    onClose: () => void;
    onSubmit: (activityType: string, durationMins: number) => void;
}) {
    const [activityType, setActivityType] = useState('running');
    const [duration, setDuration] = useState(30);
    const [submitting, setSubmitting] = useState(false);

    const activities = [
        { value: 'running', label: 'Running', icon: '🏃' },
        { value: 'walking', label: 'Walking', icon: '🚶' },
        { value: 'cycling', label: 'Cycling', icon: '🚴' },
        { value: 'swimming', label: 'Swimming', icon: '🏊' },
        { value: 'weights', label: 'Weights', icon: '🏋️' },
        { value: 'yoga', label: 'Yoga', icon: '🧘' },
        { value: 'hiit', label: 'HIIT', icon: '⚡' },
        { value: 'other', label: 'Other', icon: '💪' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit(activityType, duration);
        setSubmitting(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl"
            >
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Dumbbell size={18} className="text-emerald-400" />
                        Log Workout
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Activity</label>
                        <div className="grid grid-cols-4 gap-2">
                            {activities.map((a) => (
                                <motion.button
                                    key={a.value}
                                    type="button"
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setActivityType(a.value)}
                                    className={`p-3 rounded-xl text-center transition-colors ${
                                        activityType === a.value
                                            ? 'bg-emerald-500/20 border border-emerald-500/30'
                                            : 'bg-zinc-800/50 border border-transparent hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="text-xl mb-1">{a.icon}</div>
                                    <div className="text-xs text-zinc-400">{a.label}</div>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Duration (minutes)</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                            min={1}
                            max={300}
                            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            Log Workout
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
