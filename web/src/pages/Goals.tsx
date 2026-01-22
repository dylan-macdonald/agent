import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, CheckCircle2, Loader2, AlertCircle, X, TrendingUp, Award, Clock } from 'lucide-react';
import { api, type Goal } from '../lib/api';
import { ProgressRing } from '../components/Chart';
import { AnimatedPage, FadeIn, AnimatedList, AnimatedItem } from '../components/AnimatedPage';
import { SkeletonCard, SkeletonStats } from '../components/Skeleton';

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
            const { data, error: apiError } = await api.getGoals(userId);
            if (apiError) throw new Error(apiError);
            setGoals(data?.goals || []);
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
                g.id === goalId ? { ...g, progress, status: progress >= 100 ? 'COMPLETED' : g.status } : g
            ));
        } catch (err) {
            console.error('Failed to update progress:', err);
        }
    }

    async function handleCreateGoal(title: string, targetDate: string | null) {
        try {
            const { data, error: apiError } = await api.createGoal(userId, {
                title,
                targetDate: targetDate || undefined,
            });
            if (apiError || !data?.goal) throw new Error(apiError || 'Failed to create goal');
            setGoals(prev => [...prev, data.goal]);
            setShowAddModal(false);
        } catch (err) {
            console.error('Failed to create goal:', err);
        }
    }

    const activeGoals = goals.filter(g => g.status === 'IN_PROGRESS');
    const completedGoals = goals.filter(g => g.status === 'COMPLETED');

    const overallProgress = useMemo(() => {
        if (goals.length === 0) return 0;
        const totalProgress = goals.reduce((acc, g) => acc + (g.progress || 0), 0);
        return Math.round(totalProgress / goals.length);
    }, [goals]);

    const goalsNearDeadline = useMemo(() => {
        const now = new Date();
        return activeGoals.filter(g => {
            if (!g.targetDate) return false;
            const days = Math.ceil((new Date(g.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return days <= 7 && days >= 0;
        }).length;
    }, [activeGoals]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <SkeletonStats />
                <SkeletonCard />
                <SkeletonCard />
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

            {/* Summary Card */}
            {goals.length > 0 && (
                <FadeIn>
                    <div className="rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/50 p-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            >
                                <ProgressRing
                                    value={overallProgress}
                                    max={100}
                                    size={100}
                                    strokeWidth={10}
                                    color="#22d3ee"
                                    label="Progress"
                                />
                            </motion.div>
                            <div className="flex-1 grid grid-cols-3 gap-6 text-center md:text-left">
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div className="text-3xl font-bold">{goals.length}</div>
                                    <div className="text-xs text-zinc-500">Total Goals</div>
                                </motion.div>
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.15 }}
                                >
                                    <div className="text-3xl font-bold text-cyan-400">{activeGoals.length}</div>
                                    <div className="text-xs text-zinc-500">Active</div>
                                </motion.div>
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className="text-3xl font-bold text-emerald-400">{completedGoals.length}</div>
                                    <div className="text-xs text-zinc-500">Completed</div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Progress indicators */}
                        {(goalsNearDeadline > 0 || overallProgress >= 50) && (
                            <div className="mt-6 pt-6 border-t border-zinc-800/50 flex flex-wrap gap-3">
                                {goalsNearDeadline > 0 && (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.25 }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs"
                                    >
                                        <Clock size={12} />
                                        {goalsNearDeadline} due soon
                                    </motion.div>
                                )}
                                {overallProgress >= 50 && (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs"
                                    >
                                        <TrendingUp size={12} />
                                        On track!
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </div>
                </FadeIn>
            )}

            {/* Header */}
            <FadeIn delay={0.1}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">Your Goals</h2>
                        <p className="text-sm text-zinc-500 mt-1">
                            {activeGoals.length} active · {completedGoals.length} completed
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium shadow-lg shadow-cyan-500/20 transition-all"
                    >
                        <Plus size={16} />
                        <span className="text-sm">New Goal</span>
                    </motion.button>
                </div>
            </FadeIn>

            {/* Active Goals */}
            {activeGoals.length > 0 && (
                <FadeIn delay={0.15}>
                    <section>
                        <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                            <Target size={14} className="text-cyan-400" />
                            Active Goals
                        </h3>
                        <AnimatedList className="space-y-3">
                            {activeGoals.map((goal, i) => (
                                <AnimatedItem key={goal.id}>
                                    <GoalCard
                                        goal={goal}
                                        onUpdateProgress={(p) => handleUpdateProgress(goal.id, p)}
                                    />
                                </AnimatedItem>
                            ))}
                        </AnimatedList>
                    </section>
                </FadeIn>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
                <FadeIn delay={0.2}>
                    <section>
                        <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                            <Award size={14} className="text-emerald-400" />
                            Completed
                        </h3>
                        <AnimatedList className="space-y-3">
                            {completedGoals.map((goal, i) => (
                                <AnimatedItem key={goal.id}>
                                    <GoalCard goal={goal} completed />
                                </AnimatedItem>
                            ))}
                        </AnimatedList>
                    </section>
                </FadeIn>
            )}

            {/* Empty State */}
            {goals.length === 0 && (
                <FadeIn delay={0.1}>
                    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-12 text-center">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4"
                        >
                            <Target size={32} className="text-cyan-400" />
                        </motion.div>
                        <h3 className="font-semibold text-lg mb-2">No goals yet</h3>
                        <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
                            Set your first goal to start tracking your progress and building momentum.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/20 transition-all"
                        >
                            <Plus size={16} />
                            Create Your First Goal
                        </motion.button>
                    </div>
                </FadeIn>
            )}

            {/* Tips */}
            <FadeIn delay={0.25}>
                <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                    <h4 className="font-medium text-sm mb-3">Quick Commands</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <code className="text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                            "I want to read 12 books this year"
                        </code>
                        <code className="text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                            "Set goal to exercise 3x per week"
                        </code>
                        <code className="text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                            "Update book goal: 5 of 12 complete"
                        </code>
                        <code className="text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                            "How am I doing on my goals?"
                        </code>
                    </div>
                </div>
            </FadeIn>

            {/* Add Goal Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <AddGoalModal
                        onClose={() => setShowAddModal(false)}
                        onCreate={handleCreateGoal}
                    />
                )}
            </AnimatePresence>
        </AnimatedPage>
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
        <motion.div
            layout
            className={`rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5 ${completed ? 'opacity-70' : ''} hover:border-zinc-700/50 transition-colors`}
        >
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${completed ? 'bg-emerald-500/10' : 'bg-cyan-500/10'}`}>
                    {completed ? (
                        <CheckCircle2 size={20} className="text-emerald-400" />
                    ) : (
                        <Target size={20} className="text-cyan-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-medium truncate">{goal.title}</h4>
                        {!completed && daysLeft !== null && (
                            <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                                daysLeft < 7
                                    ? daysLeft < 0
                                        ? 'bg-red-500/10 text-red-400'
                                        : 'bg-amber-500/10 text-amber-400'
                                    : 'bg-zinc-800/50 text-zinc-400'
                            }`}>
                                {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                            </span>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-zinc-500">Progress</span>
                            <span className={`font-medium ${completed ? 'text-emerald-400' : 'text-zinc-300'}`}>{progress}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className={`h-full rounded-full ${completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                            />
                        </div>
                    </div>

                    {/* Quick progress buttons */}
                    {!completed && onUpdateProgress && (
                        <div className="flex items-center gap-2 mt-4">
                            {[25, 50, 75, 100].map(p => (
                                <motion.button
                                    key={p}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onUpdateProgress(p)}
                                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                        progress >= p
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                            : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 border border-transparent'
                                    }`}
                                >
                                    {p}%
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
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
                    <h3 className="font-semibold text-lg">Create New Goal</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">What's your goal?</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Read 12 books this year"
                            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Target date (optional)</label>
                        <input
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
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
                            disabled={!title.trim() || creating}
                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium"
                        >
                            {creating && <Loader2 size={16} className="animate-spin" />}
                            Create Goal
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
