/**
 * Message Processor Types
 *
 * Defines intents, entities, and processing results
 */

export enum Intent {
  REMIND = "remind",
  LOG = "log",
  GOAL = "goal",
  GOAL_LOG = 'GOAL_LOG',
  SLEEP_LOG = 'SLEEP_LOG',
  WORKOUT_LOG = 'WORKOUT_LOG',
  MEDITATE = 'MEDITATE',
  HELP = 'HELP',
  STATUS = "status",
  WEB_SEARCH = "web_search",
  CALCULATE = "calculate",
  RUN_SCRIPT = "run_script",
  VISION_QUERY = "vision_query",
  CALENDAR_EVENT = "calendar_event",
  CANCEL = "cancel",
  SEARCH = "search",
  CONFIRM = "confirm",
  DENY = "deny",
  SELF_MODIFY = "self_modify",
  SELF_MODIFY_VERIFY = "self_modify_verify",
  UNKNOWN = "unknown",
}

export enum EntityType {
  DATE = "date",
  TIME = "time",
  DURATION = "duration",
  TASK = "task",
  CATEGORY = "category",
  VALUE = "value",
  UNIT = "unit",
  QUERY = "query",
  CODE = "code",
}

export interface Entity {
  type: EntityType;
  value: string;
  original: string;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, unknown>;
}

export interface ProcessingResult {
  text: string;
  intent: Intent;
  confidence: number;
  entities: Entity[];
  isCommand: boolean;
  command?: string;
}

export interface CommandDefinition {
  name: string;
  intent: Intent;
  description: string;
  usage: string;
  aliases?: string[];
}
