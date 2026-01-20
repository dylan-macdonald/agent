import { Settings as SettingsIcon, Shield, Bell, Mic, Eye, Search, Code, Lock } from 'lucide-react';

export function Settings() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Privacy Controls */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-blue-400" />
                    <h3 className="font-semibold">Privacy Controls</h3>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                    <ToggleSetting
                        icon={<Search size={18} />}
                        title="Web Search"
                        description="Allow assistant to search the web for information"
                        enabled={true}
                        disabled
                    />
                    <ToggleSetting
                        icon={<Code size={18} />}
                        title="Script Execution"
                        description="Allow running scripts (requires approval)"
                        enabled={false}
                        disabled
                    />
                    <ToggleSetting
                        icon={<Eye size={18} />}
                        title="Screen Capture"
                        description="Allow assistant to view your screen (requires approval)"
                        enabled={false}
                        disabled
                    />
                    <ToggleSetting
                        icon={<Mic size={18} />}
                        title="Voice Features"
                        description="Enable wake word detection and voice interaction"
                        enabled={true}
                        disabled
                    />
                </div>
                <p className="text-xs text-zinc-600 mt-2">
                    Settings UI is under development. Privacy controls are enforced in the backend.
                </p>
            </section>

            {/* Notifications */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Bell size={18} className="text-amber-400" />
                    <h3 className="font-semibold">Notifications</h3>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                    <ToggleSetting
                        icon={<Bell size={18} />}
                        title="Morning Check-ins"
                        description="Receive a morning summary and check-in"
                        enabled={true}
                        disabled
                    />
                    <ToggleSetting
                        icon={<Bell size={18} />}
                        title="Evening Reflections"
                        description="Receive evening summary prompts"
                        enabled={true}
                        disabled
                    />
                    <ToggleSetting
                        icon={<Bell size={18} />}
                        title="Reminder Notifications"
                        description="Receive SMS reminders for scheduled tasks"
                        enabled={true}
                        disabled
                    />
                </div>
            </section>

            {/* Account */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Lock size={18} className="text-emerald-400" />
                    <h3 className="font-semibold">Account</h3>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="font-medium">User ID</div>
                            <div className="text-sm text-zinc-500 font-mono">
                                {localStorage.getItem('agent_user_id')}
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800">
                        <div className="text-xs text-zinc-500">
                            Phone verification and additional account settings are managed via SMS commands.
                        </div>
                    </div>
                </div>
            </section>

            {/* System Info */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <SettingsIcon size={18} className="text-zinc-400" />
                    <h3 className="font-semibold">System</h3>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
                    <InfoRow label="Version" value="0.1.0 (MVP)" />
                    <InfoRow label="Backend" value="http://localhost:3000" />
                    <InfoRow label="Dashboard" value="MVP 8A Complete" />
                </div>
            </section>
        </div>
    );
}

function ToggleSetting({ icon, title, description, enabled, disabled }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                    {icon}
                </div>
                <div>
                    <div className="font-medium text-sm">{title}</div>
                    <div className="text-xs text-zinc-500">{description}</div>
                </div>
            </div>
            <button
                disabled={disabled}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } ${enabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    enabled ? 'left-6' : 'left-1'
                }`} />
            </button>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{label}</span>
            <span className="text-zinc-300 font-mono">{value}</span>
        </div>
    );
}
