
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, MessageSquare, Calendar, Activity, Settings } from 'lucide-react';

export function Dashboard() {
    const navigate = useNavigate();
    const userId = localStorage.getItem('agent_user_id');

    const handleLogout = () => {
        localStorage.removeItem('agent_user_id');
        navigate('/login');
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
                    <NavItem icon={<Home size={20} />} label="Overview" active />
                    <NavItem icon={<MessageSquare size={20} />} label="Chat" />
                    <NavItem icon={<Calendar size={20} />} label="Calendar" />
                    <NavItem icon={<Activity size={20} />} label="Health" />
                    <NavItem icon={<Settings size={20} />} label="Settings" />
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
            <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-950 to-gray-900">
                <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-900 bg-opacity-50 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-lg font-medium text-gray-200">Overview</h2>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-400">
                            Logged in as <span className="text-blue-400 font-medium">{userId}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                    </div>
                </header>

                <div className="p-8">
                    <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-xl">
                        <h3 className="text-2xl font-bold mb-4">Welcome Back!</h3>
                        <p className="text-gray-400">
                            Your personal agent is running and ready to assist you.
                            Use the sidebar to navigate or start a conversation.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <button
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
