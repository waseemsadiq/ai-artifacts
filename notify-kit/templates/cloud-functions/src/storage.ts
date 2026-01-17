/**
 * Firestore Storage Module
 *
 * Manages user preferences in Firestore
 */

import * as admin from "firebase-admin";

// Configuration - customize these for your project
export interface StorageConfig {
  collection: string; // Firestore collection for user preferences
  alertEmail?: string; // Email for alert notifications (optional)
}

const DEFAULT_CONFIG: StorageConfig = {
  collection: "users",
};

let config: StorageConfig = DEFAULT_CONFIG;
let db: admin.firestore.Firestore;

/**
 * Initialize storage with configuration
 */
export function initializeStorage(
  firestore: admin.firestore.Firestore,
  storageConfig: Partial<StorageConfig> = {}
) {
  db = firestore;
  config = { ...DEFAULT_CONFIG, ...storageConfig };
}

/**
 * User preferences structure
 */
export interface UserPreferences {
  fcmToken: string;
  lastUpdated: admin.firestore.FieldValue | admin.firestore.Timestamp;
  preferences: {
    notificationReference: "primary" | "secondary";
    minutesBefore: number;
    categories: Record<string, boolean>;
  };
  dateSpecificOverrides?: Record<string, Record<string, boolean>>;
}

/**
 * Save user preferences to Firestore
 */
export async function saveUserPreferences(
  token: string,
  preferences: UserPreferences["preferences"],
  dateOverrides?: Record<string, Record<string, boolean>>
): Promise<void> {
  await db.collection(config.collection).doc(token).set(
    {
      fcmToken: token,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      preferences,
      dateSpecificOverrides: dateOverrides || {},
    },
    { merge: true }
  );
  console.log(`[NotifyKit] Saved preferences for token: ${token.substring(0, 20)}...`);
}

/**
 * Get all users with preferences
 */
export async function getAllUsers(): Promise<
  Array<{ id: string; data: UserPreferences }>
> {
  const snapshot = await db.collection(config.collection).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as UserPreferences,
  }));
}

/**
 * Delete a user (e.g., when FCM token becomes invalid)
 */
export async function deleteUser(token: string): Promise<void> {
  await db.collection(config.collection).doc(token).delete();
  console.log(`[NotifyKit] Deleted user: ${token.substring(0, 20)}...`);
}

/**
 * Update a specific category subscription
 */
export async function updateCategorySubscription(
  token: string,
  categoryId: string,
  enabled: boolean
): Promise<void> {
  await db.collection(config.collection).doc(token).set(
    {
      [`preferences.categories.${categoryId}`]: enabled,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(
    `[NotifyKit] Updated ${categoryId}=${enabled} for token: ${token.substring(0, 20)}...`
  );
}

/**
 * Send an alert email via Firebase Trigger Email Extension
 * Requires the "Trigger Email" extension to be installed
 */
export async function sendAlertEmail(
  subject: string,
  html: string
): Promise<void> {
  if (!config.alertEmail) {
    console.warn("[NotifyKit] No alert email configured");
    return;
  }

  try {
    await db.collection("mail").add({
      to: config.alertEmail,
      message: {
        subject: `[NotifyKit Alert] ${subject}`,
        html,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[NotifyKit] Alert email triggered to ${config.alertEmail}`);
  } catch (error) {
    console.error("[NotifyKit] Failed to send alert email:", error);
  }
}
