
import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Home, MessageSquare, Calendar, Activity, Settings } from 'lucide-react';

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
        <div className="flex h-screen bg-gray-950 text-white font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col backdrop-blur-md bg-opacity-80">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Agent Dashboard
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavItem
                        icon={<Home size={20} />}
                        label="Overview"
                        active={isActive('/')}
                        onClick={() => navigate('/')}
                    />
                    <NavItem
                        icon={<MessageSquare size={20} />}
                        label="Chat"
                        active={isActive('/chat')}
                        onClick={() => navigate('/chat')}
                    />
                    <NavItem
                        icon={<Calendar size={20} />}
                        label="Calendar"
                        active={isActive('/calendar')}
                        onClick={() => navigate('/calendar')}
                    />
                    <NavItem
                        icon={<Activity size={20} />}
                        label="Health"
                        active={isActive('/health')}
                        onClick={() => navigate('/health')}
                    />
                    <NavItem
                        icon={<Settings size={20} />}
                        label="Settings"
                        active={isActive('/settings')}
                        onClick={() => navigate('/settings')}
                    />
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-950 to-gray-900 flex flex-col">
                <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-900 bg-opacity-50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                    <h2 className="text-lg font-medium text-gray-200">
                        {location.pathname === '/' && 'Overview'}
                        {location.pathname.startsWith('/chat') && 'Chat'}
                        {location.pathname.startsWith('/calendar') && 'Calendar'}
                        {location.pathname.startsWith('/health') && 'Health & Wellness'}
                        {location.pathname.startsWith('/settings') && 'Settings'}
                    </h2>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-400">
                            Logged in as <span className="text-blue-400 font-medium">{userId}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8 relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-all ${active
                    ? 'bg-blue-600 bg-opacity-20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
        >
            {icon}
            <span className="font-medium">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />}
        </button>
    );
}
