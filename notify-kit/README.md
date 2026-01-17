# NotifyKit

A production-ready, dual-path notification system for Progressive Web Apps (PWAs) that combines Firebase Cloud Messaging (FCM) with device-based fallback notifications for maximum reliability.

## Why NotifyKit?

Push notifications on the web are unreliable. Network issues, browser restrictions, and service disruptions can cause FCM to fail. NotifyKit solves this with a **dual-path architecture**:

1. **Primary Path**: Firebase Cloud Messaging (FCM) for server-triggered push notifications
2. **Fallback Path**: IndexedDB-based device notifications that work offline

When a push notification arrives, it automatically cancels the corresponding device notification to prevent duplicates. If push fails, the device notification still fires. Users never miss important alerts.

## Features

- **Dual-path reliability**: FCM push + device notification fallback
- **iOS-safe patterns**: Battle-tested workarounds for Safari quirks
- **Category-based preferences**: Users control which notifications they receive
- **Template-based content**: Customizable notification titles and bodies
- **Offline-first**: Full-year data caching, works without network
- **Cloud Functions ready**: Scheduled notifications via Google Cloud Tasks
- **React hooks**: Simple integration with `useNotifications` hook
- **TypeScript first**: Full type safety throughout

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Your App                              │
│  ┌─────────────────┐    ┌─────────────────┐                  │
│  │ @notify-kit/    │    │ @notify-kit/    │                  │
│  │ react           │───▶│ core            │                  │
│  │ (useNotifications)   │ (types, utils)  │                  │
│  └────────┬────────┘    └────────┬────────┘                  │
└───────────│──────────────────────│───────────────────────────┘
            │                      │
            ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    Service Worker                             │
│  ┌─────────────────┐    ┌─────────────────┐                  │
│  │ FCM Background  │    │ IndexedDB       │                  │
│  │ Handler         │───▶│ Notification    │                  │
│  │                 │    │ Checker         │                  │
│  └─────────────────┘    └─────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
            │                      │
            ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    Cloud Functions                            │
│  ┌─────────────────┐    ┌─────────────────┐                  │
│  │ Daily Scheduler │───▶│ Cloud Tasks     │                  │
│  │ (1 AM)          │    │ Queue           │                  │
│  └─────────────────┘    └────────┬────────┘                  │
│                                  │                            │
│  ┌─────────────────┐    ◀────────┘                           │
│  │ Notification    │                                          │
│  │ Sender          │───▶ FCM ───▶ User Device                │
│  └─────────────────┘                                          │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install packages

```bash
npm install @notify-kit/core @notify-kit/react
```

### 2. Copy templates

```bash
# Copy service worker template
cp node_modules/notify-kit/templates/service-worker/sw.template.js public/

# Copy cloud functions (if using backend scheduling)
cp -r node_modules/notify-kit/templates/cloud-functions ./functions
```

### 3. Create configuration

```typescript
// notify-kit.config.ts
import type { NotifyKitConfig } from '@notify-kit/core';

export const notifyKitConfig: NotifyKitConfig = {
  firebase: {
    apiKey: process.env.VITE_FIREBASE_API_KEY!,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.VITE_FIREBASE_APP_ID!,
    vapidKey: process.env.VITE_FIREBASE_VAPID_KEY!,
  },
  categories: [
    {
      id: 'reminder',
      name: 'Reminders',
      titleTemplate: '{{name}}',
      bodyTemplate: '{{name}} in {{offset}} minutes',
      defaultEnabled: true,
      allowOffset: true,
      offsetOptions: [0, 5, 15, 30],
    },
  ],
  eventSource: { type: 'api', apiUrl: 'https://api.example.com/events' },
  scheduling: { cronExpression: '0 1 * * *', timezone: 'Europe/London' },
  storage: { dbName: 'my-notifications', firestoreCollection: 'users' },
  branding: { icon: '/icon-192.png', appUrl: '/' },
};
```

### 4. Add build script

```json
{
  "scripts": {
    "generate-sw": "node scripts/generate-sw.js",
    "build": "npm run generate-sw && vite build"
  }
}
```

### 5. Use in React

```tsx
import { useNotifications } from '@notify-kit/react';
import { notifyKitConfig } from './notify-kit.config';

function NotificationSettings() {
  const {
    permission,
    isPushEnabled,
    isProcessing,
    statusMessage,
    togglePush,
    syncCategory,
  } = useNotifications(notifyKitConfig);

  return (
    <div>
      <p>Permission: {permission}</p>
      <p>Push: {isPushEnabled ? 'Enabled' : 'Disabled'}</p>

      <button
        onClick={() => togglePush(!isPushEnabled)}
        disabled={isProcessing}
      >
        {isPushEnabled ? 'Disable' : 'Enable'} Notifications
      </button>

      {statusMessage && <p>{statusMessage}</p>}
    </div>
  );
}
```

### 6. Deploy Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

## Packages

### @notify-kit/core

Core utilities and types for the notification system.

```typescript
import {
  // Types
  type NotifyKitConfig,
  type ScheduledNotification,
  type UserPreferences,

  // IndexedDB store
  createNotificationStore,

  // Firebase
  initializeFirebase,
  requestFCMToken,
  setupForegroundMessages,

  // Utilities
  renderTemplate,
  parseTime,
  formatTime,
} from '@notify-kit/core';
```

### @notify-kit/react

React hooks for notification management.

```typescript
import { useNotifications } from '@notify-kit/react';

const {
  permission,        // 'default' | 'granted' | 'denied'
  isPushEnabled,     // boolean
  isProcessing,      // boolean
  statusMessage,     // string | null
  togglePush,        // (enable: boolean) => Promise<boolean>
  syncCategory,      // (id: string, enabled: boolean) => Promise<void>
  onForegroundMessage, // (handler) => void
} = useNotifications(config);
```

## Templates

### Service Worker (`templates/service-worker/`)

- `sw.template.js` - Full PWA with FCM and device fallback
- `firebase-messaging-sw.template.js` - FCM only (simpler)

### Cloud Functions (`templates/cloud-functions/`)

- `src/index.ts` - Main function exports
- `src/scheduler.ts` - Daily notification scheduler
- `src/sender.ts` - FCM notification sender
- `src/storage.ts` - Firestore user preferences

### Configuration (`templates/config/`)

- `notify-kit.config.example.ts` - Example configuration file

## Critical Patterns

These patterns are battle-tested from production use. Breaking them will cause bugs.

### 1. Always use `registration.showNotification()`

Never use the browser `Notification` API directly in service workers:

```javascript
// CORRECT
await self.registration.showNotification(title, options);

// WRONG - will fail on iOS
new Notification(title, options);
```

### 2. Return promises from SW handlers

iOS requires promises to be returned for proper handling:

```javascript
messaging.onBackgroundMessage((payload) => {
  // CRITICAL: Return the promise
  return self.registration.showNotification(title, options);
});
```

### 3. Check device notifications on fetch events

iOS wakes service workers for network requests. Use this opportunity:

```javascript
self.addEventListener("fetch", (event) => {
  event.waitUntil(checkAndShowDeviceNotifications());
});
```

### 4. Cancel device notifications when push arrives

Prevent duplicates from both paths:

```javascript
// In push handler
cancelDeviceNotification(notificationId);
```

### 5. Handle token invalidation

Remove stale FCM tokens from Firestore when send fails:

```javascript
if (error.code === 'messaging/registration-token-not-registered') {
  await deleteUser(fcmToken);
}
```

## Configuration Reference

### NotifyKitConfig

| Property | Type | Description |
|----------|------|-------------|
| `firebase` | `FirebaseConfig` | Firebase project credentials |
| `categories` | `NotificationCategory[]` | Notification types |
| `eventSource` | `EventSourceConfig` | How to fetch schedulable events |
| `scheduling` | `SchedulingConfig` | Cron schedule and timezone |
| `storage` | `StorageConfig` | IndexedDB and Firestore names |
| `branding` | `BrandingConfig` | Icons and app URL |

### NotificationCategory

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Human-readable name |
| `titleTemplate` | `string` | Title with `{{placeholders}}` |
| `bodyTemplate` | `string` | Body with `{{placeholders}}` |
| `defaultEnabled` | `boolean` | Default state for new users |
| `allowOffset` | `boolean` | Allow "X mins before" |
| `offsetOptions` | `number[]` | Available offset values |

## Examples

See the `examples/` directory for complete working examples:

- `basic-react/` - React app with full notification flow

## Troubleshooting

### Notifications not appearing

1. Check browser permission: Settings > Privacy > Notifications
2. Verify Firebase config is correct (check console for errors)
3. Ensure service worker is registered: DevTools > Application > Service Workers
4. Check FCM token is being saved to Firestore

### Service worker not updating

1. Bump version in config to force cache invalidation
2. DevTools > Application > Service Workers > Update
3. Clear storage: DevTools > Application > Clear storage

### iOS-specific issues

1. Notifications require user interaction first (can't auto-enable)
2. Background notifications may be delayed up to 15 minutes
3. Use the fetch event polling pattern for more reliable timing

### Cloud Functions errors

1. Verify Cloud Tasks API is enabled
2. Check queue exists: `gcloud tasks queues list`
3. Review function logs: `firebase functions:log`

## Migration from Direct Implementation

If you're moving from a direct implementation (like the Lanarkshire Mosque app):

1. Replace hardcoded prayer names with category IDs
2. Replace `mosque-notifications` DB name with configured value
3. Update Cloud Functions to use factory functions
4. Replace direct localStorage access with hook state

See the original implementation in `MIGRATION.md` for detailed mapping.

## Browser Support

| Browser | Push | Device Fallback | Install Prompt |
|---------|------|-----------------|----------------|
| Chrome 90+ | Yes | Yes | Yes |
| Firefox 88+ | Yes | Yes | No |
| Safari 14+ | Limited | Yes | No |
| Edge 90+ | Yes | Yes | Yes |
| Chrome Android | Yes | Yes | Yes |
| Safari iOS 14+ | Limited | Yes | Manual install |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Extracted from the [Lanarkshire Mosque Prayer Times PWA](https://github.com/waseemsadiq/lanarkshire-mosque-app), battle-tested in production with thousands of daily notifications.
