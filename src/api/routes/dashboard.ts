/**
 * Dashboard API Routes
 *
 * Provides REST endpoints for the web dashboard to fetch and manage user data
 */

import { Router, Request, Response } from 'express';
import { CalendarService } from '../../services/calendar.js';
import { GoalService } from '../../services/goal.js';
import { ReminderService } from '../../services/reminder.js';
import { SleepService, WorkoutService } from '../../services/health/service.js';
import { SettingsService } from '../../services/settings.js';
import { logger } from '../../utils/logger.js';

export function createDashboardRouter(
    calendarService: CalendarService,
    goalService: GoalService,
    reminderService: ReminderService,
    sleepService: SleepService,
    workoutService: WorkoutService,
    settingsService: SettingsService
): Router {
    const router = Router();

    // ============ Calendar Endpoints ============

    /**
     * GET /api/dashboard/:userId/calendar
     * Get calendar events for a user within a date range
     */
    router.get('/:userId/calendar', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const startDate = req.query.start
                ? new Date(req.query.start as string)
                : new Date();
            const endDate = req.query.end
                ? new Date(req.query.end as string)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 1 week

            const events = await calendarService.getEvents(userId, {
                startDate,
                endDate,
                includeRecurring: true
            });

            res.json({ events });
        } catch (error) {
            logger.error('Failed to get calendar events', { error });
            res.status(500).json({ error: 'Failed to get calendar events' });
        }
    });

    /**
     * POST /api/dashboard/:userId/calendar
     * Create a new calendar event
     */
    router.post('/:userId/calendar', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const { title, description, startTime, endTime, isAllDay, recurrenceRule, location } = req.body;

            const event = await calendarService.createEvent({
                userId,
                title,
                description,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                isAllDay,
                recurrenceRule,
                location
            });

            res.status(201).json({ event });
        } catch (error) {
            logger.error('Failed to create calendar event', { error });
            res.status(500).json({ error: 'Failed to create calendar event' });
        }
    });

    /**
     * DELETE /api/dashboard/:userId/calendar/:eventId
     * Delete a calendar event
     */
    router.delete('/:userId/calendar/:eventId', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const eventId = req.params.eventId as string;
            await calendarService.deleteEvent(userId, eventId);
            res.json({ success: true });
        } catch (error) {
            logger.error('Failed to delete calendar event', { error });
            res.status(500).json({ error: 'Failed to delete calendar event' });
        }
    });

    // ============ Goals Endpoints ============

    /**
     * GET /api/dashboard/:userId/goals
     * Get all goals for a user
     */
    router.get('/:userId/goals', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const goals = await goalService.getGoals(userId);
            res.json({ goals });
        } catch (error) {
            logger.error('Failed to get goals', { error });
            res.status(500).json({ error: 'Failed to get goals' });
        }
    });

    /**
     * POST /api/dashboard/:userId/goals
     * Create a new goal
     */
    router.post('/:userId/goals', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const { title, description, targetDate, metrics } = req.body;

            const goal = await goalService.createGoal({
                userId,
                title,
                description,
                targetDate: targetDate ? new Date(targetDate) : undefined,
                metrics
            });

            res.status(201).json({ goal });
        } catch (error) {
            logger.error('Failed to create goal', { error });
            res.status(500).json({ error: 'Failed to create goal' });
        }
    });

    /**
     * PATCH /api/dashboard/:userId/goals/:goalId/progress
     * Update goal progress
     */
    router.patch('/:userId/goals/:goalId/progress', async (req: Request, res: Response) => {
        try {
            const goalId = req.params.goalId as string;
            const { progress } = req.body;

            await goalService.updateProgress(goalId, progress);
            res.json({ success: true });
        } catch (error) {
            logger.error('Failed to update goal progress', { error });
            res.status(500).json({ error: 'Failed to update goal progress' });
        }
    });

    // ============ Reminders Endpoints ============

    /**
     * GET /api/dashboard/:userId/reminders
     * Get reminders for a user
     */
    router.get('/:userId/reminders', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const reminders = await reminderService.getUserReminders(userId);
            res.json({ reminders });
        } catch (error) {
            logger.error('Failed to get reminders', { error });
            res.status(500).json({ error: 'Failed to get reminders' });
        }
    });

    /**
     * POST /api/dashboard/:userId/reminders
     * Create a new reminder
     */
    router.post('/:userId/reminders', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const { title, dueAt, isRecurring, recurrenceRule, deliveryMethod } = req.body;

            const reminder = await reminderService.createReminder({
                userId,
                title,
                dueAt: new Date(dueAt),
                isRecurring,
                recurrenceRule,
                deliveryMethod
            });

            res.status(201).json({ reminder });
        } catch (error) {
            logger.error('Failed to create reminder', { error });
            res.status(500).json({ error: 'Failed to create reminder' });
        }
    });

    // ============ Health Endpoints ============

    /**
     * GET /api/dashboard/:userId/health/sleep
     * Get sleep logs for a user
     */
    router.get('/:userId/health/sleep', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const days = parseInt(req.query.days as string) || 7;
            const sleepLogs = await sleepService.getSleepLogs(userId, days);
            res.json({ sleepLogs });
        } catch (error) {
            logger.error('Failed to get sleep logs', { error });
            res.status(500).json({ error: 'Failed to get sleep logs' });
        }
    });

    /**
     * POST /api/dashboard/:userId/health/sleep
     * Log sleep
     */
    router.post('/:userId/health/sleep', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const { startTime, endTime, quality, notes } = req.body;

            const sleepLog = await sleepService.logSleep({
                userId,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                quality,
                notes,
                source: 'WEB'
            });

            res.status(201).json({ sleepLog });
        } catch (error) {
            logger.error('Failed to log sleep', { error });
            res.status(500).json({ error: 'Failed to log sleep' });
        }
    });

    /**
     * GET /api/dashboard/:userId/health/workouts
     * Get workouts for a user
     */
    router.get('/:userId/health/workouts', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const days = parseInt(req.query.days as string) || 7;
            const workouts = await workoutService.getWorkouts(userId, days);
            res.json({ workouts });
        } catch (error) {
            logger.error('Failed to get workouts', { error });
            res.status(500).json({ error: 'Failed to get workouts' });
        }
    });

    /**
     * POST /api/dashboard/:userId/health/workouts
     * Log a workout
     */
    router.post('/:userId/health/workouts', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const { activityType, durationMins, caloriesBurned, notes, startedAt } = req.body;

            const workout = await workoutService.logWorkout({
                userId,
                activityType,
                durationMins,
                caloriesBurned,
                notes,
                startedAt: startedAt ? new Date(startedAt) : undefined
            });

            res.status(201).json({ workout });
        } catch (error) {
            logger.error('Failed to log workout', { error });
            res.status(500).json({ error: 'Failed to log workout' });
        }
    });

    /**
     * GET /api/dashboard/:userId/health/summary
     * Get health summary for a user
     */
    router.get('/:userId/health/summary', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const days = parseInt(req.query.days as string) || 7;

            const [sleepLogs, workouts] = await Promise.all([
                sleepService.getSleepLogs(userId, days),
                workoutService.getWorkouts(userId, days)
            ]);

            // Calculate averages
            const avgSleep = sleepLogs.length > 0
                ? sleepLogs.reduce((sum, log) => {
                    const hours = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60 * 60);
                    return sum + hours;
                }, 0) / sleepLogs.length
                : 0;

            const totalWorkoutMins = workouts.reduce((sum, w) => sum + w.durationMins, 0);

            res.json({
                summary: {
                    avgSleepHours: Math.round(avgSleep * 10) / 10,
                    totalSleepLogs: sleepLogs.length,
                    totalWorkouts: workouts.length,
                    totalWorkoutMinutes: totalWorkoutMins,
                    period: `${days} days`
                }
            });
        } catch (error) {
            logger.error('Failed to get health summary', { error });
            res.status(500).json({ error: 'Failed to get health summary' });
        }
    });

    // ============ Settings Endpoints ============

    /**
     * GET /api/dashboard/:userId/settings
     * Get user settings
     */
    router.get('/:userId/settings', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const settings = await settingsService.getSettings(userId);
            res.json({ settings });
        } catch (error) {
            logger.error('Failed to get settings', { error });
            res.status(500).json({ error: 'Failed to get settings' });
        }
    });

    /**
     * PATCH /api/dashboard/:userId/settings
     * Update user settings
     */
    router.patch('/:userId/settings', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const updates = req.body;

            const settings = await settingsService.updateSettings(userId, updates);
            res.json({ settings });
        } catch (error) {
            logger.error('Failed to update settings', { error });
            res.status(500).json({ error: 'Failed to update settings' });
        }
    });

    // ============ Overview Endpoint ============

    /**
     * GET /api/dashboard/:userId/overview
     * Get combined overview data for dashboard home
     */
    router.get('/:userId/overview', async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId as string;
            const today = new Date();
            const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

            const [events, goals, reminders, sleepLogs, workouts] = await Promise.all([
                calendarService.getEvents(userId, { startDate: today, endDate: weekAhead }),
                goalService.getGoals(userId),
                reminderService.getUserReminders(userId),
                sleepService.getSleepLogs(userId, 7),
                workoutService.getWorkouts(userId, 7)
            ]);

            // Filter upcoming events (today and tomorrow)
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            const upcomingEvents = events.filter(e => new Date(e.startTime) <= tomorrow);

            // Filter pending reminders
            const pendingReminders = reminders.filter(r => r.status === 'PENDING');

            // Active goals
            const activeGoals = goals.filter(g => g.status === 'IN_PROGRESS');

            // Health summary
            const avgSleep = sleepLogs.length > 0
                ? sleepLogs.reduce((sum, log) => {
                    const hours = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60 * 60);
                    return sum + hours;
                }, 0) / sleepLogs.length
                : null;

            res.json({
                overview: {
                    upcomingEvents: upcomingEvents.slice(0, 5),
                    pendingReminders: pendingReminders.slice(0, 5),
                    activeGoals: activeGoals.slice(0, 5),
                    healthStats: {
                        avgSleepHours: avgSleep ? Math.round(avgSleep * 10) / 10 : null,
                        workoutsThisWeek: workouts.length,
                        sleepLogsThisWeek: sleepLogs.length
                    },
                    counts: {
                        totalEvents: events.length,
                        totalReminders: pendingReminders.length,
                        totalGoals: activeGoals.length
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to get overview', { error });
            res.status(500).json({ error: 'Failed to get overview' });
        }
    });

    return router;
}
