import { useState, useEffect } from 'react';
import {
    CreditCard,
    Key,
    Eye,
    EyeOff,
    ExternalLink,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Loader2,
    TrendingUp,
    DollarSign,
    Zap,
    MessageSquare,
    Mic,
    Brain,
    Plus,
    Save,
    Trash2
} from 'lucide-react';
import { BarChart, ProgressRing } from '../components/Chart';

interface ProviderConfig {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    docsUrl: string;
    consoleUrl: string;
    keyPrefix?: string;
    features: string[];
}

interface ApiKeyData {
    provider: string;
    isConfigured: boolean;
    maskedKey?: string;
    lastUpdated?: string;
}

interface ProviderBalance {
    provider: string;
    balance?: number;
    used?: number;
    limit?: number;
    unit: string;
    lastChecked?: string;
    error?: string;
}

interface UsageData {
    provider: string;
    totalCost: number;
    entryCount: number;
}

interface DailyUsage {
    date: string;
    cost: number;
}

const PROVIDERS: ProviderConfig[] = [
    {
        id: 'anthropic',
        name: 'Anthropic',
        icon: <Brain size={20} />,
        color: '#D4A574',
        description: 'Claude AI for intelligent conversations and assistance',
        docsUrl: 'https://docs.anthropic.com',
        consoleUrl: 'https://console.anthropic.com/settings/keys',
        keyPrefix: 'sk-ant-',
        features: ['Chat AI', 'Task Planning', 'Code Help']
    },
    {
        id: 'openai',
        name: 'OpenAI',
        icon: <Zap size={20} />,
        color: '#10A37F',
        description: 'GPT-4 and Whisper for speech recognition',
        docsUrl: 'https://platform.openai.com/docs',
        consoleUrl: 'https://platform.openai.com/api-keys',
        keyPrefix: 'sk-',
        features: ['Speech-to-Text', 'Alternative AI']
    },
    {
        id: 'twilio',
        name: 'Twilio',
        icon: <MessageSquare size={20} />,
        color: '#F22F46',
        description: 'SMS messaging for reminders and notifications',
        docsUrl: 'https://www.twilio.com/docs',
        consoleUrl: 'https://console.twilio.com',
        keyPrefix: 'AC',
        features: ['SMS Reminders', 'Notifications']
    },
    {
        id: 'elevenlabs',
        name: 'ElevenLabs',
        icon: <Mic size={20} />,
        color: '#5D5FEF',
        description: 'Realistic AI voice synthesis',
        docsUrl: 'https://elevenlabs.io/docs',
        consoleUrl: 'https://elevenlabs.io/speech-synthesis',
        features: ['Text-to-Speech', 'Voice Responses']
    }
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function Billing() {
    const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyData>>({});
    const [balances, setBalances] = useState<Record<string, ProviderBalance>>({});
    const [usage, setUsage] = useState<UsageData[]>([]);
    const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState<string | null>(null);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const userId = localStorage.getItem('agent_user_id') || 'default-user';

    useEffect(() => {
        loadAllData();
    }, []);

    async function loadAllData() {
        setLoading(true);
        try {
            await Promise.all([
                loadApiKeys(),
                loadBalances(),
                loadUsage()
            ]);
        } catch (err) {
            setError('Failed to load billing data');
        } finally {
            setLoading(false);
        }
    }

    async function loadApiKeys() {
        try {
            const res = await fetch(`${API_BASE}/api/billing/${userId}/keys`);
            if (res.ok) {
                const data = await res.json();
                const keysMap: Record<string, ApiKeyData> = {};
                (data.keys || []).forEach((k: ApiKeyData) => {
                    keysMap[k.provider] = k;
                });
                setApiKeys(keysMap);
            }
        } catch (err) {
            console.error('Failed to load API keys:', err);
        }
    }

    async function loadBalances() {
        try {
            const res = await fetch(`${API_BASE}/api/billing/${userId}/balances`);
            if (res.ok) {
                const data = await res.json();
                const balancesMap: Record<string, ProviderBalance> = {};
                (data.balances || []).forEach((b: ProviderBalance) => {
                    balancesMap[b.provider] = b;
                });
                setBalances(balancesMap);
            }
        } catch (err) {
            console.error('Failed to load balances:', err);
        }
    }

    async function loadUsage() {
        try {
            const res = await fetch(`${API_BASE}/api/cost/summary?days=30`);
            if (res.ok) {
                const data = await res.json();
                setUsage(data.byProvider || []);
            }

            // Load daily usage for chart
            const dailyRes = await fetch(`${API_BASE}/api/cost/daily?days=7`);
            if (dailyRes.ok) {
                const dailyData = await dailyRes.json();
                setDailyUsage(dailyData.daily || []);
            }
        } catch (err) {
            console.error('Failed to load usage:', err);
        }
    }

    async function saveApiKey(providerId: string) {
        const keyValue = keyInputs[providerId];
        if (!keyValue?.trim()) return;

        setSaving(providerId);
        try {
            const res = await fetch(`${API_BASE}/api/billing/${userId}/keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: providerId, apiKey: keyValue })
            });

            if (res.ok) {
                await loadApiKeys();
                await refreshBalance(providerId);
                setEditingKey(null);
                setKeyInputs(prev => ({ ...prev, [providerId]: '' }));
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to save API key');
            }
        } catch (err) {
            setError('Failed to save API key');
        } finally {
            setSaving(null);
        }
    }

    async function deleteApiKey(providerId: string) {
        if (!confirm(`Remove ${PROVIDERS.find(p => p.id === providerId)?.name} API key?`)) return;

        setSaving(providerId);
        try {
            const res = await fetch(`${API_BASE}/api/billing/${userId}/keys/${providerId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await loadApiKeys();
                setBalances(prev => {
                    const next = { ...prev };
                    delete next[providerId];
                    return next;
                });
            }
        } catch (err) {
            setError('Failed to remove API key');
        } finally {
            setSaving(null);
        }
    }

    async function refreshBalance(providerId: string) {
        setRefreshing(providerId);
        try {
            const res = await fetch(`${API_BASE}/api/billing/${userId}/balances/${providerId}/refresh`, {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                setBalances(prev => ({ ...prev, [providerId]: data.balance }));
            }
        } catch (err) {
            console.error('Failed to refresh balance:', err);
        } finally {
            setRefreshing(null);
        }
    }

    const totalSpent = usage.reduce((sum, u) => sum + u.totalCost, 0);
    const chartData = dailyUsage.map(d => ({
        label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        value: d.cost
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-zinc-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertTriangle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        &times;
                    </button>
                </div>
            )}

            {/* Usage Overview */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <DollarSign size={20} className="text-emerald-400" />
                        </div>
                        <div className="text-sm text-zinc-500">30-Day Spend</div>
                    </div>
                    <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
                </div>

                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <TrendingUp size={20} className="text-blue-400" />
                        </div>
                        <div className="text-sm text-zinc-500">API Calls</div>
                    </div>
                    <div className="text-2xl font-bold">
                        {usage.reduce((sum, u) => sum + u.entryCount, 0).toLocaleString()}
                    </div>
                </div>

                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Key size={20} className="text-purple-400" />
                        </div>
                        <div className="text-sm text-zinc-500">Active Providers</div>
                    </div>
                    <div className="text-2xl font-bold">
                        {Object.values(apiKeys).filter(k => k.isConfigured).length} / {PROVIDERS.length}
                    </div>
                </div>
            </section>

            {/* Usage Chart */}
            {chartData.length > 0 && (
                <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                    <h3 className="font-semibold mb-4">Daily Spend (Last 7 Days)</h3>
                    <BarChart data={chartData} height={120} color="#3b82f6" />
                </section>
            )}

            {/* API Providers */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard size={18} className="text-blue-400" />
                    <h3 className="font-semibold">API Providers</h3>
                </div>

                <div className="space-y-4">
                    {PROVIDERS.map(provider => {
                        const keyData = apiKeys[provider.id];
                        const balance = balances[provider.id];
                        const isConfigured = keyData?.isConfigured;
                        const isEditing = editingKey === provider.id;

                        return (
                            <div
                                key={provider.id}
                                className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="p-2 rounded-lg"
                                            style={{ backgroundColor: `${provider.color}20` }}
                                        >
                                            <div style={{ color: provider.color }}>{provider.icon}</div>
                                        </div>
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {provider.name}
                                                {isConfigured ? (
                                                    <CheckCircle size={14} className="text-emerald-400" />
                                                ) : (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                                                        Not configured
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-zinc-500">{provider.description}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={provider.consoleUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                                            title="Open provider console"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-4">
                                    {/* Features */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {provider.features.map(feature => (
                                            <span
                                                key={feature}
                                                className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400"
                                            >
                                                {feature}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Balance Display */}
                                    {isConfigured && balance && !balance.error && (
                                        <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-zinc-800/50">
                                            {balance.limit ? (
                                                <>
                                                    <ProgressRing
                                                        value={balance.used || 0}
                                                        max={balance.limit}
                                                        size={50}
                                                        strokeWidth={5}
                                                        color={provider.color}
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium">
                                                            {balance.used?.toLocaleString()} / {balance.limit?.toLocaleString()} {balance.unit}
                                                        </div>
                                                        <div className="text-xs text-zinc-500">
                                                            {balance.lastChecked && `Updated ${new Date(balance.lastChecked).toLocaleTimeString()}`}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : balance.balance !== undefined ? (
                                                <div>
                                                    <div className="text-lg font-bold" style={{ color: provider.color }}>
                                                        ${balance.balance.toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-zinc-500">Available credit</div>
                                                </div>
                                            ) : null}

                                            <button
                                                onClick={() => refreshBalance(provider.id)}
                                                disabled={refreshing === provider.id}
                                                className="ml-auto p-2 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-white transition-colors"
                                            >
                                                <RefreshCw
                                                    size={16}
                                                    className={refreshing === provider.id ? 'animate-spin' : ''}
                                                />
                                            </button>
                                        </div>
                                    )}

                                    {balance?.error && (
                                        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                                            <AlertTriangle size={14} className="inline mr-2" />
                                            {balance.error}
                                        </div>
                                    )}

                                    {/* API Key Input */}
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <input
                                                    type={showKey[provider.id] ? 'text' : 'password'}
                                                    value={keyInputs[provider.id] || ''}
                                                    onChange={e => setKeyInputs(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                                    placeholder={`Enter ${provider.name} API key${provider.keyPrefix ? ` (${provider.keyPrefix}...)` : ''}`}
                                                    className="w-full px-3 py-2 pr-10 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-blue-500 focus:outline-none text-sm font-mono"
                                                />
                                                <button
                                                    onClick={() => setShowKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
                                                >
                                                    {showKey[provider.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => saveApiKey(provider.id)}
                                                    disabled={saving === provider.id || !keyInputs[provider.id]?.trim()}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                                                >
                                                    {saving === provider.id ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Save size={14} />
                                                    )}
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingKey(null);
                                                        setKeyInputs(prev => ({ ...prev, [provider.id]: '' }));
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                            <a
                                                href={provider.consoleUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                            >
                                                Get your API key <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            {isConfigured ? (
                                                <>
                                                    <div className="font-mono text-sm text-zinc-500">
                                                        {keyData.maskedKey}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingKey(provider.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors"
                                                        >
                                                            <Key size={14} />
                                                            Update
                                                        </button>
                                                        <button
                                                            onClick={() => deleteApiKey(provider.id)}
                                                            disabled={saving === provider.id}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingKey(provider.id)}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium transition-colors"
                                                >
                                                    <Plus size={14} />
                                                    Add API Key
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Usage for this provider */}
                                {isConfigured && (
                                    <div className="px-4 py-3 bg-zinc-800/30 border-t border-zinc-800 flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">30-day usage</span>
                                        <span className="font-medium">
                                            ${(usage.find(u => u.provider === provider.id)?.totalCost || 0).toFixed(2)}
                                            <span className="text-zinc-500 font-normal ml-2">
                                                ({usage.find(u => u.provider === provider.id)?.entryCount || 0} calls)
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Quick Links */}
            <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                <h3 className="font-semibold mb-4">Quick Links</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PROVIDERS.map(provider => (
                        <a
                            key={provider.id}
                            href={provider.consoleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            <div style={{ color: provider.color }}>{provider.icon}</div>
                            <span className="text-sm">{provider.name}</span>
                            <ExternalLink size={12} className="ml-auto text-zinc-500" />
                        </a>
                    ))}
                </div>
            </section>
        </div>
    );
}
