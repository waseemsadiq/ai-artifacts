/**
 * @notify-kit/react
 *
 * React hooks for NotifyKit dual-path notification system
 *
 * @packageDocumentation
 */

export {
  useNotifications,
  type UseNotificationsReturn,
  type UseNotificationsOptions,
} from './hooks/useNotifications';

// Re-export commonly used types from core
export type {
  NotifyKitConfig,
  NotificationCategory,
  SchedulableEvent,
  ScheduledNotification,
  UserPreferences,
  PushPayload,
  PermissionResult,
} from '@notify-kit/core';
