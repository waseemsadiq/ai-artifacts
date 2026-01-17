/**
 * NotifyKit Configuration Types
 * @module @notify-kit/core
 */

/**
 * Firebase configuration object
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

/**
 * Notification category definition
 * Categories replace hardcoded prayer names - each category can have its own
 * notification templates and offset options
 */
export interface NotificationCategory {
  /** Unique identifier for the category (e.g., 'reminder', 'alert') */
  id: string;
  /** Human-readable name (e.g., 'Reminders', 'Alerts') */
  name: string;
  /** Title template with {{placeholders}} (e.g., '{{name}} Reminder') */
  titleTemplate: string;
  /** Body template with {{placeholders}} (e.g., '{{name}} in {{offset}} minutes') */
  bodyTemplate: string;
  /** Whether this category is enabled by default */
  defaultEnabled: boolean;
  /** Whether to allow "X mins before" offsets */
  allowOffset: boolean;
  /** Available offset options in minutes (e.g., [0, 5, 15, 30]) */
  offsetOptions?: number[];
}

/**
 * Event source configuration - how to fetch schedulable items
 */
export interface EventSourceConfig {
  /** Type of event source */
  type: 'api' | 'firestore' | 'custom';
  /** API URL if type is 'api' */
  apiUrl?: string;
  /** Custom transformer function to convert API data to events */
  transformer?: (data: unknown) => SchedulableEvent[];
}

/**
 * Scheduling configuration
 */
export interface SchedulingConfig {
  /** Cron expression (e.g., '0 1 * * *' for daily 1 AM) */
  cronExpression: string;
  /** Timezone (e.g., 'Europe/London') */
  timezone: string;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** IndexedDB database name */
  dbName: string;
  /** Firestore collection for user preferences */
  firestoreCollection: string;
}

/**
 * Branding configuration for notifications
 */
export interface BrandingConfig {
  /** Icon URL for notifications */
  icon: string;
  /** Badge icon URL (optional) */
  badge?: string;
  /** App URL for notification clicks */
  appUrl: string;
}

/**
 * Main NotifyKit configuration object
 */
export interface NotifyKitConfig {
  /** Firebase configuration (required) */
  firebase: FirebaseConfig;
  /** Notification categories */
  categories: NotificationCategory[];
  /** Event source configuration */
  eventSource: EventSourceConfig;
  /** Scheduling configuration */
  scheduling: SchedulingConfig;
  /** Storage configuration */
  storage: StorageConfig;
  /** Branding configuration */
  branding: BrandingConfig;
}

/**
 * A schedulable event that can trigger notifications
 */
export interface SchedulableEvent {
  /** Unique identifier */
  id: string;
  /** Category ID this event belongs to */
  categoryId: string;
  /** Event name (e.g., 'Morning Meeting', 'Fajar') */
  name: string;
  /** Primary time for the event */
  time: Date;
  /** Optional secondary time (e.g., jamaat time) */
  secondaryTime?: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Scheduled notification stored in IndexedDB
 */
export interface ScheduledNotification {
  /** Unique notification ID */
  id: string;
  /** Category ID */
  categoryId: string;
  /** Event name */
  eventName: string;
  /** Unix timestamp for when to show notification */
  notificationTime: number;
  /** Original event time string (for display) */
  eventTimeStr: string;
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Whether notification has been delivered */
  delivered: boolean;
  /** Minutes before event (offset) */
  minutesBefore: number;
}

/**
 * User notification preferences stored in Firestore
 */
export interface UserPreferences {
  /** FCM token */
  fcmToken: string;
  /** Last update timestamp */
  lastUpdated: Date;
  /** Notification reference ('start' or 'jamaat' style) */
  notificationReference: 'primary' | 'secondary';
  /** Minutes before to notify (offset) */
  minutesBefore: number;
  /** Category-specific enabled states */
  categories: Record<string, boolean>;
  /** Date-specific overrides */
  dateOverrides?: Record<string, Record<string, boolean>>;
}

/**
 * Template context for rendering notification content
 */
export interface TemplateContext {
  /** Event name */
  name: string;
  /** Offset in minutes */
  offset: number;
  /** Formatted time string */
  time: string;
  /** Category name */
  category: string;
  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * Notification display options
 */
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  data?: Record<string, unknown>;
}

/**
 * Result of requesting notification permission
 */
export type PermissionResult = 'granted' | 'denied' | 'default';

/**
 * Push notification payload from FCM
 */
export interface PushPayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
}
