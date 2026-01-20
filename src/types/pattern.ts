/**
 * Pattern Recognition Types
 *
 * Defines structures for detecting and tracking user behavioral patterns
 */

export enum PatternType {
  SLEEP_WAKE = 'sleep_wake',
  ACTIVITY = 'activity',
  LOCATION = 'location',
  COMMUNICATION = 'communication',
  PREFERENCE = 'preference',
  ROUTINE = 'routine',
}

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  WEEKDAY = 'weekday', // Monday-Friday
  WEEKEND = 'weekend', // Saturday-Sunday
  CUSTOM = 'custom',
}

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

/**
 * Base pattern interface
 */
export interface Pattern {
  id: string;
  userId: string;
  type: PatternType;
  name: string;
  description: string;
  recurrence: RecurrenceType;
  confidence: number; // 0-1, how confident we are in this pattern
  dataPoints: number; // Number of observations supporting this pattern
  metadata: PatternMetadata;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastObservedAt: Date;
}

/**
 * Pattern metadata specific to each pattern type
 */
export interface PatternMetadata {
  sleepWake?: SleepWakePatternData;
  activity?: ActivityPatternData;
  location?: LocationPatternData;
  communication?: CommunicationPatternData;
  preference?: PreferencePatternData;
  routine?: RoutinePatternData;
}

/**
 * Sleep/Wake pattern data
 */
export interface SleepWakePatternData {
  averageSleepTime: string; // HH:MM format
  averageWakeTime: string; // HH:MM format
  averageSleepDuration: number; // Minutes
  daysOfWeek?: DayOfWeek[]; // Which days this pattern applies to
  varianceMinutes: number; // Standard deviation in minutes
  qualityScore?: number; // 0-1, sleep quality
}

/**
 * Activity pattern data
 */
export interface ActivityPatternData {
  activityType: string; // e.g., "exercise", "work", "meal"
  averageStartTime: string; // HH:MM format
  averageDuration: number; // Minutes
  daysOfWeek?: DayOfWeek[]; // Which days this pattern applies to
  location?: string;
  intensity?: 'low' | 'medium' | 'high';
}

/**
 * Location pattern data
 */
export interface LocationPatternData {
  location: string;
  averageArrivalTime: string; // HH:MM format
  averageDepartureTime?: string; // HH:MM format
  averageDuration?: number; // Minutes
  daysOfWeek?: DayOfWeek[];
  purpose?: string; // e.g., "work", "home", "gym"
}

/**
 * Communication pattern data
 */
export interface CommunicationPatternData {
  method: string; // e.g., "sms", "call", "email"
  averageFrequency: number; // Messages per day
  peakHours: number[]; // Hours of day (0-23)
  daysOfWeek?: DayOfWeek[];
  averageResponseTime?: number; // Minutes
}

/**
 * Preference pattern data
 */
export interface PreferencePatternData {
  preferenceCategory: string;
  preferenceKey: string;
  preferredValue: unknown;
  alternativeValues?: unknown[];
  contextConditions?: string[]; // Conditions when this preference applies
}

/**
 * Routine pattern data
 */
export interface RoutinePatternData {
  routineName: string;
  steps: RoutineStep[];
  averageStartTime: string; // HH:MM format
  averageDuration: number; // Minutes
  daysOfWeek?: DayOfWeek[];
}

export interface RoutineStep {
  order: number;
  action: string;
  averageDuration?: number; // Minutes
}

/**
 * Pattern observation (raw data point)
 */
export interface PatternObservation {
  id: string;
  userId: string;
  type: PatternType;
  timestamp: Date;
  data: Record<string, unknown>;
  source: string; // Where this observation came from
  processed: boolean; // Has this been processed into patterns?
}

/**
 * Create pattern input
 */
export interface CreatePatternInput {
  userId: string;
  type: PatternType;
  name: string;
  description?: string;
  recurrence: RecurrenceType;
  metadata: PatternMetadata;
}

/**
 * Update pattern input
 */
export interface UpdatePatternInput {
  name?: string;
  description?: string;
  recurrence?: RecurrenceType;
  confidence?: number;
  dataPoints?: number;
  metadata?: PatternMetadata;
  active?: boolean;
  lastObservedAt?: Date;
}

/**
 * Pattern search query
 */
export interface PatternSearchQuery {
  userId: string;
  types?: PatternType[];
  recurrence?: RecurrenceType[];
  minConfidence?: number;
  active?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Pattern detection result
 */
export interface PatternDetectionResult {
  pattern: Pattern;
  isNew: boolean; // Whether this is a newly detected pattern
  confidenceChange?: number; // How much confidence changed
  insights: string[]; // Human-readable insights
}

/**
 * Pattern prediction
 */
export interface PatternPrediction {
  pattern: Pattern;
  predictedNextOccurrence: Date;
  confidence: number; // 0-1, how confident in this prediction
  reasoning: string;
}

/**
 * Sleep/wake log entry
 */
export interface SleepWakeLog {
  id: string;
  userId: string;
  sleepTime: Date;
  wakeTime: Date;
  duration: number; // Minutes
  quality?: number; // 0-1
  notes?: string;
  createdAt: Date;
}

/**
 * Create sleep/wake log input
 */
export interface CreateSleepWakeLogInput {
  userId: string;
  sleepTime: Date;
  wakeTime: Date;
  quality?: number;
  notes?: string;
}

/**
 * Activity log entry
 */
export interface ActivityLog {
  id: string;
  userId: string;
  activityType: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // Minutes
  location?: string;
  intensity?: 'low' | 'medium' | 'high';
  notes?: string;
  createdAt: Date;
}

/**
 * Create activity log input
 */
export interface CreateActivityLogInput {
  userId: string;
  activityType: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  intensity?: 'low' | 'medium' | 'high';
  notes?: string;
}

/**
 * Pattern statistics
 */
export interface PatternStats {
  userId: string;
  totalPatterns: number;
  byType: Record<PatternType, number>;
  byRecurrence: Record<RecurrenceType, number>;
  averageConfidence: number;
  mostReliablePattern?: Pattern;
  leastReliablePattern?: Pattern;
}

/**
 * Time utilities for pattern analysis
 */
export interface TimeRange {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface TimeStatistics {
  average: string; // HH:MM format
  median: string; // HH:MM format
  mode?: string; // HH:MM format (most common)
  standardDeviation: number; // Minutes
  earliest: string; // HH:MM format
  latest: string; // HH:MM format
}

/**
 * Helper functions
 */

/**
 * Convert Date to HH:MM format
 */
export function dateToTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Parse HH:MM to minutes since midnight
 */
export function timeStringToMinutes(time: string): number {
  const parts = time.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to HH:MM
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.floor(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate time difference in minutes
 */
export function timeDifference(time1: string, time2: string): number {
  const minutes1 = timeStringToMinutes(time1);
  const minutes2 = timeStringToMinutes(time2);
  let diff = minutes2 - minutes1;

  // Handle crossing midnight
  if (diff < 0) {
    diff += 24 * 60;
  }

  return diff;
}

/**
 * Get day of week from date
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  return date.getDay() as DayOfWeek;
}

/**
 * Check if day is weekday
 */
export function isWeekday(day: DayOfWeek): boolean {
  return day >= DayOfWeek.MONDAY && day <= DayOfWeek.FRIDAY;
}

/**
 * Check if day is weekend
 */
export function isWeekend(day: DayOfWeek): boolean {
  return day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY;
}

/**
 * Calculate average time from array of time strings
 */
export function calculateAverageTime(times: string[]): string {
  if (times.length === 0) {return '00:00';}

  const totalMinutes = times.reduce((sum, time) => {
    return sum + timeStringToMinutes(time);
  }, 0);

  const averageMinutes = Math.round(totalMinutes / times.length);
  return minutesToTimeString(averageMinutes);
}

/**
 * Calculate standard deviation for times
 */
export function calculateTimeStandardDeviation(times: string[]): number {
  if (times.length === 0) {return 0;}

  const minutes = times.map(timeStringToMinutes);
  const average = minutes.reduce((a, b) => a + b, 0) / minutes.length;

  const squaredDiffs = minutes.map((m) => Math.pow(m - average, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / minutes.length;

  return Math.sqrt(variance);
}

/**
 * Group times by day of week
 */
export function groupTimesByDayOfWeek(
  entries: Array<{ timestamp: Date; value: string }>
): Map<DayOfWeek, string[]> {
  const grouped = new Map<DayOfWeek, string[]>();

  for (const entry of entries) {
    const day = getDayOfWeek(entry.timestamp);
    if (!grouped.has(day)) {
      grouped.set(day, []);
    }
    grouped.get(day)!.push(entry.value);
  }

  return grouped;
}
