import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client"; // adapte si ton chemin diffère

export function useFocusSession() {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    startRef.current = Date.now();
    setElapsed(0);
    setActive(true);
    timerRef.current = setInterval(() => {
      if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  }, []);

  const end = useCallback(async (completed: boolean, targetSeconds?: number, label?: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false);
    const startedAtMs = startRef.current;
    startRef.current = null;
    if (!startedAtMs) return null;

    const duration = Math.floor((Date.now() - startedAtMs) / 1000);
    if (duration < 10) return null; // anti-bruit : pas de faux-clic loggé

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: user.id,
        started_at: new Date(startedAtMs).toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        target_seconds: targetSeconds ?? null,
        completed,
        label: label ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("[focus] échec log", error);
      return null;
    }
    return data;
  }, []);

  const abandon = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false);
    startRef.current = null;
  }, []);

  return { active, elapsed, start, end, abandon };
}
