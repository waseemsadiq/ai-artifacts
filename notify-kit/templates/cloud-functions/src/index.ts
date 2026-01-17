/**
 * NotifyKit Cloud Functions
 *
 * Copy this template and customize for your project.
 *
 * Required setup:
 * 1. Enable Cloud Tasks API in Google Cloud Console
 * 2. Create a Cloud Tasks queue (e.g., "notifications")
 * 3. Set ALERT_RECIPIENT_EMAIL in Firebase Functions config (optional)
 *
 * @example
 * ```bash
 * # Create Cloud Tasks queue
 * gcloud tasks queues create notifications --location=us-central1
 *
 * # Set alert email (optional)
 * firebase functions:config:set alert.email="admin@example.com"
 * ```
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import {
  initializeStorage,
  saveUserPreferences,
  updateCategorySubscription,
} from "./storage";
import {
  initializeSender,
  createSendNotificationFunction,
  createTestNotificationFunction,
} from "./sender";
import { createDailyScheduler, EventSource, SchedulableEvent } from "./scheduler";

// ============================================================================
// CONFIGURATION - CUSTOMIZE THESE FOR YOUR PROJECT
// ============================================================================

const PROJECT_ID = process.env.GCLOUD_PROJECT || "your-project-id";
const LOCATION = "us-central1";
const QUEUE_NAME = "notifications";

// Your event source configuration
const EVENT_API_URL = "https://api.example.com/events"; // Replace with your API

// ============================================================================
// INITIALIZATION
// ============================================================================

admin.initializeApp();

const messaging = admin.messaging();
const db = admin.firestore();

// Initialize modules
initializeStorage(db, {
  collection: "users",
  alertEmail: process.env.ALERT_RECIPIENT_EMAIL,
});

initializeSender(messaging, {
  appUrl: "/",
});

// ============================================================================
// EVENT SOURCE - CUSTOMIZE THIS FOR YOUR DATA
// ============================================================================

/**
 * Example event source - replace with your own implementation
 *
 * This function should fetch events for the given date from your API
 * and transform them into SchedulableEvent objects.
 */
const eventSource: EventSource = {
  async getEventsForDate(date: Date): Promise<SchedulableEvent[]> {
    // Example: Fetch from an API
    // const response = await fetch(`${EVENT_API_URL}?date=${date.toISOString()}`);
    // const data = await response.json();

    // Transform API data to SchedulableEvent format
    // return data.events.map((event: any) => ({
    //   id: event.id,
    //   categoryId: event.type,
    //   name: event.name,
    //   time: new Date(event.startTime),
    //   secondaryTime: event.endTime ? new Date(event.endTime) : undefined,
    // }));

    // Placeholder - replace with your implementation
    console.log(`[NotifyKit] Fetching events for ${date.toDateString()}`);
    return [];
  },
};

// ============================================================================
// EXPORTED CLOUD FUNCTIONS
// ============================================================================

/**
 * Sync User Preferences to Firestore
 *
 * Called by frontend when user changes notification settings
 *
 * POST /syncUserPreferences
 * Body: { token, preferences, dateOverrides? }
 */
export const syncUserPreferences = onRequest({ cors: true }, async (req, res) => {
  const { token, preferences, dateOverrides } = req.body;

  if (!token || !preferences) {
    res.status(400).send({ error: "Missing token or preferences" });
    return;
  }

  try {
    await saveUserPreferences(token, preferences, dateOverrides);
    res.status(200).send({ success: true });
  } catch (error) {
    console.error("[NotifyKit] Failed to sync preferences:", error);
    res.status(500).send({ error: "Failed to sync preferences" });
  }
});

/**
 * Manage Category Subscription
 *
 * Toggle a specific category on/off for a user
 *
 * POST /manageCategorySubscription
 * Body: { token, categoryId, enabled }
 */
export const manageCategorySubscription = onRequest(
  { cors: true },
  async (req, res) => {
    const { token, categoryId, enabled } = req.body;

    if (!token || !categoryId || enabled === undefined) {
      res.status(400).send({ error: "Missing token, categoryId, or enabled" });
      return;
    }

    try {
      await updateCategorySubscription(token, categoryId, enabled);
      res.status(200).send({ success: true });
    } catch (error) {
      console.error("[NotifyKit] Failed to update category:", error);
      res.status(500).send({ error: "Failed to update category" });
    }
  }
);

/**
 * Send Notification to a Specific User
 *
 * Called by Cloud Tasks at scheduled notification times
 *
 * POST /sendUserNotification
 * Body: { fcmToken, categoryId, eventName, timeStr, minutesBefore }
 */
export const sendUserNotification = createSendNotificationFunction();

/**
 * Send Test Push Notification
 *
 * Used for debugging notification delivery
 *
 * POST /sendTestPush
 * Body: { token }
 */
export const sendTestPush = createTestNotificationFunction();

/**
 * Schedule Daily Notifications
 *
 * Runs every day at 1:00 AM (configure via cronSchedule)
 * Fetches events for today and schedules Cloud Tasks
 */
export const scheduleDailyNotifications = createDailyScheduler(
  {
    projectId: PROJECT_ID,
    location: LOCATION,
    queueName: QUEUE_NAME,
    sendFunctionUrl: `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net/sendUserNotification`,
    cronSchedule: "0 1 * * *", // Daily at 1 AM
    timezone: "Europe/London",
  },
  eventSource
);
