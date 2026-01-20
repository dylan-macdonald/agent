import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Shield, Bell, Mic, Eye, Search, Code, Lock, Loader2, Check, AlertCircle, User, Cpu, Key, Clock } from 'lucide-react';
import { api, type UserSettings } from '../lib/api';

export function Settings() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    // Default to a hardcoded UUID for MVP if missing, or use stored.
    // Ideally this comes from AuthContext. For now, we fix the "dyl" crash.
    const storedId = localStorage.getItem('agent_user_id');
    const userId = (storedId && storedId.length > 10 && storedId !== 'default-user')
        ? storedId
        : '00000000-0000-0000-0000-000000000000'; // Fallback UUID

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            setLoading(true);
            setError(null);
            const { data, error: apiError } = await api.getSettings(userId);
            if (apiError) throw new Error(apiError);
            setSettings(data?.settings || null);
        } catch (err) {
            setError('Failed to load settings');
            console.error('Settings load error:', err);
        } finally {
            setLoading(false);
        }
    }

    const updateSetting = useCallback(async (key: keyof UserSettings, value: any) => {
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

            {/* Profile */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <User size={18} className="text-violet-400" />
                    <h3 className="font-semibold">Profile & Personalization</h3>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">
                                Username / Nickname
                            </label>
                            <input
                                type="text"
                                value={settings?.username || ''}
                                onChange={(e) => updateSetting('username', e.target.value)}
                                placeholder="How should AI refer to you?"
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={settings?.phoneNumber || ''}
                                onChange={(e) => updateSetting('phoneNumber', e.target.value)}
                                placeholder="+1234567890"
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                            />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                        <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Terminal Accent Color
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="#00ff9d"
                                defaultValue={localStorage.getItem('agent_accent_color') || '#22d3ee'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    localStorage.setItem('agent_accent_color', val);
                                    document.documentElement.style.setProperty('--color-terminal-accent', val);
                                }}
                                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-mono"
                            />
                            <div className="w-10 h-10 rounded border border-zinc-800 bg-[var(--color-terminal-accent)] shrink-0"></div>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                            Enter a Hex code (e.g. #00ff00) or RGB value. Updates instantly.
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Configuration */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Cpu size={18} className="text-pink-400" />
                    <h3 className="font-semibold">AI Configuration</h3>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-6">
                    {/* Provider Select */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            LLM Provider
                        </label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => updateSetting('llmProvider', 'anthropic')}
                                className={`flex-1 p-3 rounded-lg border transition-all ${settings?.llmProvider === 'anthropic'
                                    ? 'bg-violet-500/10 border-violet-500/50 text-violet-300'
                                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                                    }`}
                            >
                                <div className="font-medium text-sm">Anthropic</div>
                                <div className="text-xs opacity-70">Claude 3.5/4.5</div>
                            </button>
                            <button
                                disabled
                                className="flex-1 p-3 rounded-lg border border-zinc-900 bg-zinc-900/50 text-zinc-600 cursor-not-allowed opacity-50"
                            >
                                <div className="font-medium text-sm">OpenAI</div>
                                <div className="text-xs opacity-50">Disabled</div>
                            </button>
                            <button
                                disabled
                                className="flex-1 p-3 rounded-lg border border-zinc-900 bg-zinc-900/50 text-zinc-600 cursor-not-allowed opacity-50"
                            >
                                <div className="font-medium text-sm">Ollama</div>
                                <div className="text-xs opacity-50">Disabled</div>
                            </button>
                        </div>
                    </div>

                    {/* Model Select */}
                    {settings?.llmProvider === 'anthropic' && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Model Priority
                            </label>
                            <select
                                value={settings.llmModel || 'auto'}
                                onChange={(e) => updateSetting('llmModel', e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-zinc-200"
                            >
                                <option value="auto">✨ Smart Router (Auto-Select)</option>
                                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fast)</option>
                                <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Balanced)</option>
                                <option value="claude-opus-4-5-20251101">Claude Opus 4.5 (Powerful)</option>
                            </select>
                            <div className="mt-2 text-xs text-violet-400 flex items-center gap-1">
                                <Cpu size={12} />
                                Smart Router uses Haiku to analyze complexity, then routes to Sonnet or Opus if needed.
                            </div>
                        </div>
                    )}

                    <div className="border-t border-zinc-800 pt-6 space-y-6">
                        <ApiKeyInput
                            userId={userId}
                            provider={settings?.llmProvider || 'anthropic'}
                            label="Anthropic API Key"
                            description="Required for Smart Router (Haiku/Sonnet/Opus)"
                            isSecret={true}
                        />
                        <div className="border-t border-zinc-800 pt-6 space-y-6">
                            <h4 className="text-sm font-medium text-zinc-300">Voice & SMS Infrastructure</h4>
                            <ApiKeyInput
                                userId={userId}
                                provider="twilio"
                                label="Twilio Account SID"
                                description="Required for SMS and Voice Calls"
                            />
                            <ApiKeyInput
                                userId={userId}
                                provider="twilio_auth_token"
                                label="Twilio Auth Token"
                                description="Required for Twilio authentication"
                                isSecret={true}
                            />
                            <ApiKeyInput
                                userId={userId}
                                provider="elevenlabs"
                                label="ElevenLabs API Key"
                                description="Required for AI Voice (TTS)"
                            />
                        </div>
                    </div>
                </div>
            </section>

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

            {/* Adaptive Schedule */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-cyan-400" />
                    <h3 className="font-semibold">Adaptive Schedule</h3>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
                    <div className="p-5 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">
                                Wake Up Time
                            </label>
                            <input
                                type="time"
                                value={settings?.wakeTime || '09:00'}
                                onChange={(e) => updateSetting('wakeTime', e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">
                                Sleep Time
                            </label>
                            <input
                                type="time"
                                value={settings?.sleepTime || '23:00'}
                                onChange={(e) => updateSetting('sleepTime', e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            />
                        </div>
                    </div>
                    <ToggleSetting
                        icon={<Mic size={18} />}
                        title="Voice Alarm"
                        description="Wake me up with an AI voice call"
                        enabled={settings?.useVoiceAlarm ?? false}
                        saving={saving === 'useVoiceAlarm'}
                        saved={saveSuccess === 'useVoiceAlarm'}
                        onToggle={(v) => updateSetting('useVoiceAlarm', v)}
                    />
                    <ToggleSetting
                        icon={<Cpu size={18} />}
                        title="Adaptive Timing"
                        description="Automatically adjust schedule based on sleep patterns"
                        enabled={settings?.adaptiveTiming ?? false}
                        saving={saving === 'adaptiveTiming'}
                        saved={saveSuccess === 'adaptiveTiming'}
                        onToggle={(v) => updateSetting('adaptiveTiming', v)}
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
                    className={`relative w-11 h-6 rounded-full transition-colors ${saving ? 'cursor-wait opacity-70' : 'cursor-pointer'
                        } ${enabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'left-6' : 'left-1'
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

function ApiKeyInput({ userId, provider, label, description, isSecret = false }: { userId: string, provider: string, label: string, description: string, isSecret?: boolean }) {
    const [key, setKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        if (!key) return;
        setSaving(true);
        try {
            await api.saveApiKey(userId, provider, key);
            setSuccess(true);
            setKey('');
            setTimeout(() => setSuccess(false), 2000);
        } catch (err) {
            console.error('Failed to save key', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
                {label}
            </label>
            <div className="text-xs text-zinc-500 mb-2">{description}</div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Key size={14} className="absolute left-3 top-3 text-zinc-500" />
                    <input
                        type={isSecret ? "password" : "text"}
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || !key}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                    {success && <Check size={14} className="text-emerald-400" />}
                </button>
            </div>
        </div>
    );
}
