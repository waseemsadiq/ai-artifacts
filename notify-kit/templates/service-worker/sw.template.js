/**
 * NotifyKit Service Worker Template
 *
 * This template provides:
 * - Firebase Cloud Messaging (FCM) for push notifications
 * - IndexedDB-based device notification fallback
 * - PWA caching and offline support
 *
 * Placeholders (replaced at build time):
 * - __FIREBASE_API_KEY__
 * - __FIREBASE_AUTH_DOMAIN__
 * - __FIREBASE_PROJECT_ID__
 * - __FIREBASE_STORAGE_BUCKET__
 * - __FIREBASE_MESSAGING_SENDER_ID__
 * - __FIREBASE_APP_ID__
 * - __DB_NAME__ (IndexedDB database name)
 * - __CACHE_NAME__ (Service worker cache name)
 * - __APP_ICON__ (Notification icon path)
 * - __APP_URL__ (App URL for notification clicks)
 *
 * @version 1.0.0
 */

// Firebase SDK imports
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);
// IndexedDB library for device notification fallback
importScripts("https://cdn.jsdelivr.net/npm/idb@7/build/umd.js");

// Firebase configuration (injected at build time)
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
};

// NotifyKit configuration
const DB_NAME = "__DB_NAME__";
const CACHE_NAME = "__CACHE_NAME__";
const APP_ICON = "__APP_ICON__";
const APP_URL = "__APP_URL__";

// ============================================================================
// DEVICE NOTIFICATION FALLBACK (IndexedDB-based)
// ============================================================================

/**
 * Check IndexedDB for pending device notifications and show them
 * Called on SW activation and periodically during fetch events
 *
 * CRITICAL: This provides reliability when push notifications fail
 */
async function checkAndShowDeviceNotifications() {
  try {
    const db = await idb.openDB(DB_NAME, 1);
    const now = Date.now();

    // Get all scheduled notifications
    let all;
    try {
      all = await db.getAllFromIndex("scheduled", "by-time");
    } catch (e) {
      // Index might not exist if DB was just created
      all = await db.getAll("scheduled");
    }

    // Filter for pending notifications within the valid window
    const pending = all.filter(
      (n) =>
        !n.delivered &&
        n.notificationTime <= now &&
        n.notificationTime > now - 30 * 60 * 1000 // Within last 30 mins
    );

    for (const notification of pending) {
      console.log("[NotifyKit SW] Showing device notification:", notification.eventName);

      // CRITICAL: Always use registration.showNotification() - never browser Notification API
      await self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: APP_ICON,
        badge: APP_ICON,
        tag: notification.id,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          categoryId: notification.categoryId,
          eventName: notification.eventName,
          type: "device_notification",
          url: APP_URL,
        },
      });

      // Mark as delivered to prevent duplicate notifications
      const tx = db.transaction("scheduled", "readwrite");
      notification.delivered = true;
      await tx.store.put(notification);
      await tx.done;
    }

    if (pending.length > 0) {
      console.log(`[NotifyKit SW] Delivered ${pending.length} device notifications`);
    }
  } catch (error) {
    // Silently fail if IndexedDB is not available or DB doesn't exist yet
    if (error.name !== "NotFoundError") {
      console.error("[NotifyKit SW] Failed to check device notifications:", error);
    }
  }
}

/**
 * Cancel a device notification when a push notification arrives
 * Prevents duplicate notifications from both paths
 */
async function cancelDeviceNotification(id) {
  try {
    const db = await idb.openDB(DB_NAME, 1);
    const notification = await db.get("scheduled", id);
    if (notification && !notification.delivered) {
      notification.delivered = true;
      await db.put("scheduled", notification);
      console.log("[NotifyKit SW] Cancelled device notification:", id);
    }
  } catch (error) {
    console.error("[NotifyKit SW] Failed to cancel device notification:", error);
  }
}

// ============================================================================
// FIREBASE CLOUD MESSAGING
// ============================================================================

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background push notifications
  messaging.onBackgroundMessage((payload) => {
    console.log("[NotifyKit SW] Push notification received:", payload.data?.eventName || "unknown");

    const categoryId = payload.data?.categoryId || "default";
    const eventName = payload.data?.eventName || "Event";
    const minutesBefore = parseInt(payload.data?.minutesBefore || "0", 10);
    const timeStr = payload.data?.timeStr || "";

    // Build notification content
    const title = payload.data?.title || eventName;
    const body =
      payload.data?.body ||
      (minutesBefore === 0
        ? `It is time for ${eventName}${timeStr ? ` (${timeStr})` : ""}`
        : `Upcoming: ${eventName} in ${minutesBefore} minutes${timeStr ? ` (${timeStr})` : ""}`);

    // Cancel any pending device notification to prevent duplicates
    const today = new Date().toDateString();
    const notificationId = `${categoryId}_${eventName}_${today}`;
    cancelDeviceNotification(notificationId);

    // CRITICAL: Return the promise from showNotification (required for iOS)
    return self.registration.showNotification(title, {
      body: body,
      icon: APP_ICON,
      badge: APP_ICON,
      tag: notificationId,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        ...payload.data,
        type: "push_notification",
        url: APP_URL,
      },
    });
  });
} catch (err) {
  console.error("[NotifyKit SW] Failed to initialize Firebase:", err);
}

// ============================================================================
// PWA CACHING & OFFLINE SUPPORT
// ============================================================================

const DATA_CACHE_NAME = `${CACHE_NAME}-data`;

// Static assets to pre-cache (customize for your app)
const STATIC_ASSETS = [
  "./",
  "./index.html",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[NotifyKit SW] Pre-caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
      // Take control of all pages
      self.clients.claim(),
      // Check for pending device notifications on SW activation
      checkAndShowDeviceNotifications(),
    ])
  );
});

/**
 * Network First strategy with Cache Update
 */
async function networkFirstWithCache(request, cacheName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const networkResponse = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    console.log("[NotifyKit SW] Network failed, trying cache...");
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    throw error;
  }
}

/**
 * Stale While Revalidate strategy
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (
      networkResponse &&
      networkResponse.status === 200 &&
      networkResponse.type !== "error"
    ) {
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseToCache);
      });
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// Check for device notifications periodically on fetch events
// iOS wakes SW for network requests, so we use this opportunity
let lastNotificationCheck = 0;
const NOTIFICATION_CHECK_INTERVAL = 60 * 1000; // Check every 60 seconds max

self.addEventListener("fetch", (event) => {
  // Periodically check for pending device notifications
  const now = Date.now();
  if (now - lastNotificationCheck > NOTIFICATION_CHECK_INTERVAL) {
    lastNotificationCheck = now;
    event.waitUntil(checkAndShowDeviceNotifications());
  }

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Navigation requests - Network with cache fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets - Stale While Revalidate
  const isSameOrigin = url.origin === self.location.origin;
  const isAsset = url.pathname.match(
    /\.(js|jsx|ts|tsx|css|png|jpg|jpeg|svg|json|ico)$/i
  );

  if (isSameOrigin && isAsset) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================================================
// NOTIFICATION CLICK HANDLING
// ============================================================================

self.addEventListener("notificationclick", (event) => {
  console.log("[NotifyKit SW] Notification clicked");
  event.notification.close();

  // Handle dismiss action
  if (event.action === "dismiss") {
    console.log("[NotifyKit SW] Notification dismissed");
    return;
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            console.log("[NotifyKit SW] Focusing existing window");
            return client.focus();
          }
        }
        if (clients.openWindow) {
          console.log("[NotifyKit SW] Opening new window");
          return clients.openWindow(event.notification.data?.url || APP_URL);
        }
      })
  );
});
