// NOTE: True system-level app blocking requires a native Android app
// with AccessibilityService, or iOS native app with Screen Time API.
// This web implementation provides the best possible focus experience
// within browser constraints (Wake Lock, beforeunload warning,
// full-screen overlay).
// Future v2.0: React Native migration with expo-screen-capture
// and native focus mode APIs.

import { useState, useEffect, useCallback, useRef } from "react";
import { useTodoStore, type TodoItem } from "@/lib/todoStore";
import { supabase } from "@/integrations/supabase/client";
import { playFocusSound, stopFocusSound, type FocusSound } from "@/lib/focusAudio";
import confetti from "canvas-confetti";
import { VolumeX, Waves, Brain } from "lucide-react";

const MAX_TIME = 900; // 15 min
const EXTENSION_TIME = 300; // 5 min

// ── Permission Modal ──
const PermissionModal = ({
  task,
  onAccept,
  onDismiss,
}: {
  task: TodoItem;
  onAccept: () => void;
  onDismiss: () => void;
}) => (
  <div className="fixed inset-0 z-[9998] bg-black/90 flex items-center justify-center p-6">
    <div className="glass-card p-8 max-w-sm w-full text-center space-y-5 animate-fade-in">
      <div className="w-16 h-16 mx-auto rounded-full bg-energy/15 flex items-center justify-center">
        <span className="text-3xl">🎯</span>
      </div>
      <h2 className="text-xl font-bold text-foreground">
        Temps de focus — {task.title}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Bio-Flow va bloquer toutes les distractions pendant 15 minutes maximum
        pour t'aider à terminer cette tâche.
      </p>
      <div className="space-y-3 pt-2">
        <button
          onClick={onAccept}
          className="w-full py-3 rounded-xl bg-energy text-background font-semibold text-sm hover:bg-energy/90 transition-colors"
        >
          Activer le focus
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-xl text-muted-foreground text-sm hover:text-foreground transition-colors"
        >
          Pas maintenant
        </button>
      </div>
    </div>
  </div>
);

// ── Celebration Screen ──
const CelebrationScreen = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#00E5C3", "#A78BFA", "#FBBF24"],
    });
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{ background: "#090F0D" }}>
      {/* Animated checkmark */}
      <svg viewBox="0 0 100 100" className="w-28 h-28 mb-6">
        <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--energy))" strokeWidth="3" opacity="0.3" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke="hsl(var(--energy))" strokeWidth="3"
          strokeDasharray="283"
          strokeDashoffset="0"
          className="animate-[draw_0.6s_ease-out]"
        />
        <path
          d="M30 52 L45 67 L72 35"
          fill="none" stroke="hsl(var(--energy))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="60"
          strokeDashoffset="0"
          className="animate-[draw_0.4s_0.5s_ease-out_both]"
        />
      </svg>
      <p className="text-xl font-bold text-white">Bien joué.</p>
      <p className="text-sm text-white/60 mt-1">+1 tâche accomplie.</p>
    </div>
  );
};

// ── Timer Expired Modal ──
const TimerExpiredModal = ({
  onCompleted,
  onMoreTime,
  canExtend,
}: {
  onCompleted: () => void;
  onMoreTime: () => void;
  canExtend: boolean;
}) => (
  <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-6">
    <div className="glass-card p-8 max-w-sm w-full text-center space-y-5 animate-fade-in">
      <span className="text-4xl">⏰</span>
      <h2 className="text-lg font-bold text-foreground">
        Temps écoulé. As-tu terminé la tâche ?
      </h2>
      <div className="space-y-3">
        <button
          onClick={onCompleted}
          className="w-full py-3 rounded-xl bg-energy text-background font-semibold text-sm"
        >
          Oui, terminée
        </button>
        {canExtend && (
          <button
            onClick={onMoreTime}
            className="w-full py-3 rounded-xl bg-muted text-foreground text-sm font-medium"
          >
            J'ai besoin de plus de temps
          </button>
        )}
      </div>
    </div>
  </div>
);

// ── Focus Overlay ──
const FocusOverlay = ({
  task,
  timeLeft,
  totalTime,
  sound,
  onSoundChange,
  onComplete,
  onAbandon,
}: {
  task: TodoItem;
  timeLeft: number;
  totalTime: number;
  sound: FocusSound;
  onSoundChange: (s: FocusSound) => void;
  onComplete: () => void;
  onAbandon: () => void;
}) => {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / totalTime;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6" style={{ background: "#090F0D" }}>
      {/* Task name */}
      <p className="text-2xl font-bold text-white mb-10 text-center max-w-xs">
        {task.title}
      </p>

      {/* Circular timer */}
      <div className="relative w-52 h-52 mb-8">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--energy) / 0.15)" strokeWidth="6" />
          <circle
            cx="100" cy="100" r={radius} fill="none"
            stroke="hsl(var(--energy))" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="mono text-4xl font-bold text-white tracking-wider">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Pulsing status */}
      <div className="flex items-center gap-2 mb-10">
        <span className="w-2 h-2 rounded-full bg-energy animate-pulse" />
        <span className="text-sm text-white/50">Focus en cours...</span>
      </div>

      {/* Sound options */}
      <div className="flex gap-4 mb-12">
        {([
          { key: "silence" as FocusSound, icon: VolumeX, label: "Silence" },
          { key: "whitenoise" as FocusSound, icon: Waves, label: "White noise" },
          { key: "beats" as FocusSound, icon: Brain, label: "Focus beats" },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => onSoundChange(key)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              sound === key ? "bg-energy/15 text-energy" : "text-white/30 hover:text-white/60"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
      </div>

      {/* Complete button */}
      <button
        onClick={onComplete}
        className="w-full max-w-xs py-3.5 rounded-2xl bg-energy text-background font-semibold text-sm mb-4"
      >
        Tâche terminée ✓
      </button>

      {/* Abandon link */}
      <button onClick={onAbandon} className="text-xs text-white/20 hover:text-white/40 transition-colors">
        Abandonner
      </button>
    </div>
  );
};

// ── Main FocusLock Controller ──
type FocusState = "idle" | "permission" | "focusing" | "expired" | "celebration";

const FocusLock = () => {
  const { todos, toggleTodo } = useTodoStore();
  const [state, setState] = useState<FocusState>("idle");
  const [activeTask, setActiveTask] = useState<TodoItem | null>(null);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME);
  const [totalTime, setTotalTime] = useState(MAX_TIME);
  const [sound, setSound] = useState<FocusSound>("silence");
  const [hasExtended, setHasExtended] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Trigger: check every 30s if a scheduled task matches now ──
  useEffect(() => {
    const check = () => {
      if (state !== "idle") return;
      const now = new Date();
      for (const todo of todos) {
        if (todo.done || !todo.scheduledAt || dismissedIds.has(todo.id)) continue;
        const scheduled = new Date(todo.scheduledAt);
        const diffMs = Math.abs(now.getTime() - scheduled.getTime());
        if (diffMs <= 60_000) {
          setActiveTask(todo);
          setState("permission");
          return;
        }
      }
    };
    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, [todos, state, dismissedIds]);

  // ── beforeunload warning ──
  useEffect(() => {
    if (state !== "focusing") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Tu es en session Focus — ta tâche n'est pas encore terminée.";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state]);

  // ── Countdown timer ──
  useEffect(() => {
    if (state !== "focusing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setState("expired");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, totalTime]);

  const requestWakeLock = async () => {
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {}
  };

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {}
    wakeLockRef.current = null;
  };

  const logSession = async (completed: boolean, abandoned: boolean) => {
    if (!activeTask || !sessionStartRef.current) return;
    const ended = new Date();
    const duration = Math.round((ended.getTime() - sessionStartRef.current.getTime()) / 1000);
    try {
      await supabase.from("focus_sessions").insert({
        task_id: activeTask.id,
        started_at: sessionStartRef.current.toISOString(),
        ended_at: ended.toISOString(),
        duration_seconds: duration,
        completed,
        abandoned,
      });
    } catch {}
  };

  const handleAccept = async () => {
    await requestWakeLock();
    sessionStartRef.current = new Date();
    setTimeLeft(MAX_TIME);
    setTotalTime(MAX_TIME);
    setHasExtended(false);
    setState("focusing");
  };

  const handleDismiss = () => {
    if (activeTask) setDismissedIds((s) => new Set(s).add(activeTask.id));
    setActiveTask(null);
    setState("idle");
  };

  const handleComplete = async () => {
    stopFocusSound();
    await releaseWakeLock();
    if (activeTask) toggleTodo(activeTask.id);
    await logSession(true, false);
    setState("celebration");
  };

  const handleAbandon = async () => {
    stopFocusSound();
    await releaseWakeLock();
    await logSession(false, true);
    cleanup();
  };

  const handleMoreTime = () => {
    setTimeLeft(EXTENSION_TIME);
    setTotalTime(EXTENSION_TIME);
    setHasExtended(true);
    setState("focusing");
  };

  const handleTimerCompleted = async () => {
    stopFocusSound();
    await releaseWakeLock();
    if (activeTask) toggleTodo(activeTask.id);
    await logSession(true, false);
    setState("celebration");
  };

  const handleSoundChange = (s: FocusSound) => {
    setSound(s);
    playFocusSound(s);
  };

  const cleanup = useCallback(() => {
    setActiveTask(null);
    setState("idle");
    setSound("silence");
    stopFocusSound();
  }, []);

  if (state === "idle" || !activeTask) return null;

  if (state === "permission") {
    return <PermissionModal task={activeTask} onAccept={handleAccept} onDismiss={handleDismiss} />;
  }

  if (state === "focusing") {
    return (
      <FocusOverlay
        task={activeTask}
        timeLeft={timeLeft}
        totalTime={totalTime}
        sound={sound}
        onSoundChange={handleSoundChange}
        onComplete={handleComplete}
        onAbandon={handleAbandon}
      />
    );
  }

  if (state === "expired") {
    return (
      <TimerExpiredModal
        onCompleted={handleTimerCompleted}
        onMoreTime={handleMoreTime}
        canExtend={!hasExtended}
      />
    );
  }

  if (state === "celebration") {
    return <CelebrationScreen onDone={cleanup} />;
  }

  return null;
};

export default FocusLock;
