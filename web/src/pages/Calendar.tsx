import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, X, Loader2, AlertCircle } from 'lucide-react';
import { api, type CalendarEvent } from '../lib/api';

export function Calendar() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const userId = localStorage.getItem('agent_user_id') || 'default-user';

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        loadEvents();
    }, [currentDate]);

    async function loadEvents() {
        try {
            setLoading(true);
            setError(null);

            // Get first and last day of current month
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const data = await api.getCalendarEvents(
                userId,
                firstDay.toISOString(),
                lastDay.toISOString()
            );
            setEvents(data);
        } catch (err) {
            setError('Failed to load events');
            console.error('Calendar load error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateEvent(title: string, startTime: string, endTime: string) {
        try {
            const newEvent = await api.createCalendarEvent(userId, {
                title,
                startTime,
                endTime,
            });
            setEvents(prev => [...prev, newEvent]);
            setShowAddModal(false);
            setSelectedDay(null);
        } catch (err) {
            console.error('Failed to create event:', err);
        }
    }

    async function handleDeleteEvent(eventId: string) {
        try {
            await api.deleteCalendarEvent(userId, eventId);
            setEvents(prev => prev.filter(e => e.id !== eventId));
        } catch (err) {
            console.error('Failed to delete event:', err);
        }
    }

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days: (number | null)[] = [];
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    }, [currentDate]);

    // Group events by day
    const eventsByDay = useMemo(() => {
        const grouped: Record<number, CalendarEvent[]> = {};
        events.forEach(event => {
            const eventDate = new Date(event.startTime);
            if (eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear()) {
                const day = eventDate.getDate();
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(event);
            }
        });
        return grouped;
    }, [events, currentDate]);

    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() &&
                          today.getFullYear() === currentDate.getFullYear();

    const navigateMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-xl font-semibold min-w-[180px] text-center">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
                <button
                    onClick={() => {
                        setSelectedDay(today.getDate());
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
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
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-zinc-500" size={24} />
                    </div>
                ) : (
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, index) => {
                            const isToday = isCurrentMonth && day === today.getDate();
                            const dayEvents = day ? eventsByDay[day] || [] : [];

                            return (
                                <div
                                    key={index}
                                    onClick={() => day && setSelectedDay(selectedDay === day ? null : day)}
                                    className={`min-h-24 p-2 border-b border-r border-zinc-800 last:border-r-0 cursor-pointer transition-colors ${
                                        isToday ? 'bg-blue-500/5' : 'hover:bg-zinc-800/50'
                                    } ${selectedDay === day ? 'bg-zinc-800/70' : ''}`}
                                >
                                    {day && (
                                        <>
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                                                isToday
                                                    ? 'bg-blue-500 text-white font-medium'
                                                    : 'text-zinc-400'
                                            }`}>
                                                {day}
                                            </span>
                                            <div className="mt-1 space-y-1">
                                                {dayEvents.slice(0, 2).map(event => (
                                                    <div
                                                        key={event.id}
                                                        className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 truncate"
                                                        title={event.title}
                                                    >
                                                        {event.title}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 2 && (
                                                    <div className="text-[10px] text-zinc-500">
                                                        +{dayEvents.length - 2} more
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selected Day Details */}
            {selectedDay && (
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">
                            {monthNames[currentDate.getMonth()]} {selectedDay}
                        </h3>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="text-sm text-blue-400 hover:text-blue-300"
                        >
                            + Add event
                        </button>
                    </div>

                    {eventsByDay[selectedDay]?.length > 0 ? (
                        <div className="space-y-2">
                            {eventsByDay[selectedDay].map(event => (
                                <div key={event.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Clock size={14} className="text-zinc-500" />
                                        <div>
                                            <div className="text-sm font-medium">{event.title}</div>
                                            <div className="text-xs text-zinc-500">
                                                {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {event.endTime && ` - ${new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500">No events scheduled for this day.</p>
                    )}
                </div>
            )}

            {/* Quick Commands */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-zinc-800">
                        <CalendarIcon size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-1">Quick Commands</h3>
                        <p className="text-sm text-zinc-400 mb-3">
                            Manage your calendar with natural language via SMS or voice.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                                "Schedule meeting tomorrow at 3pm"
                            </div>
                            <div className="text-zinc-500 font-mono bg-zinc-800 rounded px-3 py-2">
                                "What's on my calendar this week?"
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Event Modal */}
            {showAddModal && (
                <AddEventModal
                    defaultDate={selectedDay
                        ? new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay)
                        : new Date()
                    }
                    onClose={() => {
                        setShowAddModal(false);
                    }}
                    onCreate={handleCreateEvent}
                />
            )}
        </div>
    );
}

function AddEventModal({ defaultDate, onClose, onCreate }: {
    defaultDate: Date;
    onClose: () => void;
    onCreate: (title: string, startTime: string, endTime: string) => void;
}) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(defaultDate.toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [creating, setCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setCreating(true);
        const startDateTime = new Date(`${date}T${startTime}`).toISOString();
        const endDateTime = new Date(`${date}T${endTime}`).toISOString();
        await onCreate(title.trim(), startDateTime, endDateTime);
        setCreating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h3 className="font-semibold">New Event</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Event title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Team meeting"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Start time</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">End time</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />
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
                            disabled={!title.trim() || creating}
                            className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {creating && <Loader2 size={16} className="animate-spin" />}
                            Create Event
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
