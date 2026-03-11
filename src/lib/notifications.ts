/**
 * Web Notification helpers for Bio-Flow.
 * Handles permission, scheduling reminders for agenda tasks,
 * and the morning check-in notification.
 */

const PREF_KEY = "bioflow_notif_prefs";
const ONBOARDED_KEY = "bioflow_onboarded";
const MORNING_SCAN_KEY = "bioflow_morning_scan_date";

export interface NotifPrefs {
  enabled: boolean;
  /** Minutes before task to notify (30 or 60) */
  reminderMinutes: 30 | 60;
  morningEnabled: boolean;
}

export function getPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, reminderMinutes: 30, morningEnabled: true };
}

export function savePrefs(prefs: NotifPrefs) {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === "true";
}

export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "true");
}

export function hasDoneMorningScanToday(): boolean {
  return localStorage.getItem(MORNING_SCAN_KEY) === todayKey();
}

export function markMorningScanDone() {
  localStorage.setItem(MORNING_SCAN_KEY, todayKey());
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Request browser notification permission */
export async function requestPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/** Send a notification right now */
export function sendNotification(title: string, body: string, tag?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: tag || undefined,
      badge: "/favicon.ico",
    });
  } catch {
    // Silent fail on environments without Notification support
  }
}

/** Schedule a notification via setTimeout (works while app is open) */
export function scheduleNotification(
  title: string,
  body: string,
  delayMs: number,
  tag?: string
): number {
  return window.setTimeout(() => {
    sendNotification(title, body, tag);
  }, delayMs);
}

/** Schedule reminders for all agenda tasks based on user prefs */
export function scheduleAgendaReminders(
  tasks: { time: string; title: string; duration: string }[],
  reminderMinutes: number
): number[] {
  const timers: number[] = [];
  const now = new Date();

  for (const task of tasks) {
    const [h, m] = task.time.split(":").map(Number);
    const taskDate = new Date();
    taskDate.setHours(h, m, 0, 0);

    const notifyAt = new Date(taskDate.getTime() - reminderMinutes * 60_000);
    const delayMs = notifyAt.getTime() - now.getTime();

    if (delayMs > 0) {
      const timer = scheduleNotification(
        `⏰ ${task.title} dans ${reminderMinutes} min`,
        `Durée : ${task.duration}. Prépare-toi !`,
        delayMs,
        `task-${task.time}`
      );
      timers.push(timer);
    }
  }

  return timers;
}
