import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const AUDIO_PREF_KEY = "bioflow_audio_greeting";
const AUDIO_PLAYED_KEY = "bioflow_audio_played_date";
const NAME_KEY = "bioflow_user_name";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

interface GreetingData {
  dateLabel: string;
  greeting: string;
  emoji: string;
  timeOfDay: TimeOfDay;
  userName: string;
  audioEnabled: boolean;
  shouldPlayAudio: boolean;
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function getGreeting(tod: TimeOfDay): { text: string; emoji: string } {
  switch (tod) {
    case "morning":
      return { text: "Bonjour", emoji: "👋" };
    case "afternoon":
      return { text: "Bon après-midi", emoji: "☀️" };
    case "evening":
      return { text: "Bonsoir", emoji: "🌇" };
    case "night":
      return { text: "Bonne nuit", emoji: "🌙" };
  }
}

export function getUserName(): string {
  return localStorage.getItem(NAME_KEY) || "Alex";
}

export function setUserName(name: string) {
  localStorage.setItem(NAME_KEY, name);
}

export function isAudioGreetingEnabled(): boolean {
  return localStorage.getItem(AUDIO_PREF_KEY) === "true";
}

export function setAudioGreetingEnabled(enabled: boolean) {
  localStorage.setItem(AUDIO_PREF_KEY, enabled ? "true" : "false");
}

function hasPlayedAudioToday(): boolean {
  return localStorage.getItem(AUDIO_PLAYED_KEY) === new Date().toISOString().slice(0, 10);
}

function markAudioPlayed() {
  localStorage.setItem(AUDIO_PLAYED_KEY, new Date().toISOString().slice(0, 10));
}

export function useGreeting() {
  const [data, setData] = useState<GreetingData>(() => {
    const now = new Date();
    const tod = getTimeOfDay(now.getHours());
    const g = getGreeting(tod);
    return {
      dateLabel: format(now, "EEEE d MMMM", { locale: fr }),
      greeting: g.text,
      emoji: g.emoji,
      timeOfDay: tod,
      userName: getUserName(),
      audioEnabled: isAudioGreetingEnabled(),
      shouldPlayAudio: isAudioGreetingEnabled() && !hasPlayedAudioToday(),
    };
  });

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const tod = getTimeOfDay(now.getHours());
      const g = getGreeting(tod);
      setData((prev) => ({
        ...prev,
        dateLabel: format(now, "EEEE d MMMM", { locale: fr }),
        greeting: g.text,
        emoji: g.emoji,
        timeOfDay: tod,
      }));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const markPlayed = useCallback(() => {
    markAudioPlayed();
    setData((prev) => ({ ...prev, shouldPlayAudio: false }));
  }, []);

  return { ...data, markPlayed };
}
