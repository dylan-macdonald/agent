export interface CalendarEvent {
    id: string;
    userId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    isAllDay: boolean;
    recurrenceRule?: string; // RFC 5545 RRULE string
    location?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateEventDTO {
    userId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    isAllDay?: boolean;
    recurrenceRule?: string;
    location?: string;
}

export interface UpdateEventDTO {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
    isAllDay?: boolean;
    recurrenceRule?: string;
    location?: string;
}

export interface EventQueryOptions {
    startDate: Date;
    endDate: Date;
    includeRecurring?: boolean; // If true, expands occurrences
}
