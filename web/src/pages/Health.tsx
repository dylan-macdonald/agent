import { Heart, Moon, Dumbbell, Brain, TrendingUp } from 'lucide-react';

export function Health() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    icon={<Moon className="text-indigo-400" size={20} />}
                    label="Sleep"
                    value="--"
                    unit="hours"
                    trend="Log via SMS"
                    color="indigo"
                />
                <MetricCard
                    icon={<Dumbbell className="text-emerald-400" size={20} />}
                    label="Workouts"
                    value="--"
                    unit="this week"
                    trend="Log via SMS"
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

            {/* Info Section */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-zinc-800">
                        <Heart size={24} className="text-rose-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold mb-1">Health & Wellness Tracking</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            Track your health metrics via natural language. The dashboard visualization
                            is under development - your data is being collected in the backend.
                        </p>
                    </div>
                </div>
            </div>

            {/* Commands */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CommandCard
                    title="Sleep Logging"
                    commands={[
                        "I slept 8 hours last night",
                        "Log sleep: 11pm to 7am",
                        "I woke up at 6:30am"
                    ]}
                />
                <CommandCard
                    title="Workout Logging"
                    commands={[
                        "I ran for 30 minutes",
                        "Just did a 45 min yoga session",
                        "Log workout: weights, 1 hour"
                    ]}
                />
                <CommandCard
                    title="Mindfulness"
                    commands={[
                        "I need to meditate",
                        "Give me a breathing exercise",
                        "Start a 5 minute meditation"
                    ]}
                />
                <CommandCard
                    title="Check-ins"
                    commands={[
                        "How am I doing this week?",
                        "Show my health summary",
                        "What's my sleep average?"
                    ]}
                />
            </div>
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
    return (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                    {icon}
                </div>
                <TrendingUp size={16} className="text-zinc-600" />
            </div>
            <div className="text-2xl font-bold mb-1">{value}</div>
            <div className="text-xs text-zinc-500">{label} {unit}</div>
            <div className="text-xs text-zinc-600 mt-2">{trend}</div>
        </div>
    );
}

function CommandCard({ title, commands }: { title: string; commands: string[] }) {
    return (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <h4 className="font-medium text-sm mb-3">{title}</h4>
            <div className="space-y-2">
                {commands.map((cmd, i) => (
                    <div key={i} className="text-xs text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                        "{cmd}"
                    </div>
                ))}
            </div>
        </div>
    );
}
