/**
 * NotifyKit Configuration for Example App
 */

import type { NotifyKitConfig } from '@notify-kit/core';

export const notifyKitConfig: NotifyKitConfig = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || '',
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
    {
      id: 'alert',
      name: 'Alerts',
      titleTemplate: '{{name}} Alert',
      bodyTemplate: '{{name}} - {{time}}',
      defaultEnabled: true,
      allowOffset: false,
    },
    {
      id: 'news',
      name: 'News & Updates',
      titleTemplate: 'Update: {{name}}',
      bodyTemplate: '{{name}}',
      defaultEnabled: false,
      allowOffset: false,
    },
  ],

  eventSource: {
    type: 'custom',
    transformer: (data: unknown) => [],
  },

  scheduling: {
    cronExpression: '0 1 * * *',
    timezone: 'Europe/London',
  },

  storage: {
    dbName: 'notify-kit-example',
    firestoreCollection: 'users',
  },

  branding: {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    appUrl: '/',
  },
};

export default notifyKitConfig;
