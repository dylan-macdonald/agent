/**
 * Core type definitions for AI Personal Assistant
 */

// =============================================================================
// Common Types
// =============================================================================

export type Timestamp = Date;
export type UUID = string;

// =============================================================================
// User Types (consolidated from user.ts)
// =============================================================================

export * from "./user.js";

// =============================================================================
// Memory Types
// =============================================================================

export interface Memory {
  id: UUID;
  userId: UUID;
  type: MemoryType;
  content: string;
  metadata: Record<string, unknown>;
  importance: number;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

export enum MemoryType {
  FACT = "fact",
  OBSERVATION = "observation",
  PATTERN = "pattern",
  PREFERENCE = "preference",
}

// =============================================================================
// Scheduling Types
// =============================================================================

export interface CalendarEvent {
  id: UUID;
  userId: UUID;
  title: string;
  description?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  isAllDay: boolean;
  recurrence?: RecurrenceRule;
  reminders: Reminder[];
}

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  endDate?: Timestamp;
  count?: number;
}

export interface Reminder {
  id: UUID;
  eventId?: UUID;
  userId: UUID;
  message: string;
  scheduledFor: Timestamp;
  status: ReminderStatus;
  deliveryMethod: DeliveryMethod;
}

export enum ReminderStatus {
  PENDING = "pending",
  SENT = "sent",
  SNOOZED = "snoozed",
  DISMISSED = "dismissed",
}

export enum DeliveryMethod {
  SMS = "sms",
  PUSH = "push",
  EMAIL = "email",
}

// =============================================================================
// Health Types
// =============================================================================

export interface SleepLog {
  id: UUID;
  userId: UUID;
  sleepTime: Timestamp;
  wakeTime: Timestamp;
  quality?: number;
  notes?: string;
}

export interface HealthMetric {
  id: UUID;
  userId: UUID;
  type: HealthMetricType;
  value: number;
  unit: string;
  recordedAt: Timestamp;
}

export enum HealthMetricType {
  WATER_INTAKE = "water_intake",
  EXERCISE_MINUTES = "exercise_minutes",
  STEPS = "steps",
  CALORIES = "calories",
  WEIGHT = "weight",
}

// =============================================================================
// Goal Types
// =============================================================================

export interface Goal {
  id: UUID;
  userId: UUID;
  title: string;
  description?: string;
  type: GoalType;
  targetDate?: Timestamp;
  progress: number;
  status: GoalStatus;
  milestones: Milestone[];
}

export enum GoalType {
  SHORT_TERM = "short_term",
  LONG_TERM = "long_term",
  HABIT = "habit",
}

export enum GoalStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  PAUSED = "paused",
  ABANDONED = "abandoned",
}

export interface Milestone {
  id: UUID;
  goalId: UUID;
  title: string;
  targetDate?: Timestamp;
  completedAt?: Timestamp;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface AppConfig {
  environment: "development" | "test" | "production";
  port: number;
  host: string;
  logLevel: "debug" | "info" | "warn" | "error";
  database: DatabaseConfig;
  redis: RedisConfig;
  security: SecurityConfig;
}

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  ssl: boolean;
}

export interface RedisConfig {
  url: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  encryptionKey: string;
}

// =============================================================================
// Result Types (for error handling)
// =============================================================================

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}
