// src/components/OverdueTasks.tsx
// -----------------------------------------------------------------------------
// Bio-Flow — Espace « À rattraper ».
//
// Une tâche non faite le jour prévu quitte le haut de la liste et atterrit ici.
// Deux issues explicites, jamais imposées : la reprogrammer (aujourd'hui,
// demain, ou une date choisie) ou la laisser de côté — elle reste consultable
// mais cesse de compter dans le rappel du haut.
// -----------------------------------------------------------------------------

import { useState } from "react";
import {
  AlarmClock,
  Archive,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { useTodoStore, type TodoItem } from "@/lib/todoStore";
import { addDays, dayKey, dayKeyOf, parseDayKey } from "@/lib/dateUtils";

const categoryChip: Record<string, string> = {
  Perso: "bg-ai-violet/15 text-ai-violet",
  Sport: "bg-energy/15 text-energy",
  Travail: "bg-warning/15 text-warning",
  Santé: "bg-primary/15 text-primary",
  Repas: "bg-primary/15 text-primary",
  Autre: "bg-secondary text-secondary-foreground",
};

/** "3 jours de retard" — le chiffre qui aide à décider, sans jugement. */
function lateBy(todo: TodoItem, now = new Date()): string {
  const key = dayKeyOf(todo.scheduledAt);
  if (!key) return "";
  const days = Math.round(
    (parseDayKey(dayKey(now)).getTime() - parseDayKey(key).getTime()) / 86_400_000
  );
  if (days <= 0) return "";
  if (days === 1) return "1 jour de retard";
  if (days < 30) return `${days} jours de retard`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 mois de retard" : `${months} mois de retard`;
}

const OverdueRow = ({ todo, setAside }: { todo: TodoItem; setAside: boolean }) => {
  const { toggleTodo, removeTodo, rescheduleToDay, setAsideTodo } = useTodoStore();
  const [pickDate, setPickDate] = useState(false);

  const late = lateBy(todo);

  return (
    <div className="rounded-xl border border-glass-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <button
          onClick={() => toggleTodo(todo.id)}
          className="shrink-0 mt-0.5"
          aria-label={`Marquer « ${todo.title} » comme faite`}
        >
          <CheckCircle2 className="w-[18px] h-[18px] text-muted-foreground hover:text-energy transition-colors" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground break-words">{todo.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                categoryChip[todo.category] || categoryChip.Autre
              }`}
            >
              {todo.category}
            </span>
            {todo.scheduledAt && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <CalendarClock className="w-2.5 h-2.5" />
                Prévue le{" "}
                {new Date(todo.scheduledAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
            {late && <span className="text-[9px] text-intensity">{late}</span>}
            {(todo.rescheduledCount ?? 0) > 0 && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <RotateCcw className="w-2.5 h-2.5" />
                reprogrammée {todo.rescheduledCount}×
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => removeTodo(todo.id)}
          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
          aria-label={`Supprimer « ${todo.title} »`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Décisions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => rescheduleToDay(todo.id, dayKey())}
          className="text-[10px] px-2.5 py-1 rounded-full bg-energy/15 text-energy font-medium hover:bg-energy/25 transition-colors"
        >
          Aujourd'hui
        </button>
        <button
          onClick={() => rescheduleToDay(todo.id, dayKey(addDays(new Date(), 1)))}
          className="text-[10px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors"
        >
          Demain
        </button>
        <button
          onClick={() => setPickDate((v) => !v)}
          className="text-[10px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors"
        >
          Autre date
        </button>
        {setAside ? (
          <button
            onClick={() => setAsideTodo(todo.id, false)}
            className="text-[10px] px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Undo2 className="w-2.5 h-2.5" />
            Remettre à rattraper
          </button>
        ) : (
          <button
            onClick={() => setAsideTodo(todo.id, true)}
            className="text-[10px] px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Archive className="w-2.5 h-2.5" />
            Laisser là
          </button>
        )}
      </div>

      {pickDate && (
        <input
          type="date"
          autoFocus
          defaultValue={dayKey()}
          onChange={(e) => {
            if (!e.target.value) return;
            rescheduleToDay(todo.id, e.target.value);
            setPickDate(false);
          }}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-energy"
          aria-label="Choisir une nouvelle date"
        />
      )}
    </div>
  );
};

const OverdueTasks = ({
  overdue,
  setAside,
}: {
  overdue: TodoItem[];
  setAside: TodoItem[];
}) => {
  const [open, setOpen] = useState(false);
  const [showSetAside, setShowSetAside] = useState(false);
  const { rescheduleToDay } = useTodoStore();

  if (overdue.length === 0 && setAside.length === 0) return null;

  const today = dayKey();

  return (
    <div className="glass-card p-4 space-y-3 border-warning/25">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-warning/15 flex items-center justify-center">
            <AlarmClock className="w-3.5 h-3.5 text-warning" />
          </span>
          <span className="text-left">
            <span className="block text-sm font-semibold text-foreground">À rattraper</span>
            <span className="block text-[10px] text-muted-foreground">
              {overdue.length > 0
                ? `${overdue.length} tâche${overdue.length > 1 ? "s" : ""} passée${
                    overdue.length > 1 ? "s" : ""
                  } de leur jour prévu`
                : `${setAside.length} laissée${setAside.length > 1 ? "s" : ""} de côté`}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {overdue.length > 0 && (
            <span className="text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
              {overdue.length}
            </span>
          )}
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </span>
      </button>

      {open && (
        <div className="space-y-2 animate-fade-in">
          {overdue.length > 1 && (
            <button
              onClick={() => overdue.forEach((t) => rescheduleToDay(t.id, today))}
              className="w-full text-[11px] py-2 rounded-xl bg-energy/10 text-energy font-medium hover:bg-energy/20 transition-colors"
            >
              Tout reprogrammer à aujourd'hui
            </button>
          )}

          {overdue.map((todo) => (
            <OverdueRow key={todo.id} todo={todo} setAside={false} />
          ))}

          {overdue.length === 0 && setAside.length > 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Rien à rattraper — tout est soit fait, soit assumé.
            </p>
          )}

          {setAside.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setShowSetAside((v) => !v)}
                className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showSetAside ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                <span className="font-semibold uppercase tracking-wider">
                  Laissées de côté ({setAside.length})
                </span>
              </button>
              {showSetAside && (
                <div className="space-y-2 mt-2">
                  {setAside.map((todo) => (
                    <OverdueRow key={todo.id} todo={todo} setAside />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OverdueTasks;
