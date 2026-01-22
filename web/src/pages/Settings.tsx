import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Shield, Bell, Mic, Eye, Search, Code, Lock, Loader2, Check, AlertCircle, User, Cpu, Key, Clock, Palette } from 'lucide-react';
import { api, type UserSettings } from '../lib/api';

export function Settings() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    const storedId = localStorage.getItem('agent_user_id');
    const userId = (storedId && storedId.length > 10 && storedId !== 'default-user')
        ? storedId
        : '00000000-0000-0000-0000-000000000000';

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

        setSettings(prev => prev ? { ...prev, [key]: value } : prev);

        try {
            await api.updateSettings(userId, { [key]: value });
            setSaveSuccess(settingKey);
            setTimeout(() => setSaveSuccess(null), 1500);
        } catch (err) {
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
                <div className="flex items-center gap-3 text-zinc-500">
                    <div className="w-5 h-5 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
                    Loading settings...
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Profile */}
            <Section
                icon={<User size={18} className="text-violet-400" />}
                title="Profile & Personalization"
            >
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={settings?.username || ''}
                                onChange={(e) => updateSetting('username', e.target.value)}
                                placeholder="How should AI refer to you?"
                                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={settings?.phoneNumber || ''}
                                onChange={(e) => updateSetting('phoneNumber', e.target.value)}
                                placeholder="+1234567890"
                                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800/50">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
                            <Palette size={14} />
                            Accent Color
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="#22d3ee"
                                defaultValue={localStorage.getItem('agent_accent_color') || '#22d3ee'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    localStorage.setItem('agent_accent_color', val);
                                    document.documentElement.style.setProperty('--color-terminal-accent', val);
                                    document.documentElement.style.setProperty('--color-accent', val);
                                }}
                                className="flex-1 px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 font-mono transition-colors"
                            />
                            <div
                                className="w-10 h-10 rounded-xl border border-zinc-700/50 shrink-0"
                                style={{ backgroundColor: 'var(--color-accent)' }}
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Enter a hex code (e.g. #22d3ee). Changes apply instantly.
                        </p>
                    </div>
                </div>
            </Section>

            {/* AI Configuration */}
            <Section
                icon={<Cpu size={18} className="text-pink-400" />}
                title="AI Configuration"
            >
                <div className="p-5 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-3">
                            LLM Provider
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <ProviderButton
                                name="Anthropic"
                                subtitle="Claude 3.5/4.5"
                                selected={settings?.llmProvider === 'anthropic'}
                                onClick={() => updateSetting('llmProvider', 'anthropic')}
                            />
                            <ProviderButton
                                name="OpenAI"
                                subtitle="Coming soon"
                                disabled
                            />
                            <ProviderButton
                                name="Ollama"
                                subtitle="Coming soon"
                                disabled
                            />
                        </div>
                    </div>

                    {settings?.llmProvider === 'anthropic' && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Model Selection
                            </label>
                            <select
                                value={settings.llmModel || 'auto'}
                                onChange={(e) => updateSetting('llmModel', e.target.value)}
                                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 text-zinc-200 transition-colors"
                            >
                                <option value="auto">Smart Router (Auto-Select)</option>
                                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fast)</option>
                                <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Balanced)</option>
                                <option value="claude-opus-4-5-20251101">Claude Opus 4.5 (Powerful)</option>
                            </select>
                            <p className="mt-2 text-xs text-cyan-400/80 flex items-center gap-1.5">
                                <Cpu size={12} />
                                Smart Router analyzes complexity and routes to the best model.
                            </p>
                        </div>
                    )}

                    <div className="border-t border-zinc-800/50 pt-6 space-y-5">
                        <ApiKeyInput
                            userId={userId}
                            provider={settings?.llmProvider || 'anthropic'}
                            label="Anthropic API Key"
                            description="Required for AI chat functionality"
                            isSecret={true}
                        />

                        <div className="border-t border-zinc-800/50 pt-5">
                            <h4 className="text-sm font-medium text-zinc-300 mb-4">Voice & SMS Infrastructure</h4>
                            <div className="space-y-5">
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
                </div>
            </Section>

            {/* Privacy Controls */}
            <Section
                icon={<Shield size={18} className="text-blue-400" />}
                title="Privacy Controls"
            >
                <div className="divide-y divide-zinc-800/50">
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
            </Section>

            {/* Adaptive Schedule */}
            <Section
                icon={<Clock size={18} className="text-cyan-400" />}
                title="Adaptive Schedule"
            >
                <div className="divide-y divide-zinc-800/50">
                    <div className="p-5 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Wake Up Time
                            </label>
                            <input
                                type="time"
                                value={settings?.wakeTime || '09:00'}
                                onChange={(e) => updateSetting('wakeTime', e.target.value)}
                                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Sleep Time
                            </label>
                            <input
                                type="time"
                                value={settings?.sleepTime || '23:00'}
                                onChange={(e) => updateSetting('sleepTime', e.target.value)}
                                className="w-full px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
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
            </Section>

            {/* Notifications */}
            <Section
                icon={<Bell size={18} className="text-amber-400" />}
                title="Notifications"
            >
                <div className="divide-y divide-zinc-800/50">
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
            </Section>

            {/* Account */}
            <Section
                icon={<Lock size={18} className="text-emerald-400" />}
                title="Account"
            >
                <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-zinc-300">User ID</div>
                            <div className="text-xs text-zinc-500 font-mono mt-1">
                                {userId}
                            </div>
                        </div>
                    </div>
                    {settings?.timezone && (
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-zinc-300">Timezone</div>
                                <div className="text-xs text-zinc-500 mt-1">
                                    {settings.timezone}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="pt-4 border-t border-zinc-800/50">
                        <p className="text-xs text-zinc-500">
                            Phone verification and additional account settings are managed via SMS commands.
                        </p>
                    </div>
                </div>
            </Section>

            {/* System Info */}
            <Section
                icon={<SettingsIcon size={18} className="text-zinc-400" />}
                title="System"
            >
                <div className="p-5 space-y-3">
                    <InfoRow label="Version" value="0.1.0 (MVP)" />
                    <InfoRow label="Backend" value="http://localhost:3000" />
                    <InfoRow label="Dashboard" value="v11.0" />
                    {settings?.updatedAt && (
                        <InfoRow
                            label="Last Updated"
                            value={new Date(settings.updatedAt).toLocaleString()}
                        />
                    )}
                </div>
            </Section>
        </div>
    );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h3 className="font-semibold">{title}</h3>
            </div>
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden">
                {children}
            </div>
        </section>
    );
}

function ProviderButton({ name, subtitle, selected = false, disabled = false, onClick }: {
    name: string;
    subtitle: string;
    selected?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`p-3 rounded-xl border transition-all text-left ${
                disabled
                    ? 'bg-zinc-900/30 border-zinc-800/30 text-zinc-600 cursor-not-allowed opacity-50'
                    : selected
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                        : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600 text-zinc-300'
            }`}
        >
            <div className="font-medium text-sm">{name}</div>
            <div className="text-xs opacity-70">{subtitle}</div>
        </button>
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
                <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400">
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
                    } ${enabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
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
            <span className="text-zinc-300 font-mono text-xs">{value}</span>
        </div>
    );
}

function ApiKeyInput({ userId, provider, label, description, isSecret = false }: {
    userId: string;
    provider: string;
    label: string;
    description: string;
    isSecret?: boolean;
}) {
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
            <p className="text-xs text-zinc-500 mb-2">{description}</p>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Key size={14} className="absolute left-3 top-3 text-zinc-500" />
                    <input
                        type={isSecret ? "password" : "text"}
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full pl-9 pr-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || !key}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                    {success && <Check size={14} className="text-emerald-400" />}
                </button>
            </div>
        </div>
    );
}
