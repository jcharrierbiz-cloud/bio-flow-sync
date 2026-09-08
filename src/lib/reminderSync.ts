// src/lib/reminderSync.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Pont entre les rappels locaux et la table `reminders`.
//
// Le localStorage reste la copie de travail : l'écran répond instantanément et
// continue de fonctionner hors ligne. Supabase est la copie que **le serveur**
// peut lire pour envoyer les notifications quand l'app est fermée — sans elle,
// un rappel ne peut pas sonner.
//
// Aucune importation du store ici : c'est le store qui appelle ce module.
// L'orchestration (charger, fusionner, réécrire l'état) vit dans
// `useReminderSync`, ce qui évite un cycle d'imports.
// -----------------------------------------------------------------------------

import { supabase } from "@/integrations/supabase/client";
import { deviceTimezone } from "@/lib/push";
import type { Reminder, ReminderRepeat } from "@/lib/reminderStore";

/** Ligne telle que lue dans Supabase (le `user_id` est implicite via RLS). */
export interface ReminderRow {
  id: string;
  title: string;
  note: string | null;
  time: string;
  repeat: ReminderRepeat;
  date: string | null;
  weekday: number | null;
  enabled: boolean;
  timezone: string;
  last_sent_key: string | null;
  last_sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

const SELECT =
  "id, title, note, time, repeat, date, weekday, enabled, timezone, last_sent_key, last_sent_at, created_at, updated_at";

/**
 * Tant que la migration n'est pas déployée, la table n'existe pas : chaque
 * écriture répondrait en erreur et remplirait la console. On le signale une
 * fois, puis on se tait — l'app continue sur sa copie locale.
 */
let missingTableReported = false;

function reportError(action: string, error: { code?: string; message: string }): void {
  const tableMissing = error.code === "42P01" || error.code === "PGRST205";
  if (tableMissing) {
    if (missingTableReported) return;
    missingTableReported = true;
    console.warn(
      "Rappels : table `reminders` absente — synchronisation désactivée. " +
        "Les rappels restent sur cet appareil tant que la migration n'est pas " +
        "déployée (voir docs/rappels-push.md)."
    );
    return;
  }
  console.error(`${action}:`, error.message);
}

export function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    note: row.note ?? undefined,
    time: row.time,
    repeat: row.repeat,
    date: row.date ?? undefined,
    weekday: row.weekday ?? undefined,
    enabled: row.enabled,
    timezone: row.timezone,
    lastSentKey: row.last_sent_key ?? undefined,
    lastFiredAt: row.last_sent_at ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? undefined,
  };
}

/** Ligne telle qu'écrite : `user_id` est obligatoire, la RLS le vérifie. */
export type ReminderInsert = ReminderRow & { user_id: string };

export function reminderToRow(reminder: Reminder, userId: string): ReminderInsert {
  return {
    id: reminder.id,
    user_id: userId,
    title: reminder.title,
    note: reminder.note ?? null,
    time: reminder.time,
    repeat: reminder.repeat,
    date: reminder.repeat === "once" ? reminder.date ?? null : null,
    weekday: reminder.repeat === "weekly" ? reminder.weekday ?? 1 : null,
    enabled: reminder.enabled,
    timezone: reminder.timezone || deviceTimezone(),
    last_sent_key: reminder.lastSentKey ?? null,
  };
}

/**
 * Fusionne la copie locale et la copie serveur.
 *
 * Règles, dans cet ordre :
 *   • un rappel présent des deux côtés → on garde le plus récemment modifié,
 *     mais `lastSentKey` du serveur l'emporte toujours (c'est lui qui envoie,
 *     donc lui seul sait ce qui est déjà parti — sinon on notifie deux fois) ;
 *   • présent seulement sur le serveur (créé sur un autre appareil) → ajouté ;
 *   • présent seulement en local (créé hors ligne, ou avant cette version) →
 *     conservé et signalé comme « à téléverser ». Rien n'est jamais supprimé
 *     par la fusion.
 */
export function mergeReminders(
  local: Reminder[],
  remote: Reminder[]
): { merged: Reminder[]; toUpload: Reminder[] } {
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const localById = new Map(local.map((r) => [r.id, r]));

  const merged: Reminder[] = [];
  const toUpload: Reminder[] = [];

  for (const localReminder of local) {
    const remoteReminder = remoteById.get(localReminder.id);
    if (!remoteReminder) {
      merged.push(localReminder);
      toUpload.push(localReminder);
      continue;
    }
    const localStamp = localReminder.updatedAt ?? localReminder.createdAt;
    const remoteStamp = remoteReminder.updatedAt ?? remoteReminder.createdAt;
    const winner = remoteStamp >= localStamp ? remoteReminder : localReminder;
    merged.push({
      ...winner,
      // Le serveur est seul juge de ce qui a déjà été envoyé.
      lastSentKey: remoteReminder.lastSentKey ?? winner.lastSentKey,
    });
  }

  for (const remoteReminder of remote) {
    if (!localById.has(remoteReminder.id)) merged.push(remoteReminder);
  }

  return { merged, toUpload };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

/** Rappels du compte connecté. `null` si hors ligne ou non connecté. */
export async function fetchRemoteReminders(): Promise<Reminder[] | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase.from("reminders").select(SELECT);
  if (error) {
    reportError("fetch reminders failed", error);
    return null;
  }
  return (data as ReminderRow[]).map(rowToReminder);
}

/** Crée ou met à jour un rappel côté serveur. Silencieux si hors ligne. */
export async function pushRemoteReminder(reminder: Reminder): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("reminders")
    .upsert(reminderToRow(reminder, userId), { onConflict: "id" });
  if (error) reportError("push reminder failed", error);
}

export async function pushRemoteReminders(reminders: Reminder[]): Promise<void> {
  if (reminders.length === 0) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("reminders")
    .upsert(reminders.map((r) => reminderToRow(r, userId)), { onConflict: "id" });
  if (error) reportError("push reminders failed", error);
}

export async function deleteRemoteReminder(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) reportError("delete reminder failed", error);
}
