/**
 * Firebase Cloud Messaging (FCM) Utilities
 *
 * Handles FCM token management and push notification setup
 *
 * @module @notify-kit/core
 */

import type { PushPayload } from '../types';
import { getFirebaseMessaging, isFirebaseInitialized } from './init';

/**
 * Request an FCM token for push notifications
 *
 * This function will:
 * 1. Wait for the service worker to be ready
 * 2. Request an FCM token from Firebase
 * 3. Return the token for storage/sync with backend
 *
 * @param vapidKey - VAPID key for web push
 * @returns FCM token or null if unavailable
 *
 * @example
 * ```typescript
 * const token = await requestFCMToken('YOUR_VAPID_KEY');
 * if (token) {
 *   await syncTokenToBackend(token);
 * }
 * ```
 */
export async function requestFCMToken(vapidKey: string): Promise<string | null> {
  if (!isFirebaseInitialized()) {
    throw new Error('[NotifyKit] Firebase not initialized. Call initializeFirebase first.');
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    throw new Error('[NotifyKit] Messaging not available');
  }

  // Validate VAPID key
  if (!vapidKey) {
    throw new Error('[NotifyKit] VAPID key is required');
  }

  // Clean key just in case
  const cleanKey = vapidKey.trim().replace(/["']/g, '');

  if (!('serviceWorker' in navigator)) {
    throw new Error('[NotifyKit] Service Workers not supported');
  }

  try {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;

    // Dynamic import to avoid bundling if not used
    const { getToken } = await import('firebase/messaging');

    const token = await getToken(messaging, {
      vapidKey: cleanKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('[NotifyKit] FCM token obtained');
      return token;
    } else {
      throw new Error('[NotifyKit] No registration token available');
    }
  } catch (error: any) {
    console.error('[NotifyKit] Error retrieving FCM token:', error);
    throw new Error(error.message || 'Failed to retrieve FCM token');
  }
}

/**
 * Set up foreground message handling
 *
 * When the app is in the foreground, push messages are handled by this listener
 * instead of the service worker. You should typically show a notification or
 * update UI state when a message arrives.
 *
 * @param onMessage - Callback for handling foreground messages
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = await setupForegroundMessages((payload) => {
 *   console.log('Message received:', payload);
 *   // Show notification or update UI
 * });
 *
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export async function setupForegroundMessages(
  onMessage: (payload: PushPayload) => void
): Promise<() => void> {
  if (!isFirebaseInitialized()) {
    throw new Error('[NotifyKit] Firebase not initialized');
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    throw new Error('[NotifyKit] Messaging not available');
  }

  const { onMessage: firebaseOnMessage } = await import('firebase/messaging');

  return firebaseOnMessage(messaging, (payload: PushPayload) => {
    console.log('[NotifyKit] Foreground message received:', payload);
    onMessage(payload);
  });
}

/**
 * Send a test notification via a Cloud Function endpoint
 *
 * Useful for verifying push notification setup works correctly.
 *
 * @param token - FCM token to send test to
 * @param functionUrl - URL of the test push Cloud Function
 * @returns True if test notification was sent successfully
 *
 * @example
 * ```typescript
 * const success = await sendTestNotification(
 *   token,
 *   'https://us-central1-my-project.cloudfunctions.net/sendTestPush'
 * );
 * ```
 */
export async function sendTestNotification(
  token: string,
  functionUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    return response.ok;
  } catch (error) {
    console.error('[NotifyKit] Failed to send test notification:', error);
    return false;
  }
}

/**
 * Build the Cloud Functions URL for a given function name
 *
 * @param projectId - Firebase project ID
 * @param functionName - Name of the Cloud Function
 * @param region - Region of the Cloud Function (default: us-central1)
 * @returns Full URL of the Cloud Function
 */
export function buildFunctionUrl(
  projectId: string,
  functionName: string,
  region: string = 'us-central1'
): string {
  return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
}

/**
 * Sync user preferences to backend
 *
 * @param token - FCM token
 * @param preferences - User preferences object
 * @param functionUrl - URL of the sync preferences Cloud Function
 * @returns True if sync was successful
 */
export async function syncPreferencesToBackend(
  token: string,
  preferences: Record<string, unknown>,
  functionUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, preferences }),
    });

    if (response.ok) {
      console.log('[NotifyKit] Preferences synced to backend');
      return true;
    } else {
      console.error('[NotifyKit] Failed to sync preferences:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[NotifyKit] Error syncing preferences:', error);
    return false;
  }
}
