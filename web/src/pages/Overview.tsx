


export function Overview() {
    return (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-xl">
                <h3 className="text-2xl font-bold mb-4">Welcome Back!</h3>
                <p className="text-gray-400">
                    Your personal agent is running and ready to assist you.
                    Use the sidebar to navigate or start a conversation.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h4 className="font-semibold mb-2">Recent Activity</h4>
                    <p className="text-sm text-gray-500">No recent activity.</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h4 className="font-semibold mb-2">Upcoming Reminders</h4>
                    <p className="text-sm text-gray-500">No active reminders.</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h4 className="font-semibold mb-2">System Status</h4>
                    <p className="text-sm text-green-400">● Online</p>
                </div>
            </div>
        </div>
    );
}
