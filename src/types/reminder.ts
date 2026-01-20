export enum ReminderStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED', // Failed to deliver
    COMPLETED = 'COMPLETED', // Recurring instance done
    CANCELLED = 'CANCELLED',
    SNOOZED = 'SNOOZED'
}

export enum DeliveryMethod {
    SMS = 'SMS',
    VOICE = 'VOICE',
    BOTH = 'BOTH'
}

export interface Reminder {
    id: string;
    userId: string;
    title: string;
    dueAt: Date;
    isRecurring: boolean;
    recurrenceRule?: string;
    status: ReminderStatus;
    deliveryMethod: DeliveryMethod;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateReminderDTO {
    userId: string;
    title: string;
    dueAt: Date;
    isRecurring?: boolean;
    recurrenceRule?: string;
    deliveryMethod?: DeliveryMethod;
}

export interface UpdateReminderDTO {
    title?: string;
    dueAt?: Date;
    status?: ReminderStatus;
    isRecurring?: boolean;
    recurrenceRule?: string;
    deliveryMethod?: DeliveryMethod;
}
