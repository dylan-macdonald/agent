import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    LogOut,
    Home,
    MessageSquare,
    Calendar,
    Activity,
    Settings,
    Target,
    CreditCard,
    Plus,
    Bot,
    ChevronRight,
    Menu,
    X
} from 'lucide-react';
import { api } from '../lib/api';
import { GlobalSearch } from '../components/GlobalSearch';

function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

interface UserInfo {
    username: string | null;
    initials: string;
}

export function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const userId = localStorage.getItem('agent_user_id');
    const [userInfo, setUserInfo] = useState<UserInfo>({ username: null, initials: 'U' });
    const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'checking'>('checking');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Close mobile menu on navigation
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        loadUserInfo();
        checkSystemStatus();
    }, [userId]);

    async function loadUserInfo() {
        if (!userId) return;
        try {
            const { data } = await api.getSettings(userId);
            if (data?.settings?.username) {
                const name = data.settings.username;
                const initials = name.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                setUserInfo({ username: name, initials });
            } else {
                setUserInfo({ username: null, initials: userId.slice(0, 2).toUpperCase() });
            }
        } catch {
            setUserInfo({ username: null, initials: userId?.slice(0, 2).toUpperCase() || 'U' });
        }
    }

    async function checkSystemStatus() {
        try {
            const { data, error } = await api.checkHealth();
            setSystemStatus(data && !error ? 'online' : 'offline');
        } catch {
            setSystemStatus('offline');
        }
    }

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
        const path = location.pathname;
        if (path === '/') return 'Overview';
        const name = path.slice(1);
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    const displayName = userInfo.username || 'User';

    return (
        <div className="flex h-screen bg-[var(--color-bg-primary)] text-white overflow-hidden">
            {/* Skip Navigation Link (Accessibility) */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-white focus:rounded-lg focus:outline-none"
            >
                Skip to main content
            </a>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar - hidden on mobile unless menu open */}
            <aside className={cn(
                "w-64 border-r border-zinc-800/50 flex flex-col bg-[var(--color-bg-secondary)]",
                "fixed lg:relative inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                {/* Logo */}
                <div className="p-5 border-b border-zinc-800/50">
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => navigate('/')}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/30 transition-shadow">
                            <Bot size={22} className="text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-semibold tracking-tight block">Agent</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Personal Assistant</span>
                        </div>
                    </div>
                </div>

                {/* New Chat Button */}
                <div className="p-4">
                    <button
                        onClick={() => {
                            if (location.pathname === '/chat') {
                                window.location.reload();
                            } else {
                                navigate('/chat');
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all"
                    >
                        <Plus size={18} />
                        <span>New Chat</span>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1" aria-label="Main navigation">
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

                    <div className="pt-4 mt-4 border-t border-zinc-800/50">
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
                    </div>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-zinc-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                            {userInfo.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                                {displayName}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">
                                {userInfo.username ? 'Personal Account' : `ID: ${userId?.slice(0, 8)}...`}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="Sign out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-zinc-800/50 flex items-center justify-between px-4 lg:px-6 bg-[var(--color-bg-secondary)]/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 -ml-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-zinc-500 hidden sm:inline">Dashboard</span>
                            <ChevronRight size={14} className="text-zinc-600 hidden sm:inline" />
                            <span className="text-white font-medium">{getPageTitle()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Global Search */}
                        {userId && <GlobalSearch userId={userId} />}

                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                            systemStatus === 'online' && "bg-emerald-500/10 text-emerald-400",
                            systemStatus === 'offline' && "bg-red-500/10 text-red-400",
                            systemStatus === 'checking' && "bg-amber-500/10 text-amber-400"
                        )}
                        role="status"
                        aria-live="polite"
                        >
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                systemStatus === 'online' && "bg-emerald-400 animate-pulse",
                                systemStatus === 'offline' && "bg-red-400",
                                systemStatus === 'checking' && "bg-amber-400 animate-pulse"
                            )} aria-hidden="true" />
                            <span className="hidden sm:inline">
                                {systemStatus === 'online' ? 'Connected' : systemStatus === 'offline' ? 'Offline' : 'Connecting...'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div
                    id="main-content"
                    className="flex-1 overflow-auto p-4 lg:p-6 pb-20 lg:pb-6 bg-gradient-to-b from-[var(--color-bg-primary)] to-[var(--color-bg-secondary)] scroll-touch"
                    role="main"
                    tabIndex={-1}
                >
                    <Outlet />
                </div>

                {/* Mobile Bottom Navigation */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-bg-secondary)]/95 backdrop-blur-lg border-t border-zinc-800/50 safe-bottom z-30" aria-label="Mobile navigation">
                    <div className="flex items-center justify-around px-2 py-2">
                        <MobileNavItem
                            icon={<Home size={20} />}
                            label="Home"
                            active={isActive('/')}
                            onClick={() => navigate('/')}
                        />
                        <MobileNavItem
                            icon={<MessageSquare size={20} />}
                            label="Chat"
                            active={isActive('/chat')}
                            onClick={() => navigate('/chat')}
                        />
                        <MobileNavItem
                            icon={<Target size={20} />}
                            label="Goals"
                            active={isActive('/goals')}
                            onClick={() => navigate('/goals')}
                        />
                        <MobileNavItem
                            icon={<Activity size={20} />}
                            label="Health"
                            active={isActive('/health')}
                            onClick={() => navigate('/health')}
                        />
                        <MobileNavItem
                            icon={<Settings size={20} />}
                            label="Settings"
                            active={isActive('/settings')}
                            onClick={() => navigate('/settings')}
                        />
                    </div>
                </nav>
            </main>
        </div>
    );
}

function NavItem({
    icon,
    label,
    active = false,
    onClick,
    badge
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    badge?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
                active
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
        >
            {icon}
            <span className="flex-1 text-left">{label}</span>
            {badge && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-cyan-500/20 text-cyan-400">
                    {badge}
                </span>
            )}
            {active && (
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
        </button>
    );
}

function MobileNavItem({
    icon,
    label,
    active = false,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px]",
                active
                    ? "text-cyan-400"
                    : "text-zinc-500 active:text-zinc-300"
            )}
        >
            <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                active && "bg-cyan-500/10"
            )}>
                {icon}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );
}
