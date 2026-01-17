/**
 * @notify-kit/core
 *
 * Core utilities for dual-path notification system
 *
 * @packageDocumentation
 */

// Types
export type {
  FirebaseConfig,
  NotificationCategory,
  EventSourceConfig,
  SchedulingConfig,
  StorageConfig,
  BrandingConfig,
  NotifyKitConfig,
  SchedulableEvent,
  ScheduledNotification,
  UserPreferences,
  TemplateContext,
  NotificationOptions,
  PermissionResult,
  PushPayload,
} from './types';

// IndexedDB Store
export {
  createNotificationStore,
  type NotificationStore,
} from './scheduler/indexedDBStore';

// Notification Builder
export {
  buildNotificationId,
  buildScheduledNotifications,
  buildNotificationOptions,
  buildNotificationFromPush,
} from './scheduler/notificationBuilder';

// Firebase
export {
  initializeFirebase,
  getFirebaseApp,
  getFirebaseMessaging,
  isFirebaseInitialized,
} from './firebase/init';

export {
  requestFCMToken,
  setupForegroundMessages,
  sendTestNotification,
  buildFunctionUrl,
  syncPreferencesToBackend,
} from './firebase/messaging';

// Utilities
export {
  renderTemplate,
  extractPlaceholders,
  validateContext,
} from './utils/templateRenderer';

export {
  parseTime,
  formatTime,
  getTimeDifference,
  isWithinWindow,
  getStartOfDay,
  getEndOfDay,
  addMinutes,
  isToday,
  isTomorrow,
} from './utils/timeUtils';
