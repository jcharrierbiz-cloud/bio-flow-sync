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
  sport_history?: string;
  organization_level: string;
  status: string;
  schedule?: string;
  workload?: string;
  main_goal: string;
  goal_details?: string;
  ai_coach_config?: Record<string, any> | null;
  onboarding_completed: boolean;
  audio_greeting_enabled: boolean;
  notification_enabled: boolean;
  reminder_minutes: number;
  morning_scan_enabled: boolean;
  focus_lock_enabled: boolean;
  blocked_categories: string[];
  parental_consent?: boolean | null;
  consent_age?: number | null;
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
    sport_history: (data as any).sport_history || "",
    organization_level: data.organization_level || "",
    status: data.status || "",
    schedule: (data as any).schedule || data.status || "",
    workload: (data as any).workload || data.organization_level || "",
    main_goal: data.main_goal || "",
    goal_details: data.goal_details || "",
    ai_coach_config: data.ai_coach_config as Record<string, unknown> | null,
    onboarding_completed: data.onboarding_completed,
    audio_greeting_enabled: data.audio_greeting_enabled,
    notification_enabled: data.notification_enabled,
    reminder_minutes: data.reminder_minutes,
    morning_scan_enabled: data.morning_scan_enabled,
    focus_lock_enabled: (data as any).focus_lock_enabled || false,
    blocked_categories: (data as any).blocked_categories || [],
    parental_consent: (data as any).parental_consent ?? null,
    consent_age: (data as any).consent_age ?? null,
  };
  cacheProfile(profile);
  return profile;
}

export async function saveProfile(profile: Omit<UserProfile, "id">): Promise<UserProfile | null> {
  const deviceId = getDeviceId();

  const dbPayload: any = {
    device_id: deviceId,
    pseudo: profile.pseudo,
    age: profile.age,
    weight: profile.weight,
    weight_unit: profile.weight_unit,
    height: profile.height,
    height_unit: profile.height_unit,
    fitness_level: profile.fitness_level,
    sport_history: profile.sport_history,
    organization_level: profile.organization_level,
    status: profile.status,
    schedule: profile.schedule,
    workload: profile.workload,
    main_goal: profile.main_goal,
    goal_details: profile.goal_details,
    ai_coach_config: profile.ai_coach_config,
    onboarding_completed: profile.onboarding_completed,
    audio_greeting_enabled: profile.audio_greeting_enabled,
    notification_enabled: profile.notification_enabled,
    reminder_minutes: profile.reminder_minutes,
    morning_scan_enabled: profile.morning_scan_enabled,
    focus_lock_enabled: profile.focus_lock_enabled,
    blocked_categories: profile.blocked_categories,
    parental_consent: profile.parental_consent ?? null,
    consent_age: profile.consent_age ?? null,
  };

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(dbPayload)
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
    .insert(dbPayload)
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
  
  const cached = getCachedProfile();
  if (cached) {
    (cached as any)[field] = value;
    cacheProfile(cached);
  }
}

export function isOnboardingComplete(): boolean {
  const cached = getCachedProfile();
  if (cached?.onboarding_completed) return true;
  return localStorage.getItem("bioflow_onboarded") === "true";
}
