import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/profileStore";

export interface EffortSession {
  id: string;
  device_id: string;
  duration_minutes: number;
  intensity: string;
  logged_at: string;
  day_date: string;
  journal_text: string | null;
  followup_notes: string[];
  ai_analysis: SportAnalysis | null;
  analyzed_at: string | null;
  session_type_detected: string | null;
  intensity_level: string | null;
}

export interface SportAnalysis {
  sessionType: string;
  intensityLevel: "Low" | "Moderate" | "High" | "Maximum";
  estimatedLoad: number;
  recoveryImpact: string;
  coachFeedback: string;
  improvements: string[];
  nextSessionAdvice: string;
  performanceCurveImpact: number;
  weeklyProgressNote: string;
  strengthPattern: string | null;
  improvementFocus: string;
}

export const SPORT_ICONS: Record<string, string> = {
  Musculation: "🏋️",
  "Course": "🏃",
  "Running": "🏃",
  Cyclisme: "🚴",
  Natation: "🏊",
  Yoga: "🧘",
  Pilates: "🧘",
  Football: "⚽",
  Basketball: "🏀",
  Tennis: "🎾",
  Boxe: "🥊",
  "Arts martiaux": "🥊",
  Randonnée: "🥾",
  HIIT: "⚡",
  CrossFit: "⚡",
};

export function getSportIcon(type: string | null): string {
  if (!type) return "💪";
  for (const [key, icon] of Object.entries(SPORT_ICONS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "💪";
}

interface EffortStore {
  sessions: EffortSession[];
  loading: boolean;
  loadSessions: () => Promise<void>;
  loadWeekSessions: () => Promise<EffortSession[]>;
  saveSession: (duration: number, intensity: string) => Promise<EffortSession | null>;
  updateJournal: (sessionId: string, text: string) => Promise<void>;
  saveAnalysis: (sessionId: string, analysis: SportAnalysis) => Promise<void>;
  addFollowupNote: (sessionId: string, note: string) => Promise<void>;
}

export const useEffortStore = create<EffortStore>((set, get) => ({
  sessions: [],
  loading: false,

  loadSessions: async () => {
    set({ loading: true });
    const deviceId = getDeviceId();
    const { data } = await supabase
      .from("effort_sessions")
      .select("*")
      .eq("device_id", deviceId)
      .order("logged_at", { ascending: false })
      .limit(50);

    if (data) {
      set({ sessions: data as unknown as EffortSession[], loading: false });
    } else {
      set({ loading: false });
    }
  },

  loadWeekSessions: async () => {
    const deviceId = getDeviceId();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data } = await supabase
      .from("effort_sessions")
      .select("*")
      .eq("device_id", deviceId)
      .gte("day_date", weekAgo.toISOString().slice(0, 10))
      .order("logged_at", { ascending: true });
    return (data as unknown as EffortSession[]) || [];
  },

  saveSession: async (duration, intensity) => {
    const deviceId = getDeviceId();
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const { data, error } = await supabase
      .from("effort_sessions")
      .insert({
        device_id: deviceId,
        duration_minutes: duration,
        intensity,
        logged_at: now,
        day_date: today,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Save effort error:", error);
      return null;
    }

    const session = data as unknown as EffortSession;
    set((s) => ({ sessions: [session, ...s.sessions] }));
    return session;
  },

  updateJournal: async (sessionId, text) => {
    await supabase
      .from("effort_sessions")
      .update({ journal_text: text })
      .eq("id", sessionId);

    set((s) => ({
      sessions: s.sessions.map((ss) =>
        ss.id === sessionId ? { ...ss, journal_text: text } : ss
      ),
    }));
  },

  saveAnalysis: async (sessionId, analysis) => {
    const now = new Date().toISOString();
    await supabase
      .from("effort_sessions")
      .update({
        ai_analysis: analysis as any,
        analyzed_at: now,
        session_type_detected: analysis.sessionType,
        intensity_level: analysis.intensityLevel,
      })
      .eq("id", sessionId);

    set((s) => ({
      sessions: s.sessions.map((ss) =>
        ss.id === sessionId
          ? {
              ...ss,
              ai_analysis: analysis,
              analyzed_at: now,
              session_type_detected: analysis.sessionType,
              intensity_level: analysis.intensityLevel,
            }
          : ss
      ),
    }));
  },

  addFollowupNote: async (sessionId, note) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const notes = [...(session.followup_notes || []), note];

    await supabase
      .from("effort_sessions")
      .update({ followup_notes: notes })
      .eq("id", sessionId);

    set((s) => ({
      sessions: s.sessions.map((ss) =>
        ss.id === sessionId ? { ...ss, followup_notes: notes } : ss
      ),
    }));
  },
}));
