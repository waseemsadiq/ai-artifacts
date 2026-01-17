/**
 * Time Utilities
 *
 * Helper functions for parsing and formatting times
 *
 * @module @notify-kit/core
 */

/**
 * Parse a time string into a Date object
 *
 * Supports formats:
 * - 24-hour: "13:00", "09:30"
 * - 12-hour: "1:00 PM", "9:30 AM"
 *
 * @param timeStr - Time string to parse
 * @param date - Date to use for year/month/day (defaults to today)
 * @returns Date object or null if parsing fails
 *
 * @example
 * ```typescript
 * const time = parseTime('13:00'); // Today at 1:00 PM
 * const time2 = parseTime('9:30 AM', new Date('2024-01-15'));
 * ```
 */
export function parseTime(timeStr: string, date: Date = new Date()): Date | null {
  const d = new Date(date);
  const match = timeStr.match(/^\s*(\d{1,2}):(\d{2})(?:\s*(AM|PM))?\s*$/i);
  if (!match) return null;

  const [, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);

  if (ampm) {
    const period = ampm.toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  }

  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Format a Date object to a time string
 *
 * @param date - Date to format
 * @param use24Hour - Whether to use 24-hour format (default: false)
 * @returns Formatted time string
 *
 * @example
 * ```typescript
 * formatTime(new Date()); // "1:30 PM"
 * formatTime(new Date(), true); // "13:30"
 * ```
 */
export function formatTime(date: Date, use24Hour: boolean = false): string {
  if (use24Hour) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  return `${hours}:${minutes} ${period}`;
}

/**
 * Calculate the time difference between now and a target time
 *
 * @param targetTime - Target Date
 * @returns Object with hours, minutes, seconds, and total milliseconds
 */
export function getTimeDifference(targetTime: Date): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isPast: boolean;
} {
  const now = Date.now();
  const target = targetTime.getTime();
  const totalMs = target - now;
  const isPast = totalMs < 0;

  const absTotalMs = Math.abs(totalMs);
  const totalSeconds = Math.floor(absTotalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalMs, isPast };
}

/**
 * Check if a time is within a window of another time
 *
 * @param time - Time to check
 * @param target - Target time
 * @param windowMs - Window size in milliseconds
 * @returns True if time is within window of target
 */
export function isWithinWindow(
  time: Date | number,
  target: Date | number,
  windowMs: number
): boolean {
  const timeMs = typeof time === 'number' ? time : time.getTime();
  const targetMs = typeof target === 'number' ? target : target.getTime();
  return Math.abs(timeMs - targetMs) <= windowMs;
}

/**
 * Get the start of the day for a given date
 *
 * @param date - Date to get start of day for
 * @returns New Date at 00:00:00.000
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the day for a given date
 *
 * @param date - Date to get end of day for
 * @returns New Date at 23:59:59.999
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add minutes to a date
 *
 * @param date - Base date
 * @param minutes - Minutes to add (can be negative)
 * @returns New Date with minutes added
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Check if a date is today
 *
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is tomorrow
 *
 * @param date - Date to check
 * @returns True if date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
}
