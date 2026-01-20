import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Home, MessageSquare, Calendar, Activity, Settings, Bot, Target, CreditCard } from 'lucide-react';

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

    const getPageTitle = () => {
        if (location.pathname === '/') return 'Overview';
        if (location.pathname.startsWith('/chat')) return 'Chat';
        if (location.pathname.startsWith('/calendar')) return 'Calendar';
        if (location.pathname.startsWith('/goals')) return 'Goals';
        if (location.pathname.startsWith('/health')) return 'Health & Wellness';
        if (location.pathname.startsWith('/billing')) return 'Billing & API Keys';
        if (location.pathname.startsWith('/settings')) return 'Settings';
        return '';
    };

    return (
        <div className="flex h-screen bg-zinc-950 text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900/50 border-r border-zinc-800 flex flex-col backdrop-blur-xl">
                {/* Logo */}
                <div className="p-5 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                            <Bot size={20} className="text-white" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight">Agent</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    <NavItem
                        icon={<Home size={18} />}
                        label="Overview"
                        active={isActive('/')}
                        onClick={() => navigate('/')}
                    />
                    <NavItem
                        icon={<MessageSquare size={18} />}
                        label="Chat"
                        active={isActive('/chat')}
                        onClick={() => navigate('/chat')}
                    />
                    <NavItem
                        icon={<Calendar size={18} />}
                        label="Calendar"
                        active={isActive('/calendar')}
                        onClick={() => navigate('/calendar')}
                    />
                    <NavItem
                        icon={<Target size={18} />}
                        label="Goals"
                        active={isActive('/goals')}
                        onClick={() => navigate('/goals')}
                    />
                    <NavItem
                        icon={<Activity size={18} />}
                        label="Health"
                        active={isActive('/health')}
                        onClick={() => navigate('/health')}
                    />
                    <NavItem
                        icon={<CreditCard size={18} />}
                        label="Billing"
                        active={isActive('/billing')}
                        onClick={() => navigate('/billing')}
                    />
                    <NavItem
                        icon={<Settings size={18} />}
                        label="Settings"
                        active={isActive('/settings')}
                        onClick={() => navigate('/settings')}
                    />
                </nav>

                {/* User Section */}
                <div className="p-3 border-t border-zinc-800">
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold">
                            {userId?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{userId}</div>
                            <div className="text-xs text-zinc-500">Active</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col bg-zinc-950">
                {/* Header */}
                <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30 backdrop-blur-sm shrink-0">
                    <h2 className="text-base font-medium text-zinc-200">
                        {getPageTitle()}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-zinc-500">
                            Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">?</kbd> for help
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
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
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm ${
                disabled
                    ? 'text-zinc-600 cursor-not-allowed'
                    : active
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
        >
            {icon}
            <span className="font-medium">{label}</span>
            {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
            )}
            {disabled && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">Soon</span>
            )}
        </button>
    );
}
