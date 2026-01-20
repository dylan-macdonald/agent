/**
 * Context System Types
 *
 * Provides unified context aggregation from memory, patterns, user state,
 * and other sources to enable context-aware AI interactions
 */

import { MemoryType } from './memory.js';
import { Pattern, PatternType } from './pattern.js';

/**
 * Context categories
 */
export enum ContextCategory {
  CURRENT_STATE = 'current_state', // What's happening right now
  RECENT_ACTIVITY = 'recent_activity', // Recent past (last few hours/days)
  PATTERNS = 'patterns', // Known behavioral patterns
  GOALS = 'goals', // Active goals and progress
  PREFERENCES = 'preferences', // User preferences
  RELATIONSHIPS = 'relationships', // People and connections
  SCHEDULE = 'schedule', // Upcoming events
  ENVIRONMENT = 'environment', // Location, time, weather, etc.
}

/**
 * Context relevance level
 */
export enum ContextRelevance {
  CRITICAL = 'critical', // Immediately relevant, time-sensitive
  HIGH = 'high', // Very relevant to current situation
  MEDIUM = 'medium', // Moderately relevant
  LOW = 'low', // Possibly relevant
  MINIMAL = 'minimal', // Background information
}

/**
 * Time-based context window
 */
export enum ContextTimeWindow {
  NOW = 'now', // Current moment
  RECENT = 'recent', // Last few hours
  TODAY = 'today', // Current day
  THIS_WEEK = 'this_week', // Current week
  THIS_MONTH = 'this_month', // Current month
  LONGER_TERM = 'longer_term', // Beyond current month
}

/**
 * Base context item
 */
export interface ContextItem {
  id: string;
  category: ContextCategory;
  relevance: ContextRelevance;
  relevanceScore: number; // 0-1, calculated relevance
  timeWindow: ContextTimeWindow;
  timestamp: Date;
  expiresAt?: Date; // When this context becomes stale
  metadata: ContextMetadata;
}

/**
 * Context metadata for different types
 */
export interface ContextMetadata {
  memory?: MemoryContextData;
  pattern?: PatternContextData;
  state?: StateContextData;
  goal?: GoalContextData;
  schedule?: ScheduleContextData;
  environment?: EnvironmentContextData;
}

/**
 * Memory-based context
 */
export interface MemoryContextData {
  memoryId: string;
  memoryType: MemoryType;
  content: string;
  embedding?: number[];
  relatedMemoryIds?: string[];
}

/**
 * Pattern-based context
 */
export interface PatternContextData {
  patternId: string;
  patternType: PatternType;
  name: string;
  confidence: number;
  nextExpectedOccurrence?: Date;
  deviationDetected?: boolean; // If current state deviates from pattern
}

/**
 * Current state context
 */
export interface StateContextData {
  activity?: string; // What user is currently doing
  location?: string;
  mood?: string;
  energyLevel?: 'low' | 'medium' | 'high';
  focusLevel?: 'low' | 'medium' | 'high';
  availability?: 'available' | 'busy' | 'do_not_disturb';
  deviceType?: 'mobile' | 'desktop' | 'other';
}

/**
 * Goal-related context
 */
export interface GoalContextData {
  goalId: string;
  goalName: string;
  progress: number; // 0-100
  deadline?: Date;
  blockers?: string[];
  recentActivity?: string;
}

/**
 * Schedule/calendar context
 */
export interface ScheduleContextData {
  eventId?: string;
  eventName: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  participants?: string[];
  preparation?: string[]; // What needs to be done before
}

/**
 * Environment context
 */
export interface EnvironmentContextData {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number; // 0-6
  isWeekday: boolean;
  isHoliday?: boolean;
  weather?: string;
  temperature?: number;
  timezone: string;
}

/**
 * Full user context aggregation
 */
export interface UserContext {
  userId: string;
  generatedAt: Date;
  timeWindow: ContextTimeWindow;
  items: ContextItem[];
  summary: ContextSummary;
}

/**
 * Context summary for quick overview
 */
export interface ContextSummary {
  primaryActivity?: string; // Main thing user is doing
  location?: string;
  mood?: string;
  upcomingEvents: number; // Count of upcoming events
  activeGoals: number;
  recentPatternDeviations: number;
  criticalItems: number; // Count of critical context items
  keyInsights: string[]; // Important observations
}

/**
 * Context aggregation options
 */
export interface ContextAggregationOptions {
  userId: string;
  timeWindow?: ContextTimeWindow;
  categories?: ContextCategory[];
  minRelevance?: ContextRelevance;
  includeMemories?: boolean;
  includePatterns?: boolean;
  includeGoals?: boolean;
  includeSchedule?: boolean;
  maxItems?: number;
}

/**
 * Context query for finding relevant context
 */
export interface ContextQuery {
  userId: string;
  query?: string; // Natural language query
  keywords?: string[];
  categories?: ContextCategory[];
  timeWindow?: ContextTimeWindow;
  minRelevance?: ContextRelevance;
  limit?: number;
}

/**
 * Context relevance factors for scoring
 */
export interface RelevanceFactors {
  recency: number; // 0-1, how recent
  frequency: number; // 0-1, how often referenced
  similarity: number; // 0-1, semantic similarity to query
  temporalProximity: number; // 0-1, proximity to current time
  patternAlignment: number; // 0-1, alignment with known patterns
  userEngagement: number; // 0-1, how much user has engaged with this
}

/**
 * Context update input
 */
export interface UpdateContextInput {
  userId: string;
  category: ContextCategory;
  metadata: ContextMetadata;
  relevance?: ContextRelevance;
  expiresAt?: Date;
}

/**
 * Context search result
 */
export interface ContextSearchResult {
  item: ContextItem;
  score: number; // Search relevance score
  explanation: string; // Why this was relevant
}

/**
 * Helper: Calculate time window from date
 */
export function getTimeWindowForDate(date: Date, now: Date = new Date()): ContextTimeWindow {
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours < 0.5) {return ContextTimeWindow.NOW;}
  if (diffHours < 6) {return ContextTimeWindow.RECENT;}
  if (diffDays < 1) {return ContextTimeWindow.TODAY;}
  if (diffDays < 7) {return ContextTimeWindow.THIS_WEEK;}
  if (diffDays < 30) {return ContextTimeWindow.THIS_MONTH;}
  return ContextTimeWindow.LONGER_TERM;
}

/**
 * Helper: Get relevance enum from score
 */
export function getRelevanceLevelFromScore(score: number): ContextRelevance {
  if (score >= 0.9) {return ContextRelevance.CRITICAL;}
  if (score >= 0.7) {return ContextRelevance.HIGH;}
  if (score >= 0.5) {return ContextRelevance.MEDIUM;}
  if (score >= 0.3) {return ContextRelevance.LOW;}
  return ContextRelevance.MINIMAL;
}

/**
 * Helper: Check if context item is expired
 */
export function isContextExpired(item: ContextItem, now: Date = new Date()): boolean {
  if (!item.expiresAt) {return false;}
  return item.expiresAt < now;
}

/**
 * Helper: Get time of day from date
 */
export function getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {return 'morning';}
  if (hours >= 12 && hours < 17) {return 'afternoon';}
  if (hours >= 17 && hours < 21) {return 'evening';}
  return 'night';
}

/**
 * Helper: Calculate recency score
 */
export function calculateRecencyScore(timestamp: Date, now: Date = new Date()): number {
  const diffMs = now.getTime() - timestamp.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Exponential decay: score drops by half every 24 hours
  const halfLife = 24;
  return Math.exp(-diffHours / halfLife);
}

/**
 * Helper: Get default expiry for context category
 */
export function getDefaultExpiry(category: ContextCategory, from: Date = new Date()): Date {
  const expiry = new Date(from);

  switch (category) {
    case ContextCategory.CURRENT_STATE:
      expiry.setHours(expiry.getHours() + 1); // 1 hour
      break;
    case ContextCategory.RECENT_ACTIVITY:
      expiry.setHours(expiry.getHours() + 6); // 6 hours
      break;
    case ContextCategory.SCHEDULE:
      expiry.setDate(expiry.getDate() + 1); // 1 day
      break;
    case ContextCategory.PATTERNS:
      expiry.setDate(expiry.getDate() + 30); // 30 days
      break;
    default:
      expiry.setDate(expiry.getDate() + 7); // 7 days
  }

  return expiry;
}

/**
 * Helper: Merge relevance factors into final score
 */
export function calculateRelevanceScore(factors: Partial<RelevanceFactors>): number {
  const weights = {
    recency: 0.25,
    frequency: 0.15,
    similarity: 0.30,
    temporalProximity: 0.10,
    patternAlignment: 0.10,
    userEngagement: 0.10,
  };

  let score = 0;
  let totalWeight = 0;

  for (const [key, value] of Object.entries(factors)) {
    if (value !== undefined && key in weights) {
      const weight = weights[key as keyof typeof weights];
      score += value * weight;
      totalWeight += weight;
    }
  }

  // Normalize by actual weights used
  return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * Helper: Detect pattern deviation
 */
export function detectPatternDeviation(
  pattern: Pattern,
  currentTime: Date,
  currentActivity?: string
): boolean {
  // This is a simplified check - actual implementation would be more sophisticated
  const metadata = pattern.metadata;

  if (pattern.type === 'sleep_wake' && metadata.sleepWake) {
    const currentHour = currentTime.getHours();
    const sleepHour = parseInt(metadata.sleepWake.averageSleepTime.split(':')[0] || '0');
    const wakeHour = parseInt(metadata.sleepWake.averageWakeTime.split(':')[0] || '0');

    // Check if user should be asleep but appears active
    if (currentHour >= sleepHour || currentHour < wakeHour) {
      return currentActivity !== 'sleeping';
    }
  }

  return false;
}
