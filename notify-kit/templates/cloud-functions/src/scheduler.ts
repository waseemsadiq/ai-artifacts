/**
 * Daily Notification Scheduler
 *
 * Schedules notifications using Google Cloud Tasks
 */

import { onSchedule, ScheduleOptions } from "firebase-functions/v2/scheduler";
import { CloudTasksClient } from "@google-cloud/tasks";
import { getAllUsers, sendAlertEmail, UserPreferences } from "./storage";

// Configuration
export interface SchedulerConfig {
  projectId: string;
  location: string; // e.g., "us-central1"
  queueName: string; // Cloud Tasks queue name
  sendFunctionUrl: string; // URL of the sendUserNotification function
  cronSchedule: string; // e.g., "0 1 * * *" for daily at 1 AM
  timezone: string; // e.g., "Europe/London"
}

export interface SchedulableEvent {
  id: string;
  categoryId: string;
  name: string;
  time: Date;
  secondaryTime?: Date;
}

/**
 * Event source interface - implement this to provide events to schedule
 */
export interface EventSource {
  getEventsForDate(date: Date): Promise<SchedulableEvent[]>;
}

/**
 * Parse time string (e.g., "13:00" or "1:00 PM") into a Date object
 */
export function parseTime(timeStr: string, date: Date): Date | null {
  const d = new Date(date);
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return null;

  let [, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);

  if (ampm) {
    const period = ampm.toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
  }

  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Schedule a single notification task for a user
 */
export async function scheduleTaskForUser(
  tasksClient: CloudTasksClient,
  queuePath: string,
  sendFunctionUrl: string,
  fcmToken: string,
  preferences: UserPreferences["preferences"],
  event: SchedulableEvent,
  baseDate: Date,
  dateOverrides?: Record<string, Record<string, boolean>>,
  forceImmediate = false
): Promise<boolean> {
  // Check if category is enabled
  const settingEnabled = preferences.categories?.[event.categoryId] ?? false;
  const dateStr = baseDate.toDateString();
  const overrideEnabled = dateOverrides?.[dateStr]?.[event.categoryId];

  // Override takes precedence if defined
  const isEnabled =
    overrideEnabled !== undefined ? overrideEnabled : settingEnabled;

  if (!isEnabled) {
    return false;
  }

  // Determine which time to use
  const useSecondary = preferences.notificationReference === "secondary";
  const baseTime = useSecondary && event.secondaryTime
    ? event.secondaryTime
    : event.time;

  // Calculate notification time with offset
  const offsetMinutes = preferences.minutesBefore ?? 0;
  const offsetMs = offsetMinutes * 60 * 1000;
  const notificationTime = new Date(baseTime.getTime() - offsetMs);

  // Skip if notification time has already passed, unless forcing immediate
  if (!forceImmediate && notificationTime.getTime() < Date.now()) {
    console.log(
      `[NotifyKit] Skipping ${event.name} - notification time already passed`
    );
    return false;
  }

  // Format time for display
  const hours = baseTime.getHours();
  const minutes = baseTime.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const timeStr = `${displayHours}:${minutes} ${period}`;

  // Create Cloud Task
  const payload = {
    fcmToken,
    categoryId: event.categoryId,
    eventName: event.name,
    timeStr,
    minutesBefore: offsetMinutes,
  };

  const task = {
    httpRequest: {
      httpMethod: "POST" as const,
      url: sendFunctionUrl,
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      headers: {
        "Content-Type": "application/json",
      },
    },
    scheduleTime: {
      seconds: Math.floor(notificationTime.getTime() / 1000),
    },
  };

  try {
    await tasksClient.createTask({ parent: queuePath, task });
    console.log(
      `[NotifyKit] Scheduled ${event.name} for user at ${notificationTime.toISOString()}`
    );
    return true;
  } catch (taskError) {
    console.error(
      `[NotifyKit] Failed to create task for ${event.name}:`,
      taskError
    );
    return false;
  }
}

/**
 * Create the daily scheduler Cloud Function
 *
 * @param config - Scheduler configuration
 * @param eventSource - Source of events to schedule
 * @returns Firebase scheduled function
 */
export function createDailyScheduler(
  config: SchedulerConfig,
  eventSource: EventSource
) {
  const scheduleOptions: ScheduleOptions = {
    schedule: config.cronSchedule,
    timeZone: config.timezone,
  };

  return onSchedule(scheduleOptions, async () => {
    const today = new Date();
    console.log(`[NotifyKit] Running daily scheduler for ${today.toDateString()}`);

    try {
      // Get events for today
      const events = await eventSource.getEventsForDate(today);

      if (events.length === 0) {
        console.log("[NotifyKit] No events found for today");
        await sendAlertEmail(
          "No Events Found",
          `<p>No events found for ${today.toDateString()}</p>`
        );
        return;
      }

      console.log(`[NotifyKit] Found ${events.length} events`);

      // Get all users
      const users = await getAllUsers();
      console.log(`[NotifyKit] Found ${users.length} users`);

      if (users.length === 0) {
        console.log("[NotifyKit] No users to notify");
        return;
      }

      // Initialize Cloud Tasks client
      const tasksClient = new CloudTasksClient();
      const queuePath = tasksClient.queuePath(
        config.projectId,
        config.location,
        config.queueName
      );

      let scheduledCount = 0;

      // Process each user
      for (const { data: userData } of users) {
        const { fcmToken, preferences, dateSpecificOverrides } = userData;

        if (!fcmToken || !preferences) {
          continue;
        }

        // Process each event
        for (const event of events) {
          const scheduled = await scheduleTaskForUser(
              tasksClient,
              queuePath,
              config.sendFunctionUrl,
              fcmToken,
              preferences,
              event,
              today,
              dateSpecificOverrides
          );
          if (scheduled) scheduledCount++;
        }
      }

      console.log(`[NotifyKit] Successfully scheduled ${scheduledCount} notifications`);

      if (scheduledCount === 0) {
        const msg =
          "Scheduler ran but produced 0 tasks. Check if events are correct or if all users have disabled notifications.";
        console.warn(`[NotifyKit] ${msg}`);
        await sendAlertEmail("Zero Notifications Scheduled", `<p>${msg}</p>`);
      }
    } catch (error: any) {
      console.error("[NotifyKit] Scheduler failed:", error);
      await sendAlertEmail(
        "Scheduler Failed",
        `<p>An error occurred:</p><pre>${error.message}\n${error.stack}</pre>`
      );
    }
  });
}
