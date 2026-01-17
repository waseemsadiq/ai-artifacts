/**
 * IndexedDB Store for Device Notifications
 *
 * Manages local notification scheduling as a fallback when push notifications
 * fail or are disabled. This provides a reliable dual-path notification system.
 *
 * @module @notify-kit/core
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { ScheduledNotification, StorageConfig } from '../types';

/**
 * IndexedDB schema for notifications database
 */
interface NotificationDB extends DBSchema {
  scheduled: {
    key: string;
    value: ScheduledNotification;
    indexes: { 'by-time': number };
  };
}

// Database promise cache (per database name)
const dbPromises = new Map<string, Promise<IDBPDatabase<NotificationDB>>>();

/**
 * Get or create the IndexedDB database
 *
 * @param dbName - Name of the IndexedDB database
 * @returns Promise resolving to the database instance
 */
async function getDB(dbName: string): Promise<IDBPDatabase<NotificationDB>> {
  if (!dbPromises.has(dbName)) {
    const promise = openDB<NotificationDB>(dbName, 1, {
      upgrade(db) {
        const store = db.createObjectStore('scheduled', { keyPath: 'id' });
        store.createIndex('by-time', 'notificationTime');
      },
    });
    dbPromises.set(dbName, promise);
  }
  return dbPromises.get(dbName)!;
}

/**
 * Create a notification store instance for the given configuration
 *
 * @param config - Storage configuration
 * @returns Object with notification store methods
 *
 * @example
 * ```typescript
 * const store = createNotificationStore({ dbName: 'my-app-notifications' });
 * await store.storeNotifications(notifications);
 * const pending = await store.getPendingNotifications();
 * ```
 */
export function createNotificationStore(config: StorageConfig) {
  const { dbName } = config;

  return {
    /**
     * Store scheduled notifications in IndexedDB
     * Clears old notifications first, then stores new ones
     *
     * @param notifications - Array of notifications to store
     */
    async storeNotifications(notifications: ScheduledNotification[]): Promise<void> {
      try {
        const db = await getDB(dbName);
        const tx = db.transaction('scheduled', 'readwrite');

        // Clear old notifications first
        await tx.store.clear();

        // Store new notifications
        for (const notification of notifications) {
          await tx.store.put(notification);
        }

        await tx.done;
        console.log(`[NotifyKit] Stored ${notifications.length} notifications in IndexedDB`);
      } catch (error) {
        console.error('[NotifyKit] Failed to store notifications:', error);
        throw error;
      }
    },

    /**
     * Get pending notifications that should be delivered now
     * Returns notifications within a 30-minute window of current time
     *
     * @returns Array of pending notifications
     */
    async getPendingNotifications(): Promise<ScheduledNotification[]> {
      try {
        const db = await getDB(dbName);
        const now = Date.now();

        const all = await db.getAllFromIndex('scheduled', 'by-time');

        return all.filter(
          (n) =>
            !n.delivered &&
            n.notificationTime <= now &&
            n.notificationTime > now - 30 * 60 * 1000 // Within last 30 mins
        );
      } catch (error) {
        console.error('[NotifyKit] Failed to get pending notifications:', error);
        return [];
      }
    },

    /**
     * Mark a notification as delivered to prevent duplicates
     *
     * @param id - Notification ID to mark as delivered
     */
    async markAsDelivered(id: string): Promise<void> {
      try {
        const db = await getDB(dbName);
        const notification = await db.get('scheduled', id);
        if (notification) {
          notification.delivered = true;
          await db.put('scheduled', notification);
          console.log(`[NotifyKit] Marked ${id} as delivered`);
        }
      } catch (error) {
        console.error('[NotifyKit] Failed to mark as delivered:', error);
      }
    },

    /**
     * Cancel a specific device notification (e.g., when push notification arrives)
     * Prevents duplicate notifications from both paths
     *
     * @param id - Notification ID to cancel
     */
    async cancelNotification(id: string): Promise<void> {
      try {
        const db = await getDB(dbName);
        const notification = await db.get('scheduled', id);
        if (notification && !notification.delivered) {
          notification.delivered = true;
          await db.put('scheduled', notification);
          console.log(`[NotifyKit] Cancelled device notification: ${id}`);
        }
      } catch (error) {
        console.error('[NotifyKit] Failed to cancel notification:', error);
      }
    },

    /**
     * Clear notifications older than 24 hours
     */
    async clearOldNotifications(): Promise<void> {
      try {
        const db = await getDB(dbName);
        const yesterday = Date.now() - 24 * 60 * 60 * 1000;

        const all = await db.getAll('scheduled');
        const tx = db.transaction('scheduled', 'readwrite');

        let cleared = 0;
        for (const notification of all) {
          if (notification.notificationTime < yesterday) {
            await tx.store.delete(notification.id);
            cleared++;
          }
        }

        await tx.done;
        if (cleared > 0) {
          console.log(`[NotifyKit] Cleared ${cleared} old notifications`);
        }
      } catch (error) {
        console.error('[NotifyKit] Failed to clear old notifications:', error);
      }
    },

    /**
     * Clear all scheduled notifications
     * Used when switching from offline to online mode
     */
    async clearAllNotifications(): Promise<void> {
      try {
        const db = await getDB(dbName);
        await db.clear('scheduled');
        console.log('[NotifyKit] Cleared all scheduled device notifications');
      } catch (error) {
        console.error('[NotifyKit] Failed to clear notifications:', error);
      }
    },

    /**
     * Get all scheduled notifications (for debugging)
     *
     * @returns Array of all scheduled notifications
     */
    async getAllNotifications(): Promise<ScheduledNotification[]> {
      try {
        const db = await getDB(dbName);
        return db.getAll('scheduled');
      } catch (error) {
        console.error('[NotifyKit] Failed to get all notifications:', error);
        return [];
      }
    },
  };
}

export type NotificationStore = ReturnType<typeof createNotificationStore>;
