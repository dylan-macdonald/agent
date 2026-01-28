/**
 * Global Search Component
 *
 * Provides search across all user data (events, goals, reminders)
 * with keyboard shortcuts and accessibility features
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Calendar, Target, Bell, Loader2, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type SearchResult } from '../lib/api';

interface GlobalSearchProps {
    userId: string;
}

export function GlobalSearch({ userId }: GlobalSearchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Keyboard shortcut to open search (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        } else {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            const { data, error } = await api.search(userId, query);
            if (data && !error) {
                setResults(data.results);
                setSelectedIndex(0);
            }
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, userId]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            handleSelect(results[selectedIndex]);
        }
    }, [results, selectedIndex]);

    const handleSelect = (result: SearchResult) => {
        setIsOpen(false);
        switch (result.type) {
            case 'event':
                navigate('/calendar');
                break;
            case 'goal':
                navigate('/goals');
                break;
            case 'reminder':
                navigate('/'); // Overview has reminders
                break;
        }
    };

    const getIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'event':
                return <Calendar size={16} className="text-blue-400" />;
            case 'goal':
                return <Target size={16} className="text-emerald-400" />;
            case 'reminder':
                return <Bell size={16} className="text-amber-400" />;
        }
    };

    const getTypeLabel = (type: SearchResult['type']) => {
        switch (type) {
            case 'event': return 'Event';
            case 'goal': return 'Goal';
            case 'reminder': return 'Reminder';
        }
    };

    return (
        <>
            {/* Search Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-sm"
                aria-label="Search (Cmd+K)"
            >
                <Search size={14} />
                <span className="hidden md:inline">Search...</span>
                <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-700/50 text-[10px] font-mono">
                    <Command size={10} />K
                </kbd>
            </button>

            {/* Search Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                        />

                        {/* Search Panel */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.15 }}
                            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Search"
                        >
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                                {/* Search Input */}
                                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                                    {loading ? (
                                        <Loader2 size={20} className="text-zinc-500 animate-spin" />
                                    ) : (
                                        <Search size={20} className="text-zinc-500" />
                                    )}
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Search events, goals, reminders..."
                                        className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-base"
                                        aria-label="Search query"
                                        aria-describedby="search-help"
                                    />
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                                        aria-label="Close search"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Results */}
                                <div
                                    className="max-h-80 overflow-y-auto"
                                    role="listbox"
                                    aria-label="Search results"
                                >
                                    {results.length > 0 ? (
                                        <ul className="py-2">
                                            {results.map((result, index) => (
                                                <li key={`${result.type}-${result.id}`}>
                                                    <button
                                                        onClick={() => handleSelect(result)}
                                                        onMouseEnter={() => setSelectedIndex(index)}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                                            index === selectedIndex
                                                                ? 'bg-zinc-800/70'
                                                                : 'hover:bg-zinc-800/50'
                                                        }`}
                                                        role="option"
                                                        aria-selected={index === selectedIndex}
                                                    >
                                                        <div className="p-2 rounded-lg bg-zinc-800">
                                                            {getIcon(result.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm truncate">
                                                                {result.title}
                                                            </div>
                                                            <div className="text-xs text-zinc-500 flex items-center gap-2">
                                                                <span>{getTypeLabel(result.type)}</span>
                                                                {result.date && (
                                                                    <>
                                                                        <span className="text-zinc-600">·</span>
                                                                        <span>
                                                                            {new Date(result.date).toLocaleDateString()}
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {result.status && (
                                                                    <>
                                                                        <span className="text-zinc-600">·</span>
                                                                        <span className="capitalize">{result.status.toLowerCase().replace('_', ' ')}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : query.length >= 2 && !loading ? (
                                        <div className="py-12 text-center text-zinc-500 text-sm">
                                            No results found for "{query}"
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-zinc-500 text-sm" id="search-help">
                                            Type at least 2 characters to search
                                        </div>
                                    )}
                                </div>

                                {/* Footer with keyboard hints */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-xs text-zinc-500">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono">↑↓</kbd>
                                            Navigate
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono">↵</kbd>
                                            Select
                                        </span>
                                    </div>
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono">Esc</kbd>
                                        Close
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
