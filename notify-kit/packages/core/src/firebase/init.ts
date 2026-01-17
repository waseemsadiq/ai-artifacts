/**
 * Firebase Initialization
 *
 * Initializes Firebase app and messaging for push notifications
 *
 * @module @notify-kit/core
 */

import type { FirebaseConfig } from '../types';

// Firebase SDK types (optional peer dependency)
type FirebaseApp = any;
type Messaging = any;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let initialized = false;

/**
 * Initialize Firebase with the given configuration
 *
 * This function should be called once at app startup.
 * It's safe to call multiple times - subsequent calls are no-ops.
 *
 * @param config - Firebase configuration
 * @returns Object with initialized app and messaging instances
 *
 * @example
 * ```typescript
 * import { initializeFirebase } from '@notify-kit/core';
 *
 * const { app, messaging } = await initializeFirebase({
 *   apiKey: 'xxx',
 *   authDomain: 'xxx.firebaseapp.com',
 *   // ... rest of config
 * });
 * ```
 */
export async function initializeFirebase(config: FirebaseConfig): Promise<{
  app: FirebaseApp | null;
  messaging: Messaging | null;
}> {
  if (initialized) {
    return { app, messaging };
  }

  // Validate configuration
  const requiredKeys: (keyof FirebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
    'vapidKey',
  ];

  const missingKeys = requiredKeys.filter((key) => !config[key]);
  if (missingKeys.length > 0) {
    console.error('[NotifyKit] Missing Firebase config keys:', missingKeys);
    throw new Error(`Missing Firebase config keys: ${missingKeys.join(', ')}`);
  }

  try {
    // Dynamic import of Firebase SDK (allows tree-shaking if not used)
    const { initializeApp } = await import('firebase/app');
    const { getMessaging } = await import('firebase/messaging');

    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    };

    app = initializeApp(firebaseConfig);
    console.log('[NotifyKit] Firebase app initialized');

    // Only initialize messaging in browser environment
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      messaging = getMessaging(app);
      console.log('[NotifyKit] Firebase messaging initialized');
    }

    initialized = true;
  } catch (error) {
    console.error('[NotifyKit] Firebase initialization failed:', error);
    throw error;
  }

  return { app, messaging };
}

/**
 * Get the initialized Firebase app
 *
 * @returns Firebase app instance or null if not initialized
 */
export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

/**
 * Get the initialized Firebase messaging
 *
 * @returns Firebase messaging instance or null if not initialized
 */
export function getFirebaseMessaging(): Messaging | null {
  return messaging;
}

/**
 * Check if Firebase has been initialized
 *
 * @returns True if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return initialized;
}
