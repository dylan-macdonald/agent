import { Pool } from "pg";
import rrule from "rrule";
// @ts-ignore
const { RRule } = rrule;
import { v4 as uuidv4 } from "uuid";

import {
    CalendarEvent,
    CreateEventDTO,
    EventQueryOptions,
    UpdateEventDTO,
} from "../types/calendar.js";
import { logger } from "../utils/logger.js";

export class CalendarService {
    constructor(private db: Pool) { }

    /**
     * Create a new event
     */
    public async createEvent(data: CreateEventDTO): Promise<CalendarEvent> {
        const {
            userId,
            title,
            description,
            startTime,
            endTime,
            isAllDay,
            recurrenceRule,
            location,
        } = data;

        const query = `
      INSERT INTO events (
        id, user_id, title, description, start_time, end_time, is_all_day, recurrence_rule, location
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const values = [
            uuidv4(),
            userId,
            title,
            description || null,
            startTime,
            endTime,
            isAllDay || false,
            recurrenceRule || null,
            location || null,
        ];

        try {
            const result = await this.db.query(query, values);
            return this.mapRowToEvent(result.rows[0]);
        } catch (error) {
            logger.error("Failed to create event", { error, userId, title });
            throw new Error("Failed to create event");
        }
    }

    /**
     * Get events within a time range, expanding recurring events
     */
    public async getEvents(
        userId: string,
        options: EventQueryOptions
    ): Promise<CalendarEvent[]> {
        const { startDate, endDate, includeRecurring = true } = options;

        // 1. Fetch non-recurring events in range
        const singleEventsQuery = `
      SELECT * FROM events
      WHERE user_id = $1
      AND recurrence_rule IS NULL
      AND (
        (start_time >= $2 AND start_time <= $3) OR
        (end_time >= $2 AND end_time <= $3) OR
        (start_time <= $2 AND end_time >= $3)
      )
      ORDER BY start_time ASC
    `;

        // 2. Fetch all recurring events (we need to check them all to generate occurrences)
        const recurringEventsQuery = `
      SELECT * FROM events
      WHERE user_id = $1
      AND recurrence_rule IS NOT NULL
    `;

        try {
            const [singleRes, recurringRes] = await Promise.all([
                this.db.query(singleEventsQuery, [userId, startDate, endDate]),
                this.db.query(recurringEventsQuery, [userId]),
            ]);

            const events = singleRes.rows.map(this.mapRowToEvent);

            if (includeRecurring) {
                const recurringEvents = recurringRes.rows.map(this.mapRowToEvent);

                for (const event of recurringEvents) {
                    if (!event.recurrenceRule) {continue;}

                    try {
                        // Create RRule set from string
                        // Adjust start time to event duration
                        const duration = event.endTime.getTime() - event.startTime.getTime();

                        // rrule.js handles dates in UTC usually, need to be careful with timezones
                        // For MVP, assuming UTC storage and comparison
                        const rule = RRule.fromString(event.recurrenceRule);
                        // dtstart needs to be handled carefully with RRule.fromString if implied or explicit
                        // For MVP, we'll assume the string contains necessary info or we set it
                        rule.options.dtstart = event.startTime;

                        const occurrences = rule.between(startDate, endDate, true);

                        for (const date of occurrences) {
                            events.push({
                                ...event,
                                id: `${event.id}_${date.getTime()}`, // Virtual ID for occurrence
                                startTime: date,
                                endTime: new Date(date.getTime() + duration),
                                // Keep original ID reference if needed, or flag as occurrence
                            });
                        }
                    } catch (err) {
                        logger.warn("Failed to parse recurrence rule", {
                            error: err,
                            eventId: event.id,
                            rule: event.recurrenceRule,
                        });
                    }
                }
            }

            // Sort by start time
            return events.sort((a: CalendarEvent, b: CalendarEvent) => a.startTime.getTime() - b.startTime.getTime());
        } catch (error) {
            logger.error("Failed to get events", { error, userId });
            throw new Error("Failed to get events");
        }
    }

    /**
     * Update an event
     */
    public async updateEvent(
        userId: string,
        eventId: string,
        updates: UpdateEventDTO
    ): Promise<CalendarEvent> {
        // Basic update for MVP - doesn't handle updating specific occurrence exceptions yet

        // Build dynamic update query
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (updates.title !== undefined) { fields.push(`title = $${idx++}`); values.push(updates.title); }
        if (updates.description !== undefined) { fields.push(`description = $${idx++}`); values.push(updates.description); }
        if (updates.startTime !== undefined) { fields.push(`start_time = $${idx++}`); values.push(updates.startTime); }
        if (updates.endTime !== undefined) { fields.push(`end_time = $${idx++}`); values.push(updates.endTime); }
        if (updates.isAllDay !== undefined) { fields.push(`is_all_day = $${idx++}`); values.push(updates.isAllDay); }
        if (updates.recurrenceRule !== undefined) { fields.push(`recurrence_rule = $${idx++}`); values.push(updates.recurrenceRule); }
        if (updates.location !== undefined) { fields.push(`location = $${idx++}`); values.push(updates.location); }

        fields.push(`updated_at = NOW()`);

        if (fields.length === 1) { // Only updated_at
            throw new Error("No updates provided");
        }

        values.push(eventId);
        values.push(userId);

        const query = `
          UPDATE events
          SET ${fields.join(", ")}
          WHERE id = $${idx++} AND user_id = $${idx++}
          RETURNING *
      `;

        try {
            const result = await this.db.query(query, values);
            if (result.rowCount === 0) {
                throw new Error("Event not found or access denied");
            }
            return this.mapRowToEvent(result.rows[0]);
        } catch (error: any) {
            logger.error("Failed to update event", { error, eventId, userId });
            throw error;
        }
    }

    /**
     * Delete an event
     */
    public async deleteEvent(userId: string, eventId: string): Promise<void> {
        const query = `DELETE FROM events WHERE id = $1 AND user_id = $2`;
        try {
            const result = await this.db.query(query, [eventId, userId]);
            if (result.rowCount === 0) {
                throw new Error("Event not found or access denied");
            }
        } catch (error) {
            logger.error("Failed to delete event", { error, eventId, userId });
            throw new Error("Failed to delete event");
        }
    }

    private mapRowToEvent(row: any): CalendarEvent {
        // pg driver returns Date objects for timestamps
        return {
            id: row.id,
            userId: row.user_id,
            title: row.title,
            description: row.description || undefined,
            startTime: row.start_time,
            endTime: row.end_time,
            isAllDay: row.is_all_day,
            recurrenceRule: row.recurrence_rule || undefined,
            location: row.location || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
