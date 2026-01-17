/**
 * useNotifications Hook
 *
 * React hook for managing notification permissions and push subscriptions
 *
 * @module @notify-kit/react
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { NotifyKitConfig, PushPayload, PermissionResult } from '@notify-kit/core';
import {
  initializeFirebase,
  requestFCMToken,
  setupForegroundMessages,
  buildFunctionUrl,
} from '@notify-kit/core';

/**
 * Hook return type
 */
export interface UseNotificationsReturn {
  /** Current notification permission status */
  permission: NotificationPermission;
  /** Whether push notifications are enabled */
  isPushEnabled: boolean;
  /** Whether an operation is in progress */
  isProcessing: boolean;
  /** Current status message (e.g., 'Subscribing...') */
  statusMessage: string | null;
  /** Request notification permission */
  requestPermission: () => Promise<PermissionResult>;
  /** Toggle push notifications on/off */
  togglePush: (enable: boolean) => Promise<boolean>;
  /** Sync a category subscription to backend */
  syncCategory: (categoryId: string, enabled: boolean) => Promise<void>;
  /** Set up foreground message handler */
  onForegroundMessage: (handler: (payload: PushPayload) => void) => void;
}

/**
 * Hook options
 */
export interface UseNotificationsOptions {
  /** Auto-initialize Firebase on mount */
  autoInitialize?: boolean;
  /** Local storage key for push enabled state */
  pushEnabledKey?: string;
  /** Local storage key for first enabled date */
  firstEnabledDateKey?: string;
  /** Cloud Function name for syncing preferences */
  syncFunctionName?: string;
  /** Cloud Function name for category subscription */
  categoryFunctionName?: string;
  /** Cloud Functions region */
  region?: string;
}

const defaultOptions: Required<UseNotificationsOptions> = {
  autoInitialize: true,
  pushEnabledKey: 'notifykit_pushEnabled',
  firstEnabledDateKey: 'notifykit_pushFirstEnabled',
  syncFunctionName: 'syncUserPreferences',
  categoryFunctionName: 'manageCategorySubscription',
  region: 'us-central1',
};

/**
 * React hook for managing notifications
 *
 * Provides a simple interface for:
 * - Requesting notification permission
 * - Enabling/disabling push notifications
 * - Syncing category preferences to backend
 * - Handling foreground messages
 *
 * @param config - NotifyKit configuration
 * @param options - Optional hook configuration
 * @returns Notification management functions and state
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const {
 *     permission,
 *     isPushEnabled,
 *     togglePush,
 *     syncCategory,
 *   } = useNotifications(notifyKitConfig);
 *
 *   return (
 *     <div>
 *       <p>Permission: {permission}</p>
 *       <button onClick={() => togglePush(!isPushEnabled)}>
 *         {isPushEnabled ? 'Disable' : 'Enable'} Notifications
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotifications(
  config: NotifyKitConfig,
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const opts = { ...defaultOptions, ...options };

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isPushEnabled, setIsPushEnabled] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem(opts.pushEnabledKey) === 'true'
      : false
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const foregroundHandlerRef = useRef<((payload: PushPayload) => void) | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Show status message temporarily
  const showStatus = useCallback((msg: string, duration = 3000) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), duration);
  }, []);

  // Initialize Firebase and check permission on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check current permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Auto-initialize Firebase
    if (opts.autoInitialize) {
      initializeFirebase(config.firebase).catch((err: unknown) => {
        console.error('[NotifyKit] Failed to initialize Firebase:', err);
      });
    }

    // Clean up foreground message listener on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [config.firebase, opts.autoInitialize]);

  // Set up foreground message handler when push is enabled
  useEffect(() => {
    if (!isPushEnabled || !foregroundHandlerRef.current) return;

    setupForegroundMessages((payload: PushPayload) => {
      if (foregroundHandlerRef.current) {
        foregroundHandlerRef.current(payload);
      }
    })
      .then((unsub: () => void) => {
        unsubscribeRef.current = unsub;
      })
      .catch((err: unknown) => {
        console.error('[NotifyKit] Failed to set up foreground messages:', err);
      });
  }, [isPushEnabled]);

  /**
   * Request notification permission from the browser
   */
  const requestPermission = useCallback(async (): Promise<PermissionResult> => {
    if (!('Notification' in window)) {
      return 'denied';
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
    return perm;
  }, []);

  /**
   * Toggle push notifications on/off
   */
  const togglePush = useCallback(
    async (enable: boolean): Promise<boolean> => {
      setIsProcessing(true);

      try {
        if (enable) {
          // Request permission if needed
          let perm: NotificationPermission = 'denied';
          if ('Notification' in window) {
            perm = Notification.permission;
            if (perm === 'default') {
              setStatusMessage('Checking Permission...');
              perm = await Notification.requestPermission();
            }
          }

          // iOS sometimes has a delay in permission propagation
          if (perm !== 'granted' && 'Notification' in window) {
            setStatusMessage('Initializing...');
            await new Promise((resolve) => setTimeout(resolve, 500));
            perm = Notification.permission;
          }

          setPermission(perm);

          if (perm !== 'granted') {
            const msg =
              perm === 'denied'
                ? 'Notifications blocked. Please enable in Device Settings.'
                : 'Notification permission not granted.';
            throw new Error(msg);
          }

          // Get FCM token
          setStatusMessage('Subscribing...');
          const token = await requestFCMToken(config.firebase.vapidKey);

          if (!token) {
            throw new Error('Failed to get notification token');
          }

          // Save enabled state
          localStorage.setItem(opts.pushEnabledKey, 'true');

          // Track first enable date (for first-day gap detection)
          if (!localStorage.getItem(opts.firstEnabledDateKey)) {
            localStorage.setItem(opts.firstEnabledDateKey, new Date().toISOString());
          }

          setIsPushEnabled(true);
          showStatus('Notifications Enabled');
          return true;
        } else {
          // Disable push
          setStatusMessage('Unsubscribing...');
          localStorage.setItem(opts.pushEnabledKey, 'false');
          setIsPushEnabled(false);
          showStatus('Notifications Disabled');
          return true;
        }
      } catch (err: any) {
        console.error('[NotifyKit] Failed to toggle push:', err);
        showStatus(err.message || 'An error occurred');
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [config.firebase.vapidKey, opts.pushEnabledKey, opts.firstEnabledDateKey, showStatus]
  );

  /**
   * Sync a category subscription to backend
   */
  const syncCategory = useCallback(
    async (categoryId: string, enabled: boolean): Promise<void> => {
      if (!isPushEnabled) return;

      setIsProcessing(true);
      setStatusMessage('Updating...');

      try {
        const token = await requestFCMToken(config.firebase.vapidKey);
        if (token) {
          const functionUrl = buildFunctionUrl(
            config.firebase.projectId,
            opts.categoryFunctionName,
            opts.region
          );

          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, categoryId, enabled }),
          });

          if (response.ok) {
            showStatus('Preferences Saved');
          } else {
            showStatus('Sync Failed');
          }
        }
      } catch (err) {
        console.error('[NotifyKit] Failed to sync category:', err);
        showStatus('Error Syncing');
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isPushEnabled,
      config.firebase.vapidKey,
      config.firebase.projectId,
      opts.categoryFunctionName,
      opts.region,
      showStatus,
    ]
  );

  /**
   * Register a handler for foreground messages
   */
  const onForegroundMessage = useCallback((handler: (payload: PushPayload) => void) => {
    foregroundHandlerRef.current = handler;
  }, []);

  return {
    permission,
    isPushEnabled,
    isProcessing,
    statusMessage,
    requestPermission,
    togglePush,
    syncCategory,
    onForegroundMessage,
  };
}
