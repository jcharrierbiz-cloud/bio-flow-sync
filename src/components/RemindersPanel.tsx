// src/components/RemindersPanel.tsx
// -----------------------------------------------------------------------------
// Bio-Flow — Création et gestion des rappels.
//
// Le bandeau du haut dit la vérité sur ce que le web permet : sans app native
// ni serveur de push, un rappel ne peut pas sonner quand Bio-Flow est fermé.
// Mieux vaut l'écrire que laisser l'utilisateur découvrir un rappel muet.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { AlertCircle, Bell, BellOff, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  REPEAT_LABELS,
  WEEKDAY_LABELS,
  describeNext,
  useReminderStore,
  type ReminderRepeat,
} from "@/lib/reminderStore";
import { dayKey } from "@/lib/dateUtils";
import { getPrefs, requestPermission, savePrefs } from "@/lib/notifications";

const REPEATS: ReminderRepeat[] = ["once", "daily", "weekdays", "weekly"];

const RemindersPanel = () => {
  const { reminders, addReminder, removeReminder, toggleReminder } = useReminderStore();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [time, setTime] = useState("09:00");
  const [repeat, setRepeat] = useState<ReminderRepeat>("daily");
  const [date, setDate] = useState(dayKey());
  const [weekday, setWeekday] = useState(new Date().getDay());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, [reminders.length]);

  const enableNotifications = async () => {
    const granted = await requestPermission();
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    if (granted) {
      // Aligne la préférence globale : sans ça, le planificateur reste inerte.
      savePrefs({ ...getPrefs(), enabled: true });
      toast.success("Notifications activées.");
    } else {
      toast.error("Notifications refusées par le navigateur.");
    }
  };

  const submit = () => {
    const created = addReminder({ title, note, time, repeat, date, weekday });
    if (!created) return;
    setTitle("");
    setNote("");
    setShowForm(false);
    toast.success(`Rappel créé — ${describeNext(created).toLowerCase()}`);
  };

  return (
    <div className="space-y-4">
      {/* État des notifications */}
      {permission !== "granted" && (
        <div className="glass-card p-4 flex items-start gap-3 border-warning/25">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-xs text-foreground">
              {permission === "unsupported"
                ? "Ce navigateur ne gère pas les notifications système."
                : permission === "denied"
                ? "Les notifications sont bloquées pour Bio-Flow. Autorise-les dans les réglages du navigateur pour les recevoir hors de l'écran."
                : "Autorise les notifications pour recevoir tes rappels hors de cet écran."}
            </p>
            {permission === "default" && (
              <button
                onClick={enableNotifications}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-energy text-primary-foreground font-semibold"
              >
                Activer les notifications
              </button>
            )}
          </div>
        </div>
      )}

      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Mes rappels</h2>
            <p className="text-[10px] text-muted-foreground">
              Se déclenchent quand Bio-Flow est ouvert — un site web ne peut pas
              sonner application fermée.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="w-8 h-8 rounded-full bg-energy/15 flex items-center justify-center hover:bg-energy/25 transition-colors shrink-0"
            aria-label={showForm ? "Fermer le formulaire" : "Nouveau rappel"}
          >
            {showForm ? <X className="w-4 h-4 text-energy" /> : <Plus className="w-4 h-4 text-energy" />}
          </button>
        </div>

        {showForm && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 animate-fade-in">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Rappel (ex. : boire de l'eau, appeler Paul...)"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-energy"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Détail (facultatif)"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-energy"
            />

            <div className="flex gap-2 items-center">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-energy"
                aria-label="Heure du rappel"
              />
              {repeat === "once" && (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-energy"
                  aria-label="Date du rappel"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {REPEATS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRepeat(r)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                    repeat === r
                      ? "bg-energy/15 text-energy ring-1 ring-energy/30"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {REPEAT_LABELS[r]}
                </button>
              ))}
            </div>

            {repeat === "weekly" && (
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => setWeekday(i)}
                    className={`text-[10px] px-2.5 py-1 rounded-full transition-all ${
                      weekday === i
                        ? "bg-ai-violet/15 text-ai-violet ring-1 ring-ai-violet/30"
                        : "bg-secondary/50 text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={submit}
              disabled={!title.trim()}
              className="w-full py-2.5 rounded-xl bg-energy text-primary-foreground text-xs font-semibold hover:bg-energy/90 transition-colors disabled:opacity-40"
            >
              Créer le rappel
            </button>
          </div>
        )}

        {reminders.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Aucun rappel pour l'instant.
          </p>
        )}

        <div className="space-y-2">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-glass-border bg-muted/20 p-3"
            >
              <button
                onClick={() => toggleReminder(r.id)}
                className="shrink-0 mt-0.5"
                aria-label={r.enabled ? "Désactiver le rappel" : "Activer le rappel"}
              >
                {r.enabled ? (
                  <Bell className="w-4 h-4 text-energy" />
                ) : (
                  <BellOff className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm break-words ${
                    r.enabled ? "text-foreground" : "text-muted-foreground line-through"
                  }`}
                >
                  {r.title}
                </p>
                {r.note && <p className="text-[11px] text-muted-foreground">{r.note}</p>}
                <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                  <span className="mono text-foreground">{r.time}</span>
                  <span className="text-muted-foreground">
                    {REPEAT_LABELS[r.repeat]}
                    {r.repeat === "weekly" ? ` · ${WEEKDAY_LABELS[r.weekday ?? 1]}` : ""}
                  </span>
                  <span className="text-energy">{describeNext(r)}</span>
                  {r.lastMissedAt && (
                    <span className="text-warning">
                      Manqué le{" "}
                      {new Date(r.lastMissedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      (app fermée)
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeReminder(r.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Supprimer le rappel ${r.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RemindersPanel;
