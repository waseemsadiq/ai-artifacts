/**
 * Firebase Messaging Service Worker Template
 *
 * A simpler service worker for projects that only need FCM push notifications
 * without the full PWA caching or device notification fallback.
 *
 * Placeholders (replaced at build time):
 * - __FIREBASE_API_KEY__
 * - __FIREBASE_AUTH_DOMAIN__
 * - __FIREBASE_PROJECT_ID__
 * - __FIREBASE_STORAGE_BUCKET__
 * - __FIREBASE_MESSAGING_SENDER_ID__
 * - __FIREBASE_APP_ID__
 * - __APP_ICON__ (Notification icon path)
 * - __APP_URL__ (App URL for notification clicks)
 *
 * @version 1.0.0
 */

// Firebase SDK imports
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Firebase configuration (injected at build time)
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__"
};

const APP_ICON = "__APP_ICON__";
const APP_URL = "__APP_URL__";

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[NotifyKit SW] Received background message:', payload);

    const title = payload.notification?.title || payload.data?.title || 'Notification';
    const body = payload.notification?.body || payload.data?.body || '';
    const tag = payload.data?.tag || 'default';

    // CRITICAL for iOS: Return the promise from showNotification
    return self.registration.showNotification(title, {
      body: body,
      icon: APP_ICON,
      badge: APP_ICON,
      tag: tag,
      data: {
        ...payload.data,
        url: APP_URL
      }
    });
  });
} catch (err) {
  console.error("[NotifyKit SW] Failed to initialize Firebase:", err);
}

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data?.url || APP_URL);
        }
      })
  );
});
