/**
 * FCM Notification Sender
 *
 * Sends push notifications via Firebase Cloud Messaging
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { deleteUser } from "./storage";

// Configuration
export interface SenderConfig {
  appUrl: string; // URL to open when notification is clicked
  defaultIcon?: string; // Default notification icon
}

const DEFAULT_CONFIG: SenderConfig = {
  appUrl: "/",
};

let config: SenderConfig = DEFAULT_CONFIG;
let messaging: admin.messaging.Messaging;

/**
 * Initialize sender with configuration
 */
export function initializeSender(
  messagingInstance: admin.messaging.Messaging,
  senderConfig: Partial<SenderConfig> = {}
) {
  messaging = messagingInstance;
  config = { ...DEFAULT_CONFIG, ...senderConfig };
}

/**
 * Notification payload for sending
 */
export interface NotificationPayload {
  fcmToken: string;
  categoryId: string;
  eventName: string;
  timeStr: string;
  minutesBefore: number;
  title?: string;
  body?: string;
}

/**
 * Build the FCM message from payload
 */
function buildMessage(payload: NotificationPayload): admin.messaging.Message {
  const { fcmToken, categoryId, eventName, timeStr, minutesBefore, title, body } = payload;

  const notificationTitle = title || eventName;
  const notificationBody =
    body ||
    (minutesBefore === 0
      ? `It is time for ${eventName}${timeStr ? ` (${timeStr})` : ""}`
      : `Upcoming: ${eventName} in ${minutesBefore} minutes${timeStr ? ` (${timeStr})` : ""}`);

  return {
  return {
    // CRITICAL: We DO NOT send a "notification" block here.
    // This allows the Service Worker to handle the display 100% of the time,
    // avoiding duplicate notifications from the browser's default behavior.
    webpush: {
      headers: {
        Urgency: "high",
        TTL: "3600",
      },
      fcmOptions: {
        link: config.appUrl,
      },
    },
    android: {
      notification: {
        sound: "default",
        vibrateTimingsMillis: [200, 100, 200],
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          // alert: { ... }  <-- Removed to prevent double notification on iOS if SW handles it
          contentAvailable: true,
        },
      },
      headers: {
        "apns-push-type": "alert",
        "apns-priority": "10",
      },
    },
    data: {
      title: notificationTitle,
      body: notificationBody,
      categoryId,
      eventName,
      timeStr: timeStr || "",
      minutesBefore: String(minutesBefore),
      type: "notification_alert",
    },
    token: fcmToken,
  };
}

/**
 * Send a notification to a specific user
 *
 * @returns true if sent successfully, false otherwise
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  const message = buildMessage(payload);

  try {
    await messaging.send(message);
    console.log(`[NotifyKit] Sent notification for ${payload.eventName}`);
    return true;
  } catch (error: any) {
    // Handle invalid tokens by removing them
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      console.log(`[NotifyKit] Removing invalid token: ${payload.fcmToken.substring(0, 20)}...`);
      try {
        await deleteUser(payload.fcmToken);
      } catch (deleteError) {
        console.error("[NotifyKit] Failed to delete invalid token:", deleteError);
      }
    }
    console.error("[NotifyKit] Failed to send notification:", error);
    return false;
  }
}

/**
 * Create the sendUserNotification Cloud Function
 *
 * This function is called by Cloud Tasks at scheduled notification times
 */
export function createSendNotificationFunction() {
  return onRequest(async (req, res) => {
    const { fcmToken, categoryId, eventName, timeStr, minutesBefore, title, body } = req.body;

    if (!fcmToken || !eventName) {
      res.status(400).send({ error: "Missing fcmToken or eventName" });
      return;
    }

    const success = await sendNotification({
      fcmToken,
      categoryId: categoryId || "default",
      eventName,
      timeStr: timeStr || "",
      minutesBefore: minutesBefore || 0,
      title,
      body,
    });

    if (success) {
      res.status(200).send({ success: true });
    } else {
      res.status(500).send({ error: "Failed to send notification" });
    }
  });
}

/**
 * Create a test notification Cloud Function
 */
export function createTestNotificationFunction() {
  return onRequest({ cors: true }, async (req, res) => {
    const { token } = req.body;

    if (!token) {
      res.status(400).send({ error: "Missing token" });
      return;
    }

    const message: admin.messaging.Message = {
      notification: {
        title: "Test Notification",
        body: "This is a test notification from NotifyKit.",
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "3600",
        },
        fcmOptions: {
          link: config.appUrl,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            alert: {
              title: "Test Notification",
              body: "This is a test notification from NotifyKit.",
            },
            contentAvailable: true,
          },
        },
        headers: {
          "apns-push-type": "alert",
          "apns-priority": "10",
        },
      },
      data: {
        title: "Test Notification",
        body: "This is a test notification from NotifyKit.",
        type: "test_push",
      },
      token,
    };

    try {
      await messaging.send(message);
      console.log(`[NotifyKit] Sent test notification to ${token.substring(0, 20)}...`);
      res.status(200).send({ success: true });
    } catch (error) {
      console.error("[NotifyKit] Failed to send test notification:", error);
      res.status(500).send({ error: "Failed to send test notification" });
    }
  });
}
