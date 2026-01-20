import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Home, MessageSquare, Calendar, Activity, Settings, Target, CreditCard, Plus, Clock, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const userId = localStorage.getItem('agent_user_id');

    const handleLogout = () => {
        localStorage.removeItem('agent_user_id');
        navigate('/login');
    };

    const isActive = (path: string) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="flex h-screen bg-[var(--color-terminal-bg)] text-[var(--color-terminal-fg)] font-mono selection:bg-[var(--color-terminal-accent)] selection:text-black overflow-hidden scanlines">

            {/* Sidebar */}
            <aside className="w-72 border-r border-zinc-800 flex flex-col bg-black/80 backdrop-blur-sm z-10 relative">
                {/* Logo & Agent Name */}
                <div className="p-6 border-b border-zinc-900/50">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-[var(--color-terminal-accent)] transition-colors">
                            <Terminal size={20} className="text-[var(--color-terminal-accent)]" />
                        </div>
                        <div>
                            <span className="text-xl font-bold tracking-tight block terminal-glow">AGENT</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">v11.0.0 [ONLINE]</span>
                        </div>
                    </div>
                </div>

                {/* Main Navigation */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">

                    {/* Primary Actions */}
                    <div className="space-y-1">
                        <button
                            onClick={() => {
                                // Force hard reset of chat state if already on chat page
                                if (location.pathname === '/chat') {
                                    window.location.reload();
                                } else {
                                    navigate('/chat');
                                }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 hover:border-[var(--color-terminal-accent)] text-zinc-300 hover:text-[var(--color-terminal-accent)] rounded transition-all group"
                        >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                            <span className="font-bold">New Mission</span>
                            <span className="ml-auto text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">CMD+N</span>
                        </button>
                    </div>

                    {/* App Modules */}
                    <div className="space-y-1">
                        <div className="text-[10px] uppercase text-zinc-600 font-bold px-3 mb-2 tracking-widest">Modules</div>
                        <NavItem icon={<Home size={16} />} label="Overview" active={isActive('/')} onClick={() => navigate('/')} />
                        <NavItem icon={<MessageSquare size={16} />} label="Communications" active={isActive('/chat')} onClick={() => navigate('/chat')} />
                        <NavItem icon={<Calendar size={16} />} label="Schedule" active={isActive('/calendar')} onClick={() => navigate('/calendar')} />
                        <NavItem icon={<Target size={16} />} label="Objectives" active={isActive('/goals')} onClick={() => navigate('/goals')} />
                        <NavItem icon={<Activity size={16} />} label="Vitals" active={isActive('/health')} onClick={() => navigate('/health')} />
                    </div>

                    {/* Recent Comms (Static Mock for MVP 11) */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between px-3 mb-2">
                            <div className="text-[10px] uppercase text-zinc-600 font-bold tracking-widest">Logs</div>
                            <Clock size={12} className="text-zinc-700" />
                        </div>
                        <div className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer truncate border-l border-transparent hover:border-zinc-700 transition-colors">
                            &gt; Project Alpha Details
                        </div>
                        <div className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer truncate border-l border-transparent hover:border-zinc-700 transition-colors">
                            &gt; Weekly Sync Notes
                        </div>
                        <div className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer truncate border-l border-transparent hover:border-zinc-700 transition-colors">
                            &gt; Server Diagnostics
                        </div>
                    </div>
                </div>

                {/* System / User Config */}
                <div className="p-4 border-t border-zinc-900 bg-black/50">
                    <NavItem icon={<CreditCard size={16} />} label="Resources" active={isActive('/billing')} onClick={() => navigate('/billing')} />
                    <NavItem icon={<Settings size={16} />} label="System Config" active={isActive('/settings')} onClick={() => navigate('/settings')} />

                    <div className="mt-4 pt-4 border-t border-zinc-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[var(--color-terminal-accent)] text-black flex items-center justify-center font-bold">
                            {/* Initials - Real App would parse name */}
                            OP
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">OPERATOR</div>
                            <div className="text-[10px] text-zinc-600 truncate font-mono">ID: {userId?.substring(0, 8)}...</div>
                        </div>
                        <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col relative z-0">
                {/* Subtle Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.8)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20"></div>

                {/* Header with Breadcrumbs/Title */}
                <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-black/50 backdrop-blur-sm shrink-0 z-10">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <span className="text-[var(--color-terminal-accent)]">root</span>
                        <span>/</span>
                        <span className="text-zinc-300 uppercase">{location.pathname === '/' ? 'home' : location.pathname.substring(1)}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-medium text-emerald-500">SYSTEM NORMAL</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-0 relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false, onClick, disabled = false }: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded transition-all text-xs font-medium border border-transparent",
                disabled && "opacity-50 cursor-not-allowed",
                active
                    ? "bg-[var(--color-terminal-accent)]/10 text-[var(--color-terminal-accent)] border-[var(--color-terminal-accent)]/20"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
        >
            {icon}
            <span className="uppercase tracking-wide">{label}</span>
            {active && (
                <div className="ml-auto w-1 h-1 rounded-full bg-[var(--color-terminal-accent)]" />
            )}
        </button>
    );
}
