# NotifyKit Service Worker Templates

This directory contains service worker templates for the NotifyKit dual-path notification system.

## Templates

### `sw.template.js` (Full PWA + Device Fallback)

The complete service worker with:
- Firebase Cloud Messaging for push notifications
- IndexedDB-based device notification fallback
- PWA caching and offline support
- Stale-while-revalidate caching strategy

**Use this when:** You need reliable notifications even when push fails, plus offline support.

### `firebase-messaging-sw.template.js` (FCM Only)

A simpler service worker with:
- Firebase Cloud Messaging for push notifications
- Notification click handling

**Use this when:** You only need basic push notifications without fallback or offline support.

## Placeholders

Both templates use placeholders that are replaced at build time:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `__FIREBASE_API_KEY__` | Firebase API key | `AIzaSy...` |
| `__FIREBASE_AUTH_DOMAIN__` | Firebase auth domain | `myapp.firebaseapp.com` |
| `__FIREBASE_PROJECT_ID__` | Firebase project ID | `my-project` |
| `__FIREBASE_STORAGE_BUCKET__` | Firebase storage bucket | `myapp.appspot.com` |
| `__FIREBASE_MESSAGING_SENDER_ID__` | FCM sender ID | `123456789` |
| `__FIREBASE_APP_ID__` | Firebase app ID | `1:123:web:abc` |
| `__DB_NAME__` | IndexedDB name (full template only) | `my-notifications` |
| `__CACHE_NAME__` | Cache name for PWA | `myapp-v1.0.0` |
| `__APP_ICON__` | Notification icon path | `/icon-192.png` |
| `__APP_URL__` | App URL for notification clicks | `/` |

## Integration

### 1. Copy the template

```bash
cp sw.template.js public/sw.template.js
```

### 2. Create a build script

Create `scripts/generate-sw.js`:

```javascript
import { readFileSync, writeFileSync } from 'fs';
import { config } from 'dotenv';

config();

let template = readFileSync('public/sw.template.js', 'utf-8');

// Replace placeholders
template = template
  .replace('__FIREBASE_API_KEY__', process.env.FIREBASE_API_KEY || '')
  .replace('__FIREBASE_AUTH_DOMAIN__', process.env.FIREBASE_AUTH_DOMAIN || '')
  .replace('__FIREBASE_PROJECT_ID__', process.env.FIREBASE_PROJECT_ID || '')
  .replace('__FIREBASE_STORAGE_BUCKET__', process.env.FIREBASE_STORAGE_BUCKET || '')
  .replace('__FIREBASE_MESSAGING_SENDER_ID__', process.env.FIREBASE_MESSAGING_SENDER_ID || '')
  .replace('__FIREBASE_APP_ID__', process.env.FIREBASE_APP_ID || '')
  .replace('__DB_NAME__', 'my-notifications')
  .replace('__CACHE_NAME__', `myapp-v${Date.now()}`)
  .replace(/__APP_ICON__/g, '/icon-192.png')
  .replace(/__APP_URL__/g, '/');

writeFileSync('public/firebase-messaging-sw.js', template);
console.log('Service worker generated!');
```

### 3. Add to package.json

```json
{
  "scripts": {
    "generate-sw": "node scripts/generate-sw.js",
    "build": "npm run generate-sw && vite build"
  }
}
```

### 4. Register the service worker

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('SW registered:', registration);
    })
    .catch((error) => {
      console.error('SW registration failed:', error);
    });
}
```

## Critical Patterns

### Always use `registration.showNotification()`

Never use the browser `Notification` API directly. The service worker registration ensures proper background handling and iOS compatibility.

```javascript
// CORRECT
await self.registration.showNotification(title, options);

// WRONG - will fail in background on iOS
new Notification(title, options);
```

### Return the promise from `onBackgroundMessage`

For iOS reliability, always return the promise from `showNotification`:

```javascript
messaging.onBackgroundMessage((payload) => {
  // CRITICAL: Return the promise
  return self.registration.showNotification(title, options);
});
```

### Check for device notifications on fetch events

iOS wakes the service worker for network requests. Use this opportunity to check for pending device notifications:

```javascript
self.addEventListener("fetch", (event) => {
  event.waitUntil(checkAndShowDeviceNotifications());
});
```

## Troubleshooting

### Notifications not appearing

1. Check browser notification permissions
2. Verify Firebase config is correct
3. Check console for errors in SW DevTools
4. Ensure service worker is registered

### Service worker not updating

1. Bump the cache name (e.g., `myapp-v1.0.1`)
2. Clear browser cache
3. Hard refresh (Cmd+Shift+R)
4. Unregister and re-register SW

### IndexedDB errors

1. Check DB name matches between app and SW
2. Verify DB version is correct
3. Clear site data and try again

## Version Management

Include version in your cache name to force updates:

```javascript
const CACHE_NAME = `myapp-v${process.env.npm_package_version}`;
```

Or use a timestamp for development:

```javascript
const CACHE_NAME = `myapp-v${Date.now()}`;
```
