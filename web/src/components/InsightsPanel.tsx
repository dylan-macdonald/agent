/**
 * Insights Panel
 *
 * Displays AI-generated insights from the autonomous agent
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Brain,
    Lightbulb,
    Target,
    Heart,
    Clock,
    Star,
    X,
    RefreshCw,
    ChevronRight,
    Zap
} from 'lucide-react';
import { api, type AgentInsight } from '../lib/api';

interface InsightsPanelProps {
    userId: string;
}

const insightIcons: Record<AgentInsight['type'], typeof Sparkles> = {
    task_suggestion: Clock,
    reminder_suggestion: Clock,
    pattern_observation: Brain,
    goal_nudge: Target,
    forgotten_desire: Star,
    health_insight: Heart,
    recommendation: Lightbulb,
};

const priorityColors = {
    high: 'from-rose-500/20 to-orange-500/20 border-rose-500/30',
    medium: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
    low: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
};

const priorityBadge = {
    high: 'bg-rose-500/20 text-rose-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-cyan-500/20 text-cyan-400',
};

export function InsightsPanel({ userId }: InsightsPanelProps) {
    const [insights, setInsights] = useState<AgentInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [thinking, setThinking] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadInsights();
    }, [userId]);

    async function loadInsights() {
        try {
            setLoading(true);
            const { data } = await api.getInsights(userId, 5);
            if (data?.insights) {
                setInsights(data.insights);
            }
        } catch (err) {
            console.error('Failed to load insights:', err);
        } finally {
            setLoading(false);
        }
    }

    async function triggerThinking() {
        try {
            setThinking(true);
            const { data } = await api.triggerThinking(userId);
            if (data?.insights) {
                setInsights(data.insights);
            }
        } catch (err) {
            console.error('Failed to trigger thinking:', err);
        } finally {
            setThinking(false);
        }
    }

    async function dismissInsight(insightId: string) {
        try {
            await api.dismissInsight(userId, insightId);
            setInsights(prev => prev.filter(i => i.id !== insightId));
        } catch (err) {
            console.error('Failed to dismiss insight:', err);
        }
    }

    if (loading) {
        return (
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Brain className="text-violet-400 animate-pulse" size={18} />
                    <span className="font-semibold">Agent Thinking...</span>
                </div>
                <div className="space-y-3">
                    {[1, 2].map(i => (
                        <div key={i} className="h-16 bg-zinc-800/30 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (insights.length === 0) {
        return (
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Brain className="text-violet-400" size={18} />
                        <span className="font-semibold">Agent Insights</span>
                    </div>
                    <button
                        onClick={triggerThinking}
                        disabled={thinking}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {thinking ? (
                            <RefreshCw size={12} className="animate-spin" />
                        ) : (
                            <Zap size={12} />
                        )}
                        Think Now
                    </button>
                </div>
                <div className="text-center py-6 text-zinc-500">
                    <Brain size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No insights yet</p>
                    <p className="text-xs mt-1">The agent will think about your life every few hours</p>
                </div>
            </div>
        );
    }

    const displayedInsights = expanded ? insights : insights.slice(0, 2);

    return (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain className="text-violet-400" size={18} />
                    <span className="font-semibold">Agent Insights</span>
                    <span className="px-2 py-0.5 text-[10px] bg-violet-500/20 text-violet-400 rounded-full">
                        {insights.length} new
                    </span>
                </div>
                <button
                    onClick={triggerThinking}
                    disabled={thinking}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-lg transition-colors disabled:opacity-50"
                >
                    {thinking ? (
                        <RefreshCw size={12} className="animate-spin" />
                    ) : (
                        <Zap size={12} />
                    )}
                    Think Now
                </button>
            </div>

            <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                    {displayedInsights.map((insight, index) => {
                        const Icon = insightIcons[insight.type] || Lightbulb;

                        return (
                            <motion.div
                                key={insight.id || index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className={`relative rounded-lg bg-gradient-to-r ${priorityColors[insight.priority]} border p-4 group`}
                            >
                                <button
                                    onClick={() => insight.id && dismissInsight(insight.id)}
                                    className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                                >
                                    <X size={14} className="text-zinc-400" />
                                </button>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <Icon size={16} className="text-white/80" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm truncate">
                                                {insight.title}
                                            </span>
                                            <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${priorityBadge[insight.priority]}`}>
                                                {insight.priority}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 line-clamp-2">
                                            {insight.description}
                                        </p>
                                        {insight.actionable && (
                                            <button className="mt-2 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                                <span>Take action</span>
                                                <ChevronRight size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </AnimatePresence>

            {insights.length > 2 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full mt-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1"
                >
                    {expanded ? 'Show less' : `Show ${insights.length - 2} more insights`}
                    <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </button>
            )}
        </div>
    );
}
