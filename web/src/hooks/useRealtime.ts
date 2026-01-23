/**
 * Real-time updates hook for dashboard
 *
 * Provides easy integration with Socket.io for live data updates
 */

import { useEffect, useCallback, useState } from 'react';
import { socketClient, DashboardUpdate, CheckInEvent, SystemEvent } from '../lib/socket';

interface UseRealtimeOptions {
    onGoalUpdate?: (update: DashboardUpdate) => void;
    onCalendarUpdate?: (update: DashboardUpdate) => void;
    onReminderUpdate?: (update: DashboardUpdate) => void;
    onHealthUpdate?: (update: DashboardUpdate) => void;
    onCheckIn?: (event: CheckInEvent) => void;
    onSystemEvent?: (event: SystemEvent) => void;
}

export function useRealtime(userId: string | null, options: UseRealtimeOptions = {}) {
    const [connected, setConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    useEffect(() => {
        if (!userId) return;

        // Connect to socket
        socketClient.connect(userId);

        // Connection status handler
        const unsubConnection = socketClient.onConnection((isConnected) => {
            setConnected(isConnected);
        });

        // Set up event handlers
        const unsubscribers: (() => void)[] = [unsubConnection];

        if (options.onGoalUpdate) {
            unsubscribers.push(socketClient.onGoalUpdate((update) => {
                setLastUpdate(new Date());
                options.onGoalUpdate?.(update);
            }));
        }

        if (options.onCalendarUpdate) {
            unsubscribers.push(socketClient.onCalendarUpdate((update) => {
                setLastUpdate(new Date());
                options.onCalendarUpdate?.(update);
            }));
        }

        if (options.onReminderUpdate) {
            unsubscribers.push(socketClient.onReminderUpdate((update) => {
                setLastUpdate(new Date());
                options.onReminderUpdate?.(update);
            }));
        }

        if (options.onHealthUpdate) {
            unsubscribers.push(socketClient.onHealthUpdate((update) => {
                setLastUpdate(new Date());
                options.onHealthUpdate?.(update);
            }));
        }

        if (options.onCheckIn) {
            unsubscribers.push(socketClient.onCheckIn((event) => {
                setLastUpdate(new Date());
                options.onCheckIn?.(event);
            }));
        }

        if (options.onSystemEvent) {
            unsubscribers.push(socketClient.onSystemEvent((event) => {
                setLastUpdate(new Date());
                options.onSystemEvent?.(event);
            }));
        }

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [userId, options.onGoalUpdate, options.onCalendarUpdate, options.onReminderUpdate,
        options.onHealthUpdate, options.onCheckIn, options.onSystemEvent]);

    return { connected, lastUpdate };
}

/**
 * Hook for auto-refreshing data on real-time updates
 */
export function useRealtimeRefresh(userId: string | null, refreshFn: () => void | Promise<void>) {
    const handleUpdate = useCallback(() => {
        refreshFn();
    }, [refreshFn]);

    return useRealtime(userId, {
        onGoalUpdate: handleUpdate,
        onCalendarUpdate: handleUpdate,
        onReminderUpdate: handleUpdate,
        onHealthUpdate: handleUpdate,
    });
}

/**
 * Hook for check-in notifications
 */
export function useCheckInNotifications(userId: string | null) {
    const [notification, setNotification] = useState<CheckInEvent | null>(null);

    useRealtime(userId, {
        onCheckIn: (event) => {
            setNotification(event);
            // Auto-clear after 10 seconds
            setTimeout(() => setNotification(null), 10000);
        }
    });

    const dismiss = useCallback(() => setNotification(null), []);

    return { notification, dismiss };
}
