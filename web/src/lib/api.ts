/**
 * API Client for Dashboard
 *
 * Provides typed methods for interacting with the backend API
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
    data: T | null;
    error: string | null;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { data: null, error: errorData.error || `HTTP ${response.status}` };
        }

        const data = await response.json();
        return { data, error: null };
    } catch (error) {
        return { data: null, error: (error as Error).message };
    }
}

// ============ Types ============

export interface CalendarEvent {
    id: string;
    userId: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    isAllDay: boolean;
    recurrenceRule?: string;
    location?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Goal {
    id: string;
    userId: string;
    title: string;
    description?: string;
    targetDate?: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    progress: number;
    metrics?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface Reminder {
    id: string;
    userId: string;
    title: string;
    dueAt: string;
    isRecurring: boolean;
    recurrenceRule?: string;
    status: 'PENDING' | 'SENT' | 'DISMISSED';
    deliveryMethod: 'SMS' | 'PUSH' | 'EMAIL';
    createdAt: string;
    updatedAt: string;
}

export interface SleepLog {
    id: string;
    userId: string;
    startTime: string;
    endTime: string;
    quality?: number;
    notes?: string;
    source: string;
    createdAt: string;
}

export interface Workout {
    id: string;
    userId: string;
    activityType: string;
    durationMins: number;
    caloriesBurned?: number;
    notes?: string;
    startedAt: string;
    createdAt: string;
}

export interface UserSettings {
    userId: string;
    webSearchEnabled: boolean;
    scriptExecutionEnabled: boolean;
    screenCaptureEnabled: boolean;
    voiceFeaturesEnabled: boolean;
    morningCheckInsEnabled: boolean;
    eveningReflectionsEnabled: boolean;
    reminderNotificationsEnabled: boolean;
    morningCheckInTime: string;
    eveningCheckInTime: string;
    timezone: string;
    llmProvider: 'anthropic' | 'openai' | 'ollama';
    llmModel?: string;
    username?: string;
    phoneNumber?: string;
    wakeTime: string;
    sleepTime: string;
    useVoiceAlarm: boolean;
    adaptiveTiming: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface OverviewData {
    overview: {
        upcomingEvents: CalendarEvent[];
        pendingReminders: Reminder[];
        activeGoals: Goal[];
        healthStats: {
            avgSleepHours: number | null;
            workoutsThisWeek: number;
            sleepLogsThisWeek: number;
        };
        counts: {
            totalEvents: number;
            totalReminders: number;
            totalGoals: number;
        };
    };
}

export interface HealthSummary {
    summary: {
        avgSleepHours: number;
        totalSleepLogs: number;
        totalWorkouts: number;
        totalWorkoutMinutes: number;
        period: string;
    };
}

export interface AgentInsight {
    id?: string;
    type: 'task_suggestion' | 'reminder_suggestion' | 'pattern_observation' |
          'goal_nudge' | 'forgotten_desire' | 'health_insight' | 'recommendation';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    actionable?: {
        type: 'create_task' | 'create_reminder' | 'create_goal' | 'send_message';
        payload: any;
    };
}

// ============ API Functions ============

export const api = {
    // Health check
    async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
        return fetchApi('/health');
    },

    // Overview
    async getOverview(userId: string): Promise<ApiResponse<OverviewData>> {
        return fetchApi(`/api/dashboard/${userId}/overview`);
    },

    // Calendar
    async getCalendarEvents(userId: string, start?: Date, end?: Date): Promise<ApiResponse<{ events: CalendarEvent[] }>> {
        const params = new URLSearchParams();
        if (start) params.set('start', start.toISOString());
        if (end) params.set('end', end.toISOString());
        return fetchApi(`/api/dashboard/${userId}/calendar?${params}`);
    },

    async createCalendarEvent(userId: string, event: Partial<CalendarEvent>): Promise<ApiResponse<{ event: CalendarEvent }>> {
        return fetchApi(`/api/dashboard/${userId}/calendar`, {
            method: 'POST',
            body: JSON.stringify(event),
        });
    },

    async deleteCalendarEvent(userId: string, eventId: string): Promise<ApiResponse<{ success: boolean }>> {
        return fetchApi(`/api/dashboard/${userId}/calendar/${eventId}`, {
            method: 'DELETE',
        });
    },

    // Goals
    async getGoals(userId: string): Promise<ApiResponse<{ goals: Goal[] }>> {
        return fetchApi(`/api/dashboard/${userId}/goals`);
    },

    async createGoal(userId: string, goal: Partial<Goal>): Promise<ApiResponse<{ goal: Goal }>> {
        return fetchApi(`/api/dashboard/${userId}/goals`, {
            method: 'POST',
            body: JSON.stringify(goal),
        });
    },

    async updateGoalProgress(userId: string, goalId: string, progress: number): Promise<ApiResponse<{ success: boolean }>> {
        return fetchApi(`/api/dashboard/${userId}/goals/${goalId}/progress`, {
            method: 'PATCH',
            body: JSON.stringify({ progress }),
        });
    },

    // Reminders
    async getReminders(userId: string): Promise<ApiResponse<{ reminders: Reminder[] }>> {
        return fetchApi(`/api/dashboard/${userId}/reminders`);
    },

    async createReminder(userId: string, reminder: Partial<Reminder>): Promise<ApiResponse<{ reminder: Reminder }>> {
        return fetchApi(`/api/dashboard/${userId}/reminders`, {
            method: 'POST',
            body: JSON.stringify(reminder),
        });
    },

    // Health
    async getSleepLogs(userId: string, days: number = 7): Promise<ApiResponse<{ sleepLogs: SleepLog[] }>> {
        return fetchApi(`/api/dashboard/${userId}/health/sleep?days=${days}`);
    },

    async logSleep(userId: string, data: Partial<SleepLog>): Promise<ApiResponse<{ sleepLog: SleepLog }>> {
        return fetchApi(`/api/dashboard/${userId}/health/sleep`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async getWorkouts(userId: string, days: number = 7): Promise<ApiResponse<{ workouts: Workout[] }>> {
        return fetchApi(`/api/dashboard/${userId}/health/workouts?days=${days}`);
    },

    async logWorkout(userId: string, data: Partial<Workout>): Promise<ApiResponse<{ workout: Workout }>> {
        return fetchApi(`/api/dashboard/${userId}/health/workouts`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async getHealthSummary(userId: string, days: number = 7): Promise<ApiResponse<HealthSummary>> {
        return fetchApi(`/api/dashboard/${userId}/health/summary?days=${days}`);
    },

    // Settings
    async getSettings(userId: string): Promise<ApiResponse<{ settings: UserSettings }>> {
        return fetchApi(`/api/dashboard/${userId}/settings`);
    },

    async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<ApiResponse<{ settings: UserSettings }>> {
        return fetchApi(`/api/dashboard/${userId}/settings`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    },

    async saveApiKey(userId: string, provider: string, apiKey: string): Promise<ApiResponse<{ success: boolean }>> {
        return fetchApi(`/api/billing/${userId}/keys`, {
            method: 'POST',
            body: JSON.stringify({ provider, apiKey }),
        });
    },

    async getLlmModels(userId: string, provider: string): Promise<ApiResponse<string[]>> {
        return fetchApi(`/api/llm/${userId}/models/${provider}`);
    },

    // Insights (Autonomous Agent)
    async getAgentStatus(): Promise<ApiResponse<{ status: string; nextWakeTime: string | null; nextWakeIn: string | null }>> {
        return fetchApi('/api/insights/status');
    },

    async getInsights(userId: string, limit: number = 10): Promise<ApiResponse<{ insights: AgentInsight[] }>> {
        return fetchApi(`/api/insights/${userId}?limit=${limit}`);
    },

    async triggerThinking(userId: string): Promise<ApiResponse<{ insights: AgentInsight[]; insightsGenerated: number }>> {
        return fetchApi(`/api/insights/${userId}/think`, { method: 'POST' });
    },

    async dismissInsight(userId: string, insightId: string): Promise<ApiResponse<{ success: boolean }>> {
        return fetchApi(`/api/insights/${userId}/dismiss/${insightId}`, { method: 'POST' });
    },

    // Search
    async search(userId: string, query: string): Promise<ApiResponse<SearchResults>> {
        return fetchApi(`/api/dashboard/${userId}/search?q=${encodeURIComponent(query)}`);
    },
};

// Search types
export interface SearchResult {
    type: 'event' | 'goal' | 'reminder';
    id: string;
    title: string;
    description?: string;
    date?: string;
    status?: string;
    relevance: number;
}

export interface SearchResults {
    results: SearchResult[];
    query: string;
    totalCount: number;
}
