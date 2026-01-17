# NotifyKit Cloud Functions

This directory contains Cloud Functions templates for the NotifyKit dual-path notification system.

## Overview

The Cloud Functions provide:

1. **User Preferences Sync** - Store user notification preferences in Firestore
2. **Category Subscription** - Toggle individual notification categories
3. **Notification Sender** - Send FCM push notifications
4. **Daily Scheduler** - Schedule notifications via Cloud Tasks

## Prerequisites

1. **Firebase Project** with Blaze plan (required for Cloud Functions)
2. **Cloud Tasks API** enabled in Google Cloud Console
3. **Cloud Tasks Queue** created for notification scheduling

## Setup

### 1. Copy to your project

```bash
cp -r templates/cloud-functions ./functions
cd functions
npm install
```

### 2. Enable Cloud Tasks API

```bash
gcloud services enable cloudtasks.googleapis.com --project=YOUR_PROJECT_ID
```

### 3. Create Cloud Tasks Queue

```bash
gcloud tasks queues create notifications --location=us-central1
```

### 4. Configure your project

Edit `src/index.ts` and update:

```typescript
const PROJECT_ID = "your-project-id";
const LOCATION = "us-central1";
const QUEUE_NAME = "notifications";
const EVENT_API_URL = "https://your-api.com/events";
```

### 5. Implement your event source

Replace the placeholder `eventSource` with your actual implementation:

```typescript
const eventSource: EventSource = {
  async getEventsForDate(date: Date): Promise<SchedulableEvent[]> {
    const response = await fetch(`${EVENT_API_URL}?date=${date.toISOString()}`);
    const data = await response.json();

    return data.events.map((event: any) => ({
      id: event.id,
      categoryId: event.type,
      name: event.name,
      time: new Date(event.startTime),
      secondaryTime: event.endTime ? new Date(event.endTime) : undefined,
    }));
  },
};
```

### 6. Deploy

```bash
firebase deploy --only functions
```

## Functions Reference

### syncUserPreferences

Stores user notification preferences in Firestore.

```http
POST /syncUserPreferences
Content-Type: application/json

{
  "token": "fcm-token-here",
  "preferences": {
    "notificationReference": "primary",
    "minutesBefore": 15,
    "categories": {
      "reminder": true,
      "alert": false
    }
  },
  "dateOverrides": {
    "Sat Jan 20 2024": {
      "reminder": false
    }
  }
}
```

### manageCategorySubscription

Toggle a specific category for a user.

```http
POST /manageCategorySubscription
Content-Type: application/json

{
  "token": "fcm-token-here",
  "categoryId": "reminder",
  "enabled": true
}
```

### sendUserNotification

Called by Cloud Tasks to send a notification. Not typically called directly.

```http
POST /sendUserNotification
Content-Type: application/json

{
  "fcmToken": "fcm-token-here",
  "categoryId": "reminder",
  "eventName": "Meeting",
  "timeStr": "2:00 PM",
  "minutesBefore": 15
}
```

### sendTestPush

Send a test notification to verify setup.

```http
POST /sendTestPush
Content-Type: application/json

{
  "token": "fcm-token-here"
}
```

### scheduleDailyNotifications

Runs automatically at configured schedule (default: 1 AM daily).

No HTTP endpoint - triggered by Cloud Scheduler.

## Firestore Schema

### users collection

```typescript
{
  fcmToken: string,
  lastUpdated: Timestamp,
  preferences: {
    notificationReference: "primary" | "secondary",
    minutesBefore: number,
    categories: {
      [categoryId: string]: boolean
    }
  },
  dateSpecificOverrides: {
    [dateString: string]: {
      [categoryId: string]: boolean
    }
  }
}
```

### mail collection (for alerts)

If using Firebase Trigger Email extension:

```typescript
{
  to: string,
  message: {
    subject: string,
    html: string
  },
  timestamp: Timestamp
}
```

## Alert Emails

To receive alert emails when the scheduler fails:

1. Install the [Firebase Trigger Email](https://extensions.dev/extensions/firebase/firestore-send-email) extension
2. Set the alert email environment variable:

```bash
firebase functions:config:set alert.email="admin@example.com"
```

## Monitoring

### View function logs

```bash
firebase functions:log
```

### List scheduled tasks

```bash
gcloud tasks list --queue=notifications --location=us-central1
```

### Manually run scheduler

For testing, you can trigger the scheduler manually:

```bash
firebase functions:shell
> scheduleDailyNotifications()
```

## Token Cleanup

Invalid FCM tokens are automatically cleaned up when:

1. `messaging/registration-token-not-registered` error occurs
2. `messaging/invalid-registration-token` error occurs

The sender will delete the user document from Firestore.

## Scaling Considerations

- **Cloud Tasks**: Default rate is 500 tasks/second per queue
- **FCM**: 240,000 messages/minute for HTTP v1 API
- **Firestore**: Consider pagination for large user bases

For high-volume applications, consider:

1. Batching task creation
2. Using subcollections for preferences
3. Implementing rate limiting

## Troubleshooting

### Notifications not being scheduled

1. Check scheduler function logs
2. Verify event source is returning events
3. Check Cloud Tasks queue exists
4. Verify users have enabled categories

### Notifications not being sent

1. Check sender function logs
2. Verify FCM tokens are valid
3. Check notification permissions in browser

### Cloud Tasks errors

1. Verify service account has Cloud Tasks permissions
2. Check queue name and location match
3. Verify function URL is correct

### CORS errors

The `syncUserPreferences` and other frontend-facing functions have CORS enabled. If you still get errors:

1. Verify your domain is allowed
2. Check function deployment was successful
3. Try using the Firebase SDK instead of raw fetch
