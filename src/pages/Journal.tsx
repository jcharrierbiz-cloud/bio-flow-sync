// src/pages/Journal.tsx
// -----------------------------------------------------------------------------
// Bio-Flow — Espace « Journal » (route /journal), indépendant de l'agenda.
//
// Trois onglets :
//   • Journal  — ce que j'ai réellement fait, heure par heure.
//   • Rappels  — mes rappels personnels.
//   • Bilan    — tâches créées vs réalisées, par mois.
//
// L'agenda répond à « qu'est-ce que je prévois ». Cet écran répond à
// « qu'est-ce que j'ai fait, et est-ce que ça correspond ».
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Bell, NotebookPen } from "lucide-react";
import JournalTimeline from "@/components/JournalTimeline";
import RemindersPanel from "@/components/RemindersPanel";
import MonthlyTaskChart from "@/components/MonthlyTaskChart";
import { summarizeMonth, useJournalStore } from "@/lib/journalStore";
import { useReminderStore } from "@/lib/reminderStore";
import { monthKey } from "@/lib/dateUtils";

type Tab = "journal" | "reminders" | "stats";

const TABS: { id: Tab; label: string; icon: typeof NotebookPen }[] = [
  { id: "journal", label: "Journal", icon: NotebookPen },
  { id: "reminders", label: "Rappels", icon: Bell },
  { id: "stats", label: "Bilan", icon: BarChart3 },
];

const STORAGE_KEY = "bioflow_journal_tab";

const Journal = () => {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "journal" || saved === "reminders" || saved === "stats") return saved;
    } catch {
      /* noop */
    }
    return "journal";
  });

  const entries = useJournalStore((s) => s.entries);
  const activeReminders = useReminderStore((s) => s.reminders.filter((r) => r.enabled).length);
  const month = useMemo(() => summarizeMonth(entries, monthKey()), [entries]);

  useEffect(() => {
    document.title = "Journal — Bio-Flow";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch {
      /* noop */
    }
  }, [tab]);

  return (
    <div className="px-5 pt-12 pb-24 max-w-lg mx-auto space-y-5">
      <div>
        <p className="text-muted-foreground text-sm">Ce que j'ai vraiment fait</p>
        <h1 className="text-xl font-bold text-foreground mt-0.5">Journal</h1>
        <p className="text-[11px] text-muted-foreground mt-1">
          {month.entries} activité{month.entries > 1 ? "s" : ""} notée
          {month.entries > 1 ? "s" : ""} ce mois-ci sur {month.days} jour
          {month.days > 1 ? "s" : ""} · {activeReminders} rappel
          {activeReminders > 1 ? "s" : ""} actif{activeReminders > 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-glass-border" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === id
                ? "bg-energy/15 text-energy"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "journal" && <JournalTimeline />}
      {tab === "reminders" && <RemindersPanel />}
      {tab === "stats" && <MonthlyTaskChart />}
    </div>
  );
};

export default Journal;
