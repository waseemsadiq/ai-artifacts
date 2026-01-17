/**
 * NotifyKit Configuration Example
 *
 * Copy this file to your project and customize for your needs.
 *
 * Usage:
 * 1. Copy to your project root as `notify-kit.config.ts`
 * 2. Replace placeholder values with your Firebase config
 * 3. Define your notification categories
 * 4. Import and use with NotifyKit hooks and functions
 */

import type { NotifyKitConfig } from '@notify-kit/core';

export const notifyKitConfig: NotifyKitConfig = {
  // Firebase configuration (required)
  // Get these values from Firebase Console > Project Settings > Your apps
  firebase: {
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
    vapidKey: process.env.VITE_FIREBASE_VAPID_KEY || '',
  },

  // Notification categories
  // Define the types of notifications your app sends
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
    {
      id: 'alert',
      name: 'Alerts',
      titleTemplate: '{{name}} Alert',
      bodyTemplate: '{{name}} - {{time}}',
      defaultEnabled: true,
      allowOffset: false,
    },
    // Add more categories as needed
  ],

  // Event source configuration
  // Defines how to fetch events that can be scheduled for notifications
  eventSource: {
    type: 'api',
    apiUrl: 'https://api.example.com/events',
    transformer: (data: any) => {
      // Transform your API response to SchedulableEvent format
      return data.events.map((event: any) => ({
        id: event.id,
        categoryId: event.type,
        name: event.name,
        time: new Date(event.startTime),
        secondaryTime: event.endTime ? new Date(event.endTime) : undefined,
        metadata: event.metadata,
      }));
    },
  },

  // Scheduling configuration
  scheduling: {
    cronExpression: '0 1 * * *', // Daily at 1 AM
    timezone: 'Europe/London',
  },

  // Storage configuration
  storage: {
    dbName: 'my-app-notifications', // IndexedDB database name
    firestoreCollection: 'users', // Firestore collection for user preferences
  },

  // Branding configuration
  branding: {
    icon: '/icon-192.png', // Notification icon
    badge: '/badge-72.png', // Optional badge icon
    appUrl: '/', // URL to open when notification is clicked
  },
};

export default notifyKitConfig;
