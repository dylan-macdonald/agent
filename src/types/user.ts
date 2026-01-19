/**
 * User Profile Types
 */

export interface User {
  id: string;
  phoneNumber: string;
  phoneVerified: boolean;
  timezone: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date | null;
}

export interface CreateUserInput {
  phoneNumber: string;
  timezone?: string;
}

export interface UpdateUserInput {
  phoneNumber?: string;
  phoneVerified?: boolean;
  timezone?: string;
  active?: boolean;
  lastActiveAt?: Date;
}

/**
 * User Settings/Preferences Types
 */

export enum PreferenceCategory {
  GENERAL = 'general',
  NOTIFICATIONS = 'notifications',
  PRIVACY = 'privacy',
  HEALTH = 'health',
  COMMUNICATION = 'communication',
  SCHEDULING = 'scheduling',
  REMINDERS = 'reminders',
}

export enum PreferenceValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ENCRYPTED = 'encrypted',
}

export interface UserSetting {
  id: string;
  userId: string;
  category: PreferenceCategory;
  key: string;
  value: string;
  valueType: PreferenceValueType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserSettingInput {
  userId: string;
  category: PreferenceCategory;
  key: string;
  value: unknown;
  valueType: PreferenceValueType;
  encrypted?: boolean;
}

export interface UpdateUserSettingInput {
  value: unknown;
  valueType?: PreferenceValueType;
  encrypted?: boolean;
}

/**
 * Preference Schema Definitions
 */

export interface PreferenceSchema {
  category: PreferenceCategory;
  key: string;
  valueType: PreferenceValueType;
  required: boolean;
  defaultValue?: unknown;
  validation?: PreferenceValidation;
  encrypted?: boolean;
  description: string;
}

export interface PreferenceValidation {
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: unknown[];
  customValidator?: (value: unknown) => boolean;
}

/**
 * User Profile with Settings
 */

export interface UserProfile {
  user: User;
  settings: Map<string, unknown>;
}

export interface GetUserProfileOptions {
  includeSettings?: boolean;
  categories?: PreferenceCategory[];
}

/**
 * Preference Presets
 */

export const PREFERENCE_SCHEMAS: PreferenceSchema[] = [
  // General Preferences
  {
    category: PreferenceCategory.GENERAL,
    key: 'language',
    valueType: PreferenceValueType.STRING,
    required: false,
    defaultValue: 'en',
    validation: {
      allowedValues: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
    },
    description: 'User preferred language',
  },
  {
    category: PreferenceCategory.GENERAL,
    key: 'theme',
    valueType: PreferenceValueType.STRING,
    required: false,
    defaultValue: 'light',
    validation: {
      allowedValues: ['light', 'dark', 'auto'],
    },
    description: 'UI theme preference',
  },

  // Notification Preferences
  {
    category: PreferenceCategory.NOTIFICATIONS,
    key: 'enabled',
    valueType: PreferenceValueType.BOOLEAN,
    required: false,
    defaultValue: true,
    description: 'Enable/disable all notifications',
  },
  {
    category: PreferenceCategory.NOTIFICATIONS,
    key: 'quiet_hours_start',
    valueType: PreferenceValueType.STRING,
    required: false,
    defaultValue: '22:00',
    validation: {
      pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    description: 'Quiet hours start time (HH:MM)',
  },
  {
    category: PreferenceCategory.NOTIFICATIONS,
    key: 'quiet_hours_end',
    valueType: PreferenceValueType.STRING,
    required: false,
    defaultValue: '08:00',
    validation: {
      pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    description: 'Quiet hours end time (HH:MM)',
  },
  {
    category: PreferenceCategory.NOTIFICATIONS,
    key: 'sms_enabled',
    valueType: PreferenceValueType.BOOLEAN,
    required: false,
    defaultValue: true,
    description: 'Enable SMS notifications',
  },

  // Privacy Preferences
  {
    category: PreferenceCategory.PRIVACY,
    key: 'data_retention_days',
    valueType: PreferenceValueType.NUMBER,
    required: false,
    defaultValue: 90,
    validation: {
      min: 30,
      max: 365,
    },
    description: 'Number of days to retain user data',
  },
  {
    category: PreferenceCategory.PRIVACY,
    key: 'share_analytics',
    valueType: PreferenceValueType.BOOLEAN,
    required: false,
    defaultValue: false,
    description: 'Share anonymized usage analytics',
  },

  // Health Tracking Preferences
  {
    category: PreferenceCategory.HEALTH,
    key: 'tracking_enabled',
    valueType: PreferenceValueType.BOOLEAN,
    required: false,
    defaultValue: true,
    description: 'Enable health tracking features',
  },
  {
    category: PreferenceCategory.HEALTH,
    key: 'weight_unit',
    valueType: PreferenceValueType.STRING,
    required: false,
    defaultValue: 'kg',
    validation: {
      allowedValues: ['kg', 'lbs'],
    },
    description: 'Weight measurement unit',
  },
  {
    category: PreferenceCategory.HEALTH,
    key: 'height_unit',
    valueType: PreferenceValueType.STRING,
    required: false,
    defaultValue: 'cm',
    validation: {
      allowedValues: ['cm', 'in', 'ft'],
    },
    description: 'Height measurement unit',
  },

  // Communication Preferences
  {
    category: PreferenceCategory.COMMUNICATION,
    key: 'proactive_messages',
    valueType: PreferenceValueType.BOOLEAN,
    required: false,
    defaultValue: true,
    description: 'Allow assistant to initiate conversations',
  },
  {
    category: PreferenceCategory.COMMUNICATION,
    key: 'response_style',
    valueType: PreferenceValueType.STRING,
    required: false,
    defaultValue: 'friendly',
    validation: {
      allowedValues: ['concise', 'friendly', 'detailed', 'professional'],
    },
    description: 'Assistant communication style',
  },

  // Scheduling Preferences
  {
    category: PreferenceCategory.SCHEDULING,
    key: 'work_days',
    valueType: PreferenceValueType.JSON,
    required: false,
    defaultValue: [1, 2, 3, 4, 5], // Monday-Friday
    description: 'Working days (0=Sunday, 6=Saturday)',
  },
  {
    category: PreferenceCategory.SCHEDULING,
    key: 'work_hours_start',
    valueType: PreferenceValueType.STRING,
    required: false,
    defaultValue: '09:00',
    validation: {
      pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    description: 'Work hours start time (HH:MM)',
  },
  {
    category: PreferenceCategory.SCHEDULING,
    key: 'work_hours_end',
    valueType: PreferenceValueType.STRING,
    required: false,
    defaultValue: '17:00',
    validation: {
      pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    description: 'Work hours end time (HH:MM)',
  },

  // Reminder Preferences
  {
    category: PreferenceCategory.REMINDERS,
    key: 'default_reminder_minutes',
    valueType: PreferenceValueType.NUMBER,
    required: false,
    defaultValue: 15,
    validation: {
      min: 1,
      max: 1440, // 24 hours
    },
    description: 'Default reminder time before events (minutes)',
  },
  {
    category: PreferenceCategory.REMINDERS,
    key: 'snooze_duration_minutes',
    valueType: PreferenceValueType.NUMBER,
    required: false,
    defaultValue: 10,
    validation: {
      min: 1,
      max: 60,
    },
    description: 'Snooze duration for reminders (minutes)',
  },
];

/**
 * Helper function to get preference schema
 */
export function getPreferenceSchema(
  category: PreferenceCategory,
  key: string
): PreferenceSchema | undefined {
  return PREFERENCE_SCHEMAS.find(
    (schema) => schema.category === category && schema.key === key
  );
}

/**
 * Helper function to get default value for a preference
 */
export function getPreferenceDefault(
  category: PreferenceCategory,
  key: string
): unknown {
  const schema = getPreferenceSchema(category, key);
  return schema?.defaultValue;
}
