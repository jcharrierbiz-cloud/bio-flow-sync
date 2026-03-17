import { supabase } from "@/integrations/supabase/client";

const DEVICE_ID_KEY = "bioflow_device_id";
const PROFILE_CACHE_KEY = "bioflow_profile_cache";

export interface UserProfile {
  id?: string;
  device_id: string;
  pseudo: string;
  age: number;
  weight?: number | null;
  weight_unit: "kg" | "lbs";
  height?: number | null;
  height_unit: "cm" | "ft";
  fitness_level: string;
  organization_level: string;
  status: string;
  main_goal: string;
  goal_details?: string;
  ai_coach_config?: Record<string, any> | null;
  onboarding_completed: boolean;
  audio_greeting_enabled: boolean;
  notification_enabled: boolean;
  reminder_minutes: number;
  morning_scan_enabled: boolean;
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

export async function fetchProfile(): Promise<UserProfile | null> {
  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error || !data) return getCachedProfile();
  
  const profile: UserProfile = {
    id: data.id,
    device_id: data.device_id || deviceId,
    pseudo: data.pseudo,
    age: data.age,
    weight: data.weight,
    weight_unit: (data.weight_unit as "kg" | "lbs") || "kg",
    height: data.height,
    height_unit: (data.height_unit as "cm" | "ft") || "cm",
    fitness_level: data.fitness_level || "",
    organization_level: data.organization_level || "",
    status: data.status || "",
    main_goal: data.main_goal || "",
    goal_details: data.goal_details || "",
    ai_coach_config: data.ai_coach_config as Record<string, unknown> | null,
    onboarding_completed: data.onboarding_completed,
    audio_greeting_enabled: data.audio_greeting_enabled,
    notification_enabled: data.notification_enabled,
    reminder_minutes: data.reminder_minutes,
    morning_scan_enabled: data.morning_scan_enabled,
  };
  cacheProfile(profile);
  return profile;
}

export async function saveProfile(profile: Omit<UserProfile, "id">): Promise<UserProfile | null> {
  const deviceId = getDeviceId();

  // Check if profile exists
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ ...profile, device_id: deviceId })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("Update profile error:", error); return null; }
    const updated = { ...profile, id: data.id } as UserProfile;
    cacheProfile(updated);
    return updated;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .insert({ ...profile, device_id: deviceId })
    .select()
    .single();
  if (error) { console.error("Insert profile error:", error); return null; }
  const created = { ...profile, id: data.id } as UserProfile;
  cacheProfile(created);
  return created;
}

export async function updateProfileField(field: string, value: unknown): Promise<void> {
  const deviceId = getDeviceId();
  const { error } = await supabase
    .from("user_profiles")
    .update({ [field]: value })
    .eq("device_id", deviceId);
  if (error) console.error("Update field error:", error);
  
  // Update cache
  const cached = getCachedProfile();
  if (cached) {
    (cached as Record<string, unknown>)[field] = value;
    cacheProfile(cached);
  }
}

export function isOnboardingComplete(): boolean {
  const cached = getCachedProfile();
  if (cached?.onboarding_completed) return true;
  // Fallback to old localStorage check
  return localStorage.getItem("bioflow_onboarded") === "true";
}
