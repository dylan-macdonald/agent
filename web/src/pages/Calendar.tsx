import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export function Calendar() {
    const today = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate calendar days for current month
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-xl font-semibold">
                        {monthNames[today.getMonth()]} {today.getFullYear()}
                    </h2>
                    <button className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>
                <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-500 cursor-not-allowed"
                >
                    <Plus size={16} />
                    <span className="text-sm">Add Event</span>
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-zinc-800">
                    {dayNames.map(day => (
                        <div key={day} className="px-4 py-3 text-center text-xs font-medium text-zinc-500">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                    {days.map((day, index) => (
                        <div
                            key={index}
                            className={`min-h-24 p-2 border-b border-r border-zinc-800 last:border-r-0 ${
                                day === today.getDate() ? 'bg-blue-500/5' : ''
                            }`}
                        >
                            {day && (
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                                    day === today.getDate()
                                        ? 'bg-blue-500 text-white font-medium'
                                        : 'text-zinc-400'
                                }`}>
                                    {day}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Info Card */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-zinc-800">
                        <CalendarIcon size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-1">Calendar Integration</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            Your calendar events are managed via natural language commands.
                            The visual calendar interface is under development.
                        </p>
                        <div className="space-y-2 text-sm">
                            <p className="text-zinc-500">
                                <span className="text-zinc-300">SMS:</span> "Schedule meeting tomorrow at 3pm"
                            </p>
                            <p className="text-zinc-500">
                                <span className="text-zinc-300">Voice:</span> "What's on my calendar this week?"
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
