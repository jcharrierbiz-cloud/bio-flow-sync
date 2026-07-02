import { supabase } from "@/integrations/supabase/client";

const DEVICE_ID_KEY = "bioflow_device_id";
const PROFILE_CACHE_KEY = "bioflow_profile_cache";

export interface UserProfile {
  id?: string;
  device_id: string;
  pseudo: string;
  age: number;
  // Sexe biologique déclaré. Optionnel (l'onboarding ne le collecte pas encore),
  // renseignable dans Réglages. Utile aux interprétations FC/VFC & au coach.
  sex?: "male" | "female" | "unspecified";
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

/** Identifiant du compte authentifié (null si non connecté). */
export async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
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

function mapRow(data: any, deviceId: string): UserProfile {
  return {
    id: data.id,
    device_id: data.device_id || deviceId,
    pseudo: data.pseudo,
    age: data.age,
    sex: (data.sex as "male" | "female" | "unspecified") || "unspecified",
    weight: data.weight,
    weight_unit: (data.weight_unit as "kg" | "lbs") || "kg",
    height: data.height,
    height_unit: (data.height_unit as "cm" | "ft") || "cm",
    fitness_level: data.fitness_level || "",
    sport_history: data.sport_history || "",
    organization_level: data.organization_level || "",
    status: data.status || "",
    schedule: data.schedule || data.status || "",
    workload: data.workload || data.organization_level || "",
    main_goal: data.main_goal || "",
    goal_details: data.goal_details || "",
    ai_coach_config: data.ai_coach_config as Record<string, unknown> | null,
    onboarding_completed: data.onboarding_completed,
    audio_greeting_enabled: data.audio_greeting_enabled,
    notification_enabled: data.notification_enabled,
    reminder_minutes: data.reminder_minutes,
    morning_scan_enabled: data.morning_scan_enabled,
    focus_lock_enabled: data.focus_lock_enabled || false,
    blocked_categories: data.blocked_categories || [],
    parental_consent: data.parental_consent ?? null,
    consent_age: data.consent_age ?? null,
  };
}

export async function fetchProfile(): Promise<UserProfile | null> {
  const deviceId = getDeviceId();
  const userId = await getUserId();

  let data: any = null;

  // 1) Source de vérité : le profil rattaché au compte.
  if (userId) {
    const res = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    data = res.data;
  }

  // 2) Fallback legacy : profil créé par device_id, pas encore réclamé.
  if (!data) {
    const res = await supabase
      .from("user_profiles")
      .select("*")
      .eq("device_id", deviceId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    data = res.data;
  }

  if (!data) return getCachedProfile();

  const profile = mapRow(data, deviceId);
  cacheProfile(profile);
  return profile;
}

export async function saveProfile(profile: Omit<UserProfile, "id">): Promise<UserProfile | null> {
  const deviceId = getDeviceId();
  const userId = await getUserId();

  const dbPayload: any = {
    device_id: deviceId,
    user_id: userId, // rattache la ligne au compte (le défaut SQL auth.uid() prend aussi le relais)
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

  // N'envoie `sex` que s'il est défini → évite toute erreur si la migration
  // qui ajoute la colonne n'a pas encore été exécutée (l'onboarding ne le fixe pas).
  if (profile.sex !== undefined) dbPayload.sex = profile.sex;

  // Cherche un profil existant : par compte d'abord, sinon par appareil.
  let existing: { id: string } | null = null;
  if (userId) {
    const r = await supabase
      .from("user_profiles").select("id").eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    existing = r.data;
  }
  if (!existing) {
    const r = await supabase
      .from("user_profiles").select("id").eq("device_id", deviceId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    existing = r.data;
  }

  if (existing) {
    const { data, error } = await supabase
      .from("user_profiles").update(dbPayload).eq("id", existing.id).select().single();
    if (error) { console.error("Update profile error:", error); return null; }
    const updated = { ...profile, id: data.id } as UserProfile;
    cacheProfile(updated);
    return updated;
  }

  const { data, error } = await supabase
    .from("user_profiles").insert(dbPayload).select().single();
  if (error) { console.error("Insert profile error:", error); return null; }
  const created = { ...profile, id: data.id } as UserProfile;
  cacheProfile(created);
  return created;
}

/**
 * Met à jour UN champ du profil et le persiste.
 *
 * Robuste : cible la ligne par son `id` (comme saveProfile) au lieu de filtrer
 * aveuglément par user_id/device_id. Un `UPDATE ... .eq("user_id")` ne matchait
 * AUCUNE ligne quand le profil n'existait pas encore en base (onboarding qui n'a
 * créé qu'un cache local) → la modification (poids, taille, sexe, niveau sportif…)
 * était perdue en silence. Ici, si aucune ligne n'existe, on la CRÉE via
 * saveProfile au lieu de perdre la valeur.
 *
 * Retourne `true` si la persistance a réussi, `false` sinon (l'UI peut alerter).
 */
export async function updateProfileField(field: string, value: unknown): Promise<boolean> {
  const deviceId = getDeviceId();
  const userId = await getUserId();

  // 1) Retrouver la ligne existante : compte d'abord, puis appareil (legacy).
  let existing: { id: string } | null = null;
  if (userId) {
    const r = await supabase
      .from("user_profiles").select("id").eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    existing = r.data;
  }
  if (!existing) {
    const r = await supabase
      .from("user_profiles").select("id").eq("device_id", deviceId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    existing = r.data;
  }

  let ok = false;

  if (existing) {
    // 2a) Update ciblé par id (+ rattache la ligne au compte si orpheline).
    const payload: Record<string, unknown> = { [field]: value };
    if (userId) payload.user_id = userId;
    const { error } = await supabase
      .from("user_profiles").update(payload).eq("id", existing.id);
    if (error) console.error("Update field error:", error);
    else ok = true;
  } else {
    // 2b) Aucune ligne : on crée le profil (cache si dispo, sinon défauts) + champ.
    const base: UserProfile = getCachedProfile() ?? {
      device_id: deviceId,
      pseudo: "",
      age: 0,
      weight: null,
      weight_unit: "kg",
      height: null,
      height_unit: "cm",
      fitness_level: "",
      organization_level: "",
      status: "",
      main_goal: "",
      onboarding_completed: true,
      audio_greeting_enabled: false,
      notification_enabled: false,
      reminder_minutes: 10,
      morning_scan_enabled: false,
      focus_lock_enabled: false,
      blocked_categories: [],
    };
    const saved = await saveProfile({ ...base, [field]: value });
    ok = saved !== null;
  }

  // 3) Cache local à jour dans tous les cas (l'UI optimiste est faite en amont).
  const cached = getCachedProfile();
  if (cached) {
    (cached as any)[field] = value;
    cacheProfile(cached);
  }

  return ok;
}

export function isOnboardingComplete(): boolean {
  const cached = getCachedProfile();
  if (cached?.onboarding_completed) return true;
  return localStorage.getItem("bioflow_onboarded") === "true";
}
