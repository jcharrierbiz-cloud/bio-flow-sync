import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/profileStore";

// Tables qui contiennent des données personnelles de l'utilisateur.
const USER_TABLES = [
  "scan_sessions",
  "effort_sessions",
  "daily_nutrition_logs",
  "weekly_summaries",
  "focus_sessions",
  "user_profiles",
] as const;

/**
 * Rattache les anciennes données (créées par device_id, avant l'authentification)
 * au compte actuellement connecté. À appeler une fois après le login.
 * S'appuie sur la fonction SQL `claim_device_data` (SECURITY DEFINER).
 */
export async function claimLegacyData(): Promise<void> {
  try {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    await supabase.rpc("claim_device_data", { p_device_id: deviceId });
  } catch (e) {
    console.error("claimLegacyData error:", e);
  }
}

/**
 * Export RGPD : télécharge un JSON de toutes les données de l'utilisateur.
 * Tente d'abord la fonction edge `export-my-data` ; si elle n'est pas déployée,
 * reconstruit l'export côté client (RLS garantit qu'on ne voit que ses données).
 */
export async function exportMyData(): Promise<void> {
  let payload: unknown = null;

  try {
    const { data, error } = await supabase.functions.invoke("export-my-data");
    if (!error && data && !(data as any).error) payload = data;
  } catch {
    /* fonction non déployée — on bascule sur le fallback client */
  }

  if (!payload) {
    const { data: { user } } = await supabase.auth.getUser();
    const out: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      account: user ? { id: user.id, email: user.email } : null,
    };
    for (const t of USER_TABLES) {
      const { data } = await supabase.from(t).select("*");
      out[t] = data ?? [];
    }
    payload = out;
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bioflow-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Suppression de compte (RGPD art. 17).
 * 1) Efface immédiatement toutes les données (RLS autorise à supprimer SES lignes) —
 *    fonctionne dès aujourd'hui, sans déploiement.
 * 2) Best-effort : appelle la fonction edge `delete-account` pour supprimer aussi
 *    le compte d'authentification (email/mot de passe). Sans elle, les données sont
 *    déjà effacées ; seul l'identifiant de connexion subsiste jusqu'au déploiement.
 * 3) Nettoie le cache local et déconnecte.
 */
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Non connecté." };

    for (const t of USER_TABLES) {
      const { error } = await supabase.from(t).delete().eq("user_id", user.id);
      if (error) console.error(`delete ${t}:`, error.message);
    }

    try {
      await supabase.functions.invoke("delete-account");
    } catch {
      /* fonction non déployée : les données sont déjà supprimées ci-dessus */
    }

    try {
      [
        "bioflow_profile_cache", "bioflow_xp", "bioflow_streak",
        "bioflow_xp_daily", "bioflow_xp_categories",
      ].forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }

    await supabase.auth.signOut();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}
