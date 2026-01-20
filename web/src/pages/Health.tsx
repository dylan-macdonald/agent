import { useState, useEffect, useMemo } from 'react';
import { Heart, Moon, Dumbbell, Brain, TrendingUp, Plus, Loader2, AlertCircle, X, Clock } from 'lucide-react';
import { api, type SleepLog, type Workout } from '../lib/api';
import { BarChart } from '../components/Chart';

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
            const [sleepData, workoutData] = await Promise.all([
                api.getSleepLogs(userId, 7),
                api.getWorkouts(userId, 7),
            ]);
            setSleepLogs(sleepData);
            setWorkouts(workoutData);
        } catch (err) {
            setError('Failed to load health data');
            console.error('Health data load error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogSleep(bedtime: string, wakeTime: string, quality: number) {
        try {
            const newLog = await api.logSleep(userId, { bedtime, wakeTime, quality });
            setSleepLogs(prev => [newLog, ...prev]);
            setShowSleepModal(false);
        } catch (err) {
            console.error('Failed to log sleep:', err);
        }
    }

    async function handleLogWorkout(activityType: string, duration: number, intensity: string) {
        try {
            const newWorkout = await api.logWorkout(userId, { activityType, duration, intensity });
            setWorkouts(prev => [newWorkout, ...prev]);
            setShowWorkoutModal(false);
        } catch (err) {
            console.error('Failed to log workout:', err);
        }
    }

    // Calculate stats
    const avgSleep = sleepLogs.length > 0
        ? (sleepLogs.reduce((acc, log) => acc + (log.duration || 0), 0) / sleepLogs.length).toFixed(1)
        : '--';

    const weeklyWorkouts = workouts.length;
    const totalWorkoutMinutes = workouts.reduce((acc, w) => acc + w.duration, 0);

    // Prepare chart data
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
                const logDate = new Date(log.bedtime);
                return logDate.toDateString() === date.toDateString();
            });
            return {
                label: days[date.getDay()],
                value: dayLog?.duration || 0,
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
                const workoutDate = new Date(w.date);
                return workoutDate.toDateString() === date.toDateString();
            });
            const totalMinutes = dayWorkouts.reduce((acc, w) => acc + w.duration, 0);
            return {
                label: days[date.getDay()],
                value: totalMinutes,
            };
        });
    }, [workouts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-zinc-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    icon={<Moon className="text-indigo-400" size={20} />}
                    label="Avg Sleep"
                    value={avgSleep}
                    unit="hours/night"
                    trend={sleepLogs.length > 0 ? `${sleepLogs.length} logs this week` : 'No data yet'}
                    color="indigo"
                />
                <MetricCard
                    icon={<Dumbbell className="text-emerald-400" size={20} />}
                    label="Workouts"
                    value={weeklyWorkouts.toString()}
                    unit="this week"
                    trend={totalWorkoutMinutes > 0 ? `${totalWorkoutMinutes} min total` : 'Log your first workout'}
                    color="emerald"
                />
                <MetricCard
                    icon={<Brain className="text-amber-400" size={20} />}
                    label="Mindfulness"
                    value="--"
                    unit="minutes"
                    trend="Available via Voice"
                    color="amber"
                />
            </div>

            {/* Weekly Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
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
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
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

            {/* Quick Actions */}
            <div className="flex gap-3">
                <button
                    onClick={() => setShowSleepModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                >
                    <Plus size={16} />
                    Log Sleep
                </button>
                <button
                    onClick={() => setShowWorkoutModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                    <Plus size={16} />
                    Log Workout
                </button>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sleep Logs */}
                <section>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                        <Moon size={14} />
                        Recent Sleep
                    </h3>
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                        {sleepLogs.length > 0 ? (
                            sleepLogs.slice(0, 5).map((log) => (
                                <div key={log.id} className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium">
                                                {log.duration ? `${log.duration.toFixed(1)} hours` : 'Duration unknown'}
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                {new Date(log.bedtime).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <QualityBadge quality={log.quality} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-sm text-zinc-500">
                                No sleep logs yet. Start tracking your sleep!
                            </div>
                        )}
                    </div>
                </section>

                {/* Workout Logs */}
                <section>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                        <Dumbbell size={14} />
                        Recent Workouts
                    </h3>
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                        {workouts.length > 0 ? (
                            workouts.slice(0, 5).map((workout) => (
                                <div key={workout.id} className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium capitalize">
                                                {workout.activityType}
                                            </div>
                                            <div className="text-xs text-zinc-500 flex items-center gap-2">
                                                <Clock size={10} />
                                                {workout.duration} min
                                                <span className="text-zinc-600">·</span>
                                                {new Date(workout.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <IntensityBadge intensity={workout.intensity} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-sm text-zinc-500">
                                No workouts logged yet. Get moving!
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Info Section */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-zinc-800">
                        <Heart size={24} className="text-rose-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold mb-1">Quick Commands</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            Track your health via natural language commands.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                                "I slept 8 hours last night"
                            </div>
                            <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                                "I ran for 30 minutes"
                            </div>
                            <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                                "How did I sleep this week?"
                            </div>
                            <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                                "Start a 5 minute meditation"
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showSleepModal && (
                <SleepModal
                    onClose={() => setShowSleepModal(false)}
                    onSubmit={handleLogSleep}
                />
            )}
            {showWorkoutModal && (
                <WorkoutModal
                    onClose={() => setShowWorkoutModal(false)}
                    onSubmit={handleLogWorkout}
                />
            )}
        </div>
    );
}

function MetricCard({ icon, label, value, unit, trend, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    unit: string;
    trend: string;
    color: string;
}) {
    const bgColors: Record<string, string> = {
        indigo: 'bg-indigo-500/10',
        emerald: 'bg-emerald-500/10',
        amber: 'bg-amber-500/10',
    };

    return (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${bgColors[color] || 'bg-zinc-800'}`}>
                    {icon}
                </div>
                <TrendingUp size={16} className="text-zinc-600" />
            </div>
            <div className="text-2xl font-bold mb-1">{value}</div>
            <div className="text-xs text-zinc-500">{label} · {unit}</div>
            <div className="text-xs text-zinc-600 mt-2">{trend}</div>
        </div>
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
        <span className={`text-xs px-2 py-1 rounded ${colors}`}>
            {quality}/5
        </span>
    );
}

function IntensityBadge({ intensity }: { intensity: string }) {
    const colors: Record<string, string> = {
        low: 'bg-blue-500/10 text-blue-400',
        moderate: 'bg-amber-500/10 text-amber-400',
        high: 'bg-red-500/10 text-red-400',
    };

    return (
        <span className={`text-xs px-2 py-1 rounded capitalize ${colors[intensity] || 'bg-zinc-800 text-zinc-400'}`}>
            {intensity}
        </span>
    );
}

function SleepModal({ onClose, onSubmit }: {
    onClose: () => void;
    onSubmit: (bedtime: string, wakeTime: string, quality: number) => void;
}) {
    const [bedtime, setBedtime] = useState('23:00');
    const [wakeTime, setWakeTime] = useState('07:00');
    const [quality, setQuality] = useState(3);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const bedtimeISO = new Date(`${date}T${bedtime}`).toISOString();
        const wakeTimeISO = new Date(`${date}T${wakeTime}`).toISOString();
        await onSubmit(bedtimeISO, wakeTimeISO, quality);
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h3 className="font-semibold">Log Sleep</h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Bedtime</label>
                            <input
                                type="time"
                                value={bedtime}
                                onChange={(e) => setBedtime(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Wake time</label>
                            <input
                                type="time"
                                value={wakeTime}
                                onChange={(e) => setWakeTime(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Sleep quality</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => setQuality(q)}
                                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                                        quality === q
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            Log Sleep
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function WorkoutModal({ onClose, onSubmit }: {
    onClose: () => void;
    onSubmit: (activityType: string, duration: number, intensity: string) => void;
}) {
    const [activityType, setActivityType] = useState('running');
    const [duration, setDuration] = useState(30);
    const [intensity, setIntensity] = useState('moderate');
    const [submitting, setSubmitting] = useState(false);

    const activities = ['running', 'walking', 'cycling', 'swimming', 'weights', 'yoga', 'hiit', 'other'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit(activityType, duration, intensity);
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h3 className="font-semibold">Log Workout</h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Activity</label>
                        <select
                            value={activityType}
                            onChange={(e) => setActivityType(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        >
                            {activities.map((a) => (
                                <option key={a} value={a} className="capitalize">{a}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Duration (minutes)</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                            min={1}
                            max={300}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Intensity</label>
                        <div className="flex gap-2">
                            {['low', 'moderate', 'high'].map((i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setIntensity(i)}
                                    className={`flex-1 py-2 rounded-lg text-sm capitalize transition-colors ${
                                        intensity === i
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            Log Workout
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
