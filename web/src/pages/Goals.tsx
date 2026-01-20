import { useState, useEffect, useMemo } from 'react';
import { Target, Plus, CheckCircle2, Circle, TrendingUp, Calendar as CalendarIcon, Loader2, AlertCircle, X } from 'lucide-react';
import { api, type Goal } from '../lib/api';
import { ProgressRing } from '../components/Chart';

export function Goals() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const userId = localStorage.getItem('agent_user_id') || 'default-user';

    useEffect(() => {
        loadGoals();
    }, []);

    async function loadGoals() {
        try {
            setLoading(true);
            setError(null);
            const data = await api.getGoals(userId);
            setGoals(data);
        } catch (err) {
            setError('Failed to load goals');
            console.error('Goals load error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateProgress(goalId: string, progress: number) {
        try {
            await api.updateGoalProgress(userId, goalId, progress);
            setGoals(prev => prev.map(g =>
                g.id === goalId ? { ...g, progress } : g
            ));
        } catch (err) {
            console.error('Failed to update progress:', err);
        }
    }

    async function handleCreateGoal(title: string, targetDate: string | null) {
        try {
            const newGoal = await api.createGoal(userId, {
                title,
                targetDate: targetDate || undefined,
            });
            setGoals(prev => [...prev, newGoal]);
            setShowAddModal(false);
        } catch (err) {
            console.error('Failed to create goal:', err);
        }
    }

    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');

    // Calculate overall progress
    const overallProgress = useMemo(() => {
        if (goals.length === 0) return 0;
        const totalProgress = goals.reduce((acc, g) => acc + (g.progress || 0), 0);
        return Math.round(totalProgress / goals.length);
    }, [goals]);

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

            {/* Summary Card */}
            {goals.length > 0 && (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                    <div className="flex items-center gap-6">
                        <ProgressRing
                            value={overallProgress}
                            max={100}
                            size={80}
                            color="#3b82f6"
                            label="Overall"
                        />
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-2xl font-bold">{goals.length}</div>
                                <div className="text-xs text-zinc-500">Total Goals</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-400">{activeGoals.length}</div>
                                <div className="text-xs text-zinc-500">Active</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-emerald-400">{completedGoals.length}</div>
                                <div className="text-xs text-zinc-500">Completed</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Your Goals</h2>
                    <p className="text-sm text-zinc-500 mt-1">
                        {activeGoals.length} active · {completedGoals.length} completed
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                >
                    <Plus size={16} />
                    <span className="text-sm">New Goal</span>
                </button>
            </div>

            {/* Active Goals */}
            {activeGoals.length > 0 && (
                <section>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Active Goals</h3>
                    <div className="space-y-3">
                        {activeGoals.map(goal => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                onUpdateProgress={(p) => handleUpdateProgress(goal.id, p)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
                <section>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Completed</h3>
                    <div className="space-y-3">
                        {completedGoals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} completed />
                        ))}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {goals.length === 0 && (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                        <Target size={24} className="text-zinc-500" />
                    </div>
                    <h3 className="font-semibold mb-2">No goals yet</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                        Set your first goal to start tracking your progress.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors"
                    >
                        <Plus size={16} />
                        Create Goal
                    </button>
                </div>
            )}

            {/* Tips */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                <h4 className="font-medium text-sm mb-3">Quick Commands</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                        "I want to read 12 books this year"
                    </div>
                    <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                        "Set goal to exercise 3x per week"
                    </div>
                    <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                        "Update book goal: 5 of 12 complete"
                    </div>
                    <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                        "How am I doing on my goals?"
                    </div>
                </div>
            </div>

            {/* Add Goal Modal */}
            {showAddModal && (
                <AddGoalModal
                    onClose={() => setShowAddModal(false)}
                    onCreate={handleCreateGoal}
                />
            )}
        </div>
    );
}

function GoalCard({ goal, completed, onUpdateProgress }: {
    goal: Goal;
    completed?: boolean;
    onUpdateProgress?: (progress: number) => void;
}) {
    const progress = goal.progress || 0;
    const daysLeft = goal.targetDate
        ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className={`rounded-xl bg-zinc-900 border border-zinc-800 p-4 ${completed ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${completed ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                    {completed ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                        <Target size={18} className="text-blue-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium truncate">{goal.title}</h4>
                        {!completed && daysLeft !== null && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                                daysLeft < 7
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-zinc-800 text-zinc-400'
                            }`}>
                                {daysLeft > 0 ? `${daysLeft}d left` : 'Due today'}
                            </span>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-500">Progress</span>
                            <span className="text-zinc-400">{progress}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Quick progress buttons */}
                    {!completed && onUpdateProgress && (
                        <div className="flex items-center gap-2 mt-3">
                            {[25, 50, 75, 100].map(p => (
                                <button
                                    key={p}
                                    onClick={() => onUpdateProgress(p)}
                                    className={`text-xs px-2 py-1 rounded ${
                                        progress >= p
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    {p}%
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AddGoalModal({ onClose, onCreate }: {
    onClose: () => void;
    onCreate: (title: string, targetDate: string | null) => void;
}) {
    const [title, setTitle] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [creating, setCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setCreating(true);
        await onCreate(title.trim(), targetDate || null);
        setCreating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h3 className="font-semibold">New Goal</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">What's your goal?</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Read 12 books this year"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Target date (optional)</label>
                        <input
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
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
                            disabled={!title.trim() || creating}
                            className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {creating && <Loader2 size={16} className="animate-spin" />}
                            Create Goal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
