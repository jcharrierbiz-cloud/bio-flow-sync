// supabase/functions/send-reminders/due.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Quels rappels sont à envoyer, maintenant ?
//
// Isolé de l'entrée/sortie pour être testable : ce fichier n'importe ni Deno,
// ni Supabase, ni web-push. La suite de tests du dépôt le couvre directement
// (src/test/sendReminders.test.ts), y compris les pièges de fuseau.
//
// Principe : « 18:00 chaque jour » n'est pas un instant, c'est une heure
// murale. On convertit donc « maintenant » dans le fuseau de l'utilisateur et
// on compare des heures locales — jamais des timestamps. La déduplication se
// fait sur une clé d'occurrence locale ("2026-09-08T18:00"), ce qui reste juste
// même la nuit du changement d'heure.
// -----------------------------------------------------------------------------

export interface ReminderRow {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  /** Heure murale "HH:MM". */
  time: string;
  repeat: "once" | "daily" | "weekdays" | "weekly";
  /** "AAAA-MM-JJ", pour repeat = "once". */
  date: string | null;
  /** 0 = dimanche … 6 = samedi, pour repeat = "weekly". */
  weekday: number | null;
  enabled: boolean;
  timezone: string;
  last_sent_key: string | null;
}

export interface DueReminder {
  reminder: ReminderRow;
  /** Clé d'occurrence locale : "AAAA-MM-JJTHH:MM". */
  occurrenceKey: string;
  /** Retard en minutes au moment du calcul. */
  lateMinutes: number;
}

export interface LocalParts {
  /** "AAAA-MM-JJ" dans le fuseau demandé. */
  dateKey: string;
  hour: number;
  minute: number;
  /** 0 = dimanche … 6 = samedi. */
  weekday: number;
}

/**
 * Décompose un instant dans un fuseau IANA donné.
 * Repli sur UTC si le fuseau est inconnu du runtime, plutôt que de lever.
 */
export function localParts(now: Date, timeZone: string): LocalParts {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  }

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
  // "24" est renvoyé par certains runtimes pour minuit ; on le ramène à 0.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));

  // Jour de la semaine du jour civil local, calculé sur la clé de date : pas de
  // dépendance au fuseau du serveur.
  const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();

  return { dateKey, hour, minute, weekday };
}

/** Le rappel a-t-il une occurrence ce jour local-là ? */
export function occursOn(reminder: ReminderRow, local: LocalParts): boolean {
  switch (reminder.repeat) {
    case "once":
      return reminder.date === local.dateKey;
    case "daily":
      return true;
    case "weekdays":
      return local.weekday >= 1 && local.weekday <= 5;
    case "weekly":
      return local.weekday === (reminder.weekday ?? 1);
    default:
      return false;
  }
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * Rappels à envoyer maintenant.
 *
 * `graceMinutes` borne le rattrapage : si la tâche planifiée n'a pas tourné
 * pendant deux heures, on ne réveille pas l'utilisateur pour un rappel de
 * 8 h du matin à midi. L'occurrence est simplement passée.
 */
export function collectDueRows(
  rows: ReminderRow[],
  now: Date,
  graceMinutes = 15
): DueReminder[] {
  const due: DueReminder[] = [];

  for (const reminder of rows) {
    if (!reminder.enabled) continue;

    const local = localParts(now, reminder.timezone || "UTC");
    if (!occursOn(reminder, local)) continue;

    const nowMinutes = local.hour * 60 + local.minute;
    const lateMinutes = nowMinutes - minutesOf(reminder.time);
    if (lateMinutes < 0 || lateMinutes > graceMinutes) continue;

    const occurrenceKey = `${local.dateKey}T${reminder.time}`;
    if (reminder.last_sent_key === occurrenceKey) continue;

    due.push({ reminder, occurrenceKey, lateMinutes });
  }

  return due;
}
