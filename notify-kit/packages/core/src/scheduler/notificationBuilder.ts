/**
 * Notification Builder
 *
 * Creates notification content from templates and events
 *
 * @module @notify-kit/core
 */

import type {
  NotifyKitConfig,
  SchedulableEvent,
  ScheduledNotification,
  TemplateContext,
  NotificationOptions,
} from '../types';
import { renderTemplate } from '../utils/templateRenderer';
import { formatTime } from '../utils/timeUtils';

/**
 * Build a notification ID for deduplication
 *
 * @param categoryId - Category ID
 * @param eventName - Event name
 * @param date - Date of the event
 * @param offset - Offset in minutes
 * @returns Unique notification ID
 */
export function buildNotificationId(
  categoryId: string,
  eventName: string,
  date: Date,
  offset: number = 0
): string {
  const dateStr = date.toDateString();
  return `${categoryId}_${eventName}_${offset}_${dateStr}`;
}

/**
 * Build scheduled notifications from events based on user preferences
 *
 * @param events - Array of schedulable events
 * @param preferences - User notification preferences
 * @param config - NotifyKit configuration
 * @returns Array of scheduled notifications
 *
 * @example
 * ```typescript
 * const notifications = buildScheduledNotifications(events, {
 *   categories: { reminder: true },
 *   minutesBefore: 15,
 *   notificationReference: 'primary',
 * }, config);
 * ```
 */
export function buildScheduledNotifications(
  events: SchedulableEvent[],
  preferences: {
    categories: Record<string, boolean>;
    minutesBefore: number;
    notificationReference: 'primary' | 'secondary';
  },
  config: NotifyKitConfig
): ScheduledNotification[] {
  const notifications: ScheduledNotification[] = [];
  const now = Date.now();

  for (const event of events) {
    // Check if category is enabled
    if (!preferences.categories[event.categoryId]) {
      continue;
    }

    // Find category config
    const category = config.categories.find((c) => c.id === event.categoryId);
    if (!category) {
      continue;
    }

    // Determine which time to use
    const baseTime =
      preferences.notificationReference === 'secondary' && event.secondaryTime
        ? event.secondaryTime
        : event.time;

    // Calculate notification time with offset
    const offsetMs = preferences.minutesBefore * 60 * 1000;
    const notificationTime = new Date(baseTime.getTime() - offsetMs);

    // Skip if notification time has passed
    if (notificationTime.getTime() < now) {
      continue;
    }

    // Build template context
    const context: TemplateContext = {
      name: event.name,
      offset: preferences.minutesBefore,
      time: formatTime(baseTime),
      category: category.name,
      ...event.metadata,
    };

    // Render notification content
    const title = renderTemplate(category.titleTemplate, context);
    const body = renderTemplate(category.bodyTemplate, context);

    // Create notification object
    const notification: ScheduledNotification = {
      id: buildNotificationId(
        event.categoryId,
        event.name,
        event.time,
        preferences.minutesBefore
      ),
      categoryId: event.categoryId,
      eventName: event.name,
      notificationTime: notificationTime.getTime(),
      eventTimeStr: formatTime(baseTime),
      title,
      body,
      delivered: false,
      minutesBefore: preferences.minutesBefore,
    };

    notifications.push(notification);
  }

  return notifications;
}

/**
 * Build notification display options for showing a notification
 *
 * @param notification - Scheduled notification
 * @param config - NotifyKit configuration
 * @returns Notification display options
 */
export function buildNotificationOptions(
  notification: ScheduledNotification,
  config: NotifyKitConfig
): NotificationOptions {
  return {
    title: notification.title,
    body: notification.body,
    icon: config.branding.icon,
    badge: config.branding.badge || config.branding.icon,
    tag: notification.id,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      categoryId: notification.categoryId,
      eventName: notification.eventName,
      type: 'device_notification',
      url: config.branding.appUrl,
    },
  };
}

/**
 * Build notification options from a push payload
 *
 * @param payload - Push notification payload
 * @param config - NotifyKit configuration
 * @returns Notification display options
 */
export function buildNotificationFromPush(
  payload: {
    categoryId?: string;
    eventName?: string;
    minutesBefore?: string;
    timeStr?: string;
    title?: string;
    body?: string;
  },
  config: NotifyKitConfig
): NotificationOptions {
  const categoryId = payload.categoryId || 'default';
  const eventName = payload.eventName || 'Event';
  const minutesBefore = parseInt(payload.minutesBefore || '0', 10);
  const timeStr = payload.timeStr || '';

  // Find category for templating
  const category = config.categories.find((c) => c.id === categoryId);

  // Build title and body
  let title = payload.title;
  let body = payload.body;

  if (!title || !body) {
    const context: TemplateContext = {
      name: eventName,
      offset: minutesBefore,
      time: timeStr,
      category: category?.name || categoryId,
    };

    if (category) {
      title = title || renderTemplate(category.titleTemplate, context);
      body = body || renderTemplate(category.bodyTemplate, context);
    } else {
      title = title || eventName;
      body =
        body ||
        (minutesBefore === 0
          ? `It is time for ${eventName}`
          : `${eventName} in ${minutesBefore} minutes`);
    }
  }

  // Generate notification ID for deduplication
  const today = new Date().toDateString();
  const notificationId = `${categoryId}_${eventName}_${today}`;

  return {
    title,
    body,
    icon: config.branding.icon,
    badge: config.branding.badge || config.branding.icon,
    tag: notificationId,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      ...payload,
      type: 'push_notification',
      url: config.branding.appUrl,
    },
  };
}
