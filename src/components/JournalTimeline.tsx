// src/components/JournalTimeline.tsx
// -----------------------------------------------------------------------------
// Bio-Flow — Journal heure par heure d'une journée.
//
// L'agenda dit ce qui était prévu ; ce composant enregistre ce qui a
// réellement eu lieu, créneau par créneau. Plusieurs entrées par heure.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  JOURNAL_CATEGORIES,
  entriesByHour,
  summarizeDay,
  useJournalStore,
  type JournalEntry,
} from "@/lib/journalStore";
import { addDays, dayKey, dayLabel, hourLabel, parseDayKey } from "@/lib/dateUtils";

const categoryChip: Record<string, string> = {
  Travail: "bg-warning/15 text-warning border-warning/25",
  Sport: "bg-energy/15 text-energy border-energy/25",
  Perso: "bg-ai-violet/15 text-ai-violet border-ai-violet/25",
  Santé: "bg-primary/15 text-primary border-primary/25",
  Repas: "bg-primary/15 text-primary border-primary/25",
  Repos: "bg-secondary text-secondary-foreground border-border",
  Autre: "bg-secondary text-secondary-foreground border-border",
};

/** Plage affichée par défaut : la journée « éveillée ». */
const DEFAULT_FROM = 6;
const DEFAULT_TO = 23;

const EntryRow = ({ entry }: { entry: JournalEntry }) => {
  const { updateEntry, removeEntry } = useJournalStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const [category, setCategory] = useState(entry.category);

  const commit = () => {
    const clean = draft.trim();
    if (!clean) {
      removeEntry(entry.id);
      return;
    }
    updateEntry(entry.id, { text: clean, category });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-background p-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full bg-transparent text-sm text-foreground focus:outline-none"
          aria-label="Modifier l'activité"
        />
        <div className="flex flex-wrap gap-1">
          {JOURNAL_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
                category === c ? categoryChip[c] : "bg-secondary/40 text-muted-foreground border-transparent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={commit}
            className="flex-1 py-1.5 rounded-lg bg-energy text-primary-foreground text-[11px] font-semibold"
          >
            Enregistrer
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 group">
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 mt-0.5 ${
          categoryChip[entry.category] || categoryChip.Autre
        }`}
      >
        {entry.category}
      </span>
      <p className="flex-1 text-sm text-foreground break-words">{entry.text}</p>
      <button
        onClick={() => {
          setDraft(entry.text);
          setCategory(entry.category);
          setEditing(true);
        }}
        className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        aria-label="Modifier"
      >
        <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
      </button>
      <button
        onClick={() => removeEntry(entry.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        aria-label="Supprimer"
      >
        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
};

const HourRow = ({
  hour,
  day,
  entries,
  isCurrentHour,
}: {
  hour: number;
  day: string;
  entries: JournalEntry[];
  isCurrentHour: boolean;
}) => {
  const addEntry = useJournalStore((s) => s.addEntry);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>("Travail");

  const submit = () => {
    if (!text.trim()) return;
    addEntry({ date: day, hour, text, category });
    setText("");
    setAdding(false);
  };

  return (
    <div
      className={`flex gap-3 rounded-xl p-2.5 border transition-colors ${
        isCurrentHour
          ? "border-energy/40 bg-energy/5"
          : entries.length > 0
          ? "border-glass-border bg-muted/20"
          : "border-transparent"
      }`}
    >
      <div className="w-11 shrink-0 pt-0.5">
        <span
          className={`mono text-xs font-medium ${
            isCurrentHour ? "text-energy" : entries.length ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {hourLabel(hour)}
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        {entries.map((e) => (
          <EntryRow key={e.id} entry={e} />
        ))}

        {adding ? (
          <div className="space-y-2 rounded-lg border border-border bg-background p-2">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder={`Qu'as-tu fait à ${hourLabel(hour)} ?`}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex flex-wrap gap-1">
              {JOURNAL_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
                    category === c
                      ? categoryChip[c]
                      : "bg-secondary/40 text-muted-foreground border-transparent"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={!text.trim()}
                className="flex-1 py-1.5 rounded-lg bg-energy text-primary-foreground text-[11px] font-semibold disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <Check className="w-3 h-3" /> Ajouter
              </button>
              <button
                onClick={() => setAdding(false)}
                className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            // Heure déjà remplie ou heure en cours : libellé explicite.
            // Heures vides : simple « + » pleine largeur, pour ne pas répéter
            // dix-huit fois la même phrase sur une journée blanche.
            className={`flex items-center gap-1 w-full py-1 text-[11px] text-muted-foreground hover:text-energy transition-colors ${
              entries.length || isCurrentHour ? "" : "opacity-60"
            }`}
            aria-label={`Noter une activité à ${hourLabel(hour)}`}
          >
            <Plus className="w-3 h-3" />
            {entries.length
              ? "Ajouter"
              : isCurrentHour
              ? "Noter ce que tu viens de faire"
              : ""}
          </button>
        )}
      </div>
    </div>
  );
};

const JournalTimeline = () => {
  const entries = useJournalStore((s) => s.entries);
  const [day, setDay] = useState<string>(dayKey());
  const [showAllHours, setShowAllHours] = useState(false);
  // Horloge rafraîchie chaque minute : le surlignage de l'heure courante suit
  // le temps même si l'écran reste ouvert.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const isToday = day === dayKey(now);
  const byHour = useMemo(() => entriesByHour(entries, day), [entries, day]);
  const summary = useMemo(() => summarizeDay(entries, day), [entries, day]);

  // Heures visibles : la plage « éveillée » + toute heure déjà documentée,
  // pour qu'une note à 3h du matin ne disparaisse jamais de l'écran.
  const hours = useMemo(() => {
    if (showAllHours) return Array.from({ length: 24 }, (_, i) => i);
    const set = new Set<number>();
    for (let h = DEFAULT_FROM; h <= DEFAULT_TO; h++) set.add(h);
    for (const h of byHour.keys()) set.add(h);
    if (isToday) set.add(now.getHours());
    return [...set].sort((a, b) => a - b);
  }, [showAllHours, byHour, isToday, now]);

  const shift = (n: number) => setDay(dayKey(addDays(parseDayKey(day), n)));

  return (
    <div className="space-y-4">
      {/* Navigation de jour */}
      <div className="glass-card p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => shift(-1)}
            className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>

          <div className="text-center min-w-0">
            <h2 className="text-sm font-semibold text-foreground capitalize truncate">
              {dayLabel(parseDayKey(day))}
            </h2>
            {!isToday && (
              <button
                onClick={() => setDay(dayKey())}
                className="text-[10px] text-energy hover:underline"
              >
                Revenir à aujourd'hui
              </button>
            )}
          </div>

          <button
            onClick={() => shift(1)}
            className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Jour suivant"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-energy"
            aria-label="Choisir une date"
          />
          <button
            onClick={() => setShowAllHours((v) => !v)}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAllHours ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showAllHours ? "6h–23h" : "24 h"}
          </button>
        </div>

        {/* Résumé du jour */}
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock3 className="w-3 h-3" />
            {summary.hoursCovered} h documentée{summary.hoursCovered > 1 ? "s" : ""} ·{" "}
            {summary.entries} activité{summary.entries > 1 ? "s" : ""}
          </span>
          {summary.byCategory.map(({ category, count }) => (
            <span
              key={category}
              className={`px-1.5 py-0.5 rounded-full border ${
                categoryChip[category] || categoryChip.Autre
              }`}
            >
              {category} {count}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card p-3 space-y-1">
        {hours.map((h) => (
          <HourRow
            key={h}
            hour={h}
            day={day}
            entries={byHour.get(h) ?? []}
            isCurrentHour={isToday && h === now.getHours()}
          />
        ))}
      </div>
    </div>
  );
};

export default JournalTimeline;
