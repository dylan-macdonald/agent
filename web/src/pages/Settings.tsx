import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Shield, Bell, Mic, Eye, Search, Code, Lock, Loader2, Check, AlertCircle } from 'lucide-react';
import { api, type UserSettings } from '../lib/api';

export function Settings() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    const userId = localStorage.getItem('agent_user_id') || 'default-user';

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            setLoading(true);
            setError(null);
            const data = await api.getSettings(userId);
            setSettings(data);
        } catch (err) {
            setError('Failed to load settings');
            console.error('Settings load error:', err);
        } finally {
            setLoading(false);
        }
    }

    const updateSetting = useCallback(async (key: keyof UserSettings, value: boolean) => {
        if (!settings) return;

        const settingKey = key as string;
        setSaving(settingKey);
        setError(null);

        // Optimistic update
        setSettings(prev => prev ? { ...prev, [key]: value } : prev);

        try {
            await api.updateSettings(userId, { [key]: value });
            setSaveSuccess(settingKey);
            setTimeout(() => setSaveSuccess(null), 1500);
        } catch (err) {
            // Revert on error
            setSettings(prev => prev ? { ...prev, [key]: !value } : prev);
            setError(`Failed to update ${key}`);
            console.error('Settings update error:', err);
        } finally {
            setSaving(null);
        }
    }, [settings, userId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-zinc-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

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
                        enabled={settings?.webSearchEnabled ?? true}
                        saving={saving === 'webSearchEnabled'}
                        saved={saveSuccess === 'webSearchEnabled'}
                        onToggle={(v) => updateSetting('webSearchEnabled', v)}
                    />
                    <ToggleSetting
                        icon={<Code size={18} />}
                        title="Script Execution"
                        description="Allow running scripts (requires approval)"
                        enabled={settings?.scriptExecutionEnabled ?? false}
                        saving={saving === 'scriptExecutionEnabled'}
                        saved={saveSuccess === 'scriptExecutionEnabled'}
                        onToggle={(v) => updateSetting('scriptExecutionEnabled', v)}
                    />
                    <ToggleSetting
                        icon={<Eye size={18} />}
                        title="Screen Capture"
                        description="Allow assistant to view your screen (requires approval)"
                        enabled={settings?.screenCaptureEnabled ?? false}
                        saving={saving === 'screenCaptureEnabled'}
                        saved={saveSuccess === 'screenCaptureEnabled'}
                        onToggle={(v) => updateSetting('screenCaptureEnabled', v)}
                    />
                    <ToggleSetting
                        icon={<Mic size={18} />}
                        title="Voice Features"
                        description="Enable wake word detection and voice interaction"
                        enabled={settings?.voiceFeaturesEnabled ?? true}
                        saving={saving === 'voiceFeaturesEnabled'}
                        saved={saveSuccess === 'voiceFeaturesEnabled'}
                        onToggle={(v) => updateSetting('voiceFeaturesEnabled', v)}
                    />
                </div>
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
                        enabled={settings?.morningCheckInsEnabled ?? true}
                        saving={saving === 'morningCheckInsEnabled'}
                        saved={saveSuccess === 'morningCheckInsEnabled'}
                        onToggle={(v) => updateSetting('morningCheckInsEnabled', v)}
                    />
                    <ToggleSetting
                        icon={<Bell size={18} />}
                        title="Evening Reflections"
                        description="Receive evening summary prompts"
                        enabled={settings?.eveningReflectionsEnabled ?? true}
                        saving={saving === 'eveningReflectionsEnabled'}
                        saved={saveSuccess === 'eveningReflectionsEnabled'}
                        onToggle={(v) => updateSetting('eveningReflectionsEnabled', v)}
                    />
                    <ToggleSetting
                        icon={<Bell size={18} />}
                        title="Reminder Notifications"
                        description="Receive SMS reminders for scheduled tasks"
                        enabled={settings?.reminderNotificationsEnabled ?? true}
                        saving={saving === 'reminderNotificationsEnabled'}
                        saved={saveSuccess === 'reminderNotificationsEnabled'}
                        onToggle={(v) => updateSetting('reminderNotificationsEnabled', v)}
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
                                {userId}
                            </div>
                        </div>
                    </div>
                    {settings?.timezone && (
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="font-medium">Timezone</div>
                                <div className="text-sm text-zinc-500">
                                    {settings.timezone}
                                </div>
                            </div>
                        </div>
                    )}
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
                    {settings?.updatedAt && (
                        <InfoRow
                            label="Last Updated"
                            value={new Date(settings.updatedAt).toLocaleString()}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}

function ToggleSetting({ icon, title, description, enabled, saving, saved, onToggle }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    saving?: boolean;
    saved?: boolean;
    onToggle: (value: boolean) => void;
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
            <div className="flex items-center gap-2">
                {saving && (
                    <Loader2 size={14} className="animate-spin text-zinc-500" />
                )}
                {saved && (
                    <Check size={14} className="text-emerald-400" />
                )}
                <button
                    onClick={() => onToggle(!enabled)}
                    disabled={saving}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                        saving ? 'cursor-wait opacity-70' : 'cursor-pointer'
                    } ${enabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        enabled ? 'left-6' : 'left-1'
                    }`} />
                </button>
            </div>
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
