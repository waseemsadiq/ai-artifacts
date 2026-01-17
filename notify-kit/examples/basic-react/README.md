# NotifyKit Basic React Example

A complete example demonstrating the NotifyKit dual-path notification system with React.

## Features Demonstrated

- Push notification permission request
- FCM token registration
- Category-based notification preferences
- Service worker with push and device fallback
- Foreground message handling
- Offline-ready PWA

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

Copy `.env.example` to `.env` and fill in your Firebase configuration:

```bash
cp .env.example .env
```

Get your Firebase config from the [Firebase Console](https://console.firebase.google.com/):
1. Go to Project Settings > Your apps
2. Copy the config values to `.env`
3. For VAPID key: Go to Cloud Messaging tab > Web configuration

### 3. Generate service worker

```bash
npm run generate-sw
```

### 4. Start development server

```bash
npm run dev
```

### 5. Deploy Cloud Functions (optional)

For full push notification support, deploy the Cloud Functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

## Project Structure

```
basic-react/
├── src/
│   ├── main.tsx              # Entry point with SW registration
│   ├── App.tsx               # Main app component
│   ├── index.css             # Styles
│   └── notify-kit.config.ts  # NotifyKit configuration
├── public/
│   ├── manifest.json         # PWA manifest
│   └── sw.template.js        # Service worker template (copied)
├── scripts/
│   └── generate-sw.js        # SW template processor
├── functions/                 # Cloud Functions (optional)
└── .env.example              # Environment template
```

## Configuration

The `notify-kit.config.ts` file defines:

- **Firebase config**: Your Firebase project credentials
- **Categories**: Types of notifications your app sends
- **Branding**: Icon and URL for notifications
- **Storage**: IndexedDB and Firestore collection names

## How It Works

### 1. User enables notifications

The app requests notification permission and registers an FCM token.

### 2. Token is stored

The FCM token is saved to localStorage and synced to Firestore (if Cloud Functions are deployed).

### 3. Category preferences

Users can toggle notification categories on/off. Preferences are stored locally and synced to the backend.

### 4. Push notifications arrive

When a push notification arrives:
- **Background**: Service worker shows notification
- **Foreground**: App can handle inline or show notification

### 5. Device fallback

If push fails, the service worker checks IndexedDB for scheduled device notifications and shows them.

## Testing Notifications

### Test push notification

Deploy the Cloud Functions and use the test endpoint:

```bash
curl -X POST \
  https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/sendTestPush \
  -H 'Content-Type: application/json' \
  -d '{"token": "YOUR_FCM_TOKEN"}'
```

### Test device fallback

1. Enable notifications in the app
2. Open DevTools > Application > Service Workers
3. Click "Push" to simulate a push message
4. Or use IndexedDB tab to add a scheduled notification

## Troubleshooting

### Permission denied

If notifications are blocked:
1. Click the lock icon in the address bar
2. Set Notifications to "Allow"
3. Refresh the page

### Service worker not updating

1. Check DevTools > Application > Service Workers
2. Click "Update" or "Unregister" and refresh
3. Clear cache: DevTools > Application > Clear storage

### Push not working

1. Verify Firebase config is correct
2. Check Console for errors
3. Ensure Cloud Functions are deployed
4. Verify VAPID key matches Firebase project

## Learn More

- [NotifyKit Documentation](../../README.md)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications](https://web.dev/push-notifications-overview/)
