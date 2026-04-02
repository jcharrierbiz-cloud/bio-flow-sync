import { useState, useEffect } from "react";
import { Lock, Edit2, RotateCcw } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { getCachedProfile, updateProfileField, type UserProfile } from "@/lib/profileStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sportLevelLabels: Record<string, string> = {
  sedentary: "🛋 Sédentaire",
  beginner: "🚶 Débutant",
  intermediate: "💪 Intermédiaire",
  advanced: "🔥 Avancé",
  athlete: "⚡ Athlète",
};

const scheduleLabels: Record<string, string> = {
  student: "📚 Étudiant",
  working: "💼 En activité",
  both: "🔄 Étudiant et travailleur",
  entrepreneur: "🚀 Entrepreneur",
  flexible: "🌱 Flexible",
};

const workloadLabels: Record<string, string> = {
  heavy: "😤 Chargé",
  moderate: "😐 Modéré",
  light: "😌 Léger",
};

const ProfileDrawer = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setProfile(getCachedProfile());
  }, [open]);

  if (!profile?.onboarding_completed) return null;

  const displayPseudo = profile.pseudo;
  const initial = displayPseudo.charAt(0).toUpperCase();
  const truncPseudo = displayPseudo.length > 8 ? displayPseudo.slice(0, 8) + "…" : displayPseudo;

  const startEdit = (field: string, val: string | number | null | undefined) => {
    setEditField(field);
    setEditValue(String(val || ""));
  };

  const saveEdit = async (field: string) => {
    let value: any = editValue;
    if (field === "weight" || field === "height") value = editValue ? Number(editValue) : null;
    await updateProfileField(field, value);
    setProfile({ ...profile, [field]: value } as UserProfile);
    setEditField(null);
  };

  const toggleFocusLock = async () => {
    const newVal = !profile.focus_lock_enabled;
    await updateProfileField("focus_lock_enabled", newVal);
    setProfile({ ...profile, focus_lock_enabled: newVal });
  };

  const toggleCategory = async (cat: string) => {
    const current = profile.blocked_categories || [];
    const updated = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    await updateProfileField("blocked_categories", updated);
    setProfile({ ...profile, blocked_categories: updated });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await supabase.functions.invoke("analyze-profile", {
        body: {
          pseudo: profile.pseudo,
          age: profile.age,
          weight: profile.weight,
          weightUnit: profile.weight_unit,
          height: profile.height,
          heightUnit: profile.height_unit,
          sportLevel: profile.fitness_level,
          sportHistory: profile.sport_history,
          schedule: profile.schedule || profile.status,
          workload: profile.workload || profile.organization_level,
          mainGoal: profile.main_goal,
          goalDetail: profile.goal_details || "",
          focusLockEnabled: profile.focus_lock_enabled,
          blockedCategories: profile.blocked_categories || [],
        },
      });
      if (data?.config) {
        await updateProfileField("ai_coach_config", data.config);
        setProfile({ ...profile, ai_coach_config: data.config });
      }
      toast.success("Profil mis à jour — BIO s'adapte ✦");
      setOpen(false);
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
    setSaving(false);
  };

  const EditableField = ({ emoji, label, field, value, lookupMap }: {
    emoji: string; label: string; field: string; value: string | number | null | undefined; lookupMap?: Record<string, string>;
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm">{emoji}</span>
        {editField === field ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveEdit(field)}
            onBlur={() => saveEdit(field)}
            className="flex-1 bg-muted px-2 py-1.5 rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-xs text-foreground truncate">
              {lookupMap ? (lookupMap[String(value)] || String(value || "Non renseigné")) : String(value || "Non renseigné")}
            </p>
          </div>
        )}
      </div>
      {editField !== field && (
        <button onClick={() => startEdit(field, value)} className="text-muted-foreground hover:text-foreground p-1">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const LockedField = ({ emoji, label, value }: { emoji: string; label: string; value: string | number }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm">{emoji}</span>
        <div>
          <p className="text-[10px] text-muted-foreground">{label}</p>
          <p className="text-xs text-foreground">{value}</p>
        </div>
      </div>
      <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
    </div>
  );

  const createdDate = profile.id ? "membre Bio-Flow" : "";

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="flex flex-col items-center gap-0.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-primary"
            style={{ background: "rgba(0, 229, 195, 0.15)", border: "1px solid rgba(0, 229, 195, 0.4)" }}
          >
            {initial}
          </div>
          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{truncPseudo}</span>
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <div className="px-5 pb-6 pt-2 overflow-y-auto space-y-4">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-primary"
              style={{ background: "rgba(0, 229, 195, 0.15)", border: "1px solid rgba(0, 229, 195, 0.4)" }}
            >
              {initial}
            </div>
            <p className="text-lg font-semibold text-foreground">{displayPseudo}</p>
            <p className="text-[11px] text-muted-foreground">{createdDate}</p>
          </div>

          {/* Editable section */}
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">Mes informations</p>
            <div className="space-y-0.5">
              <EditableField emoji="⚖" label="Poids" field="weight" value={profile.weight} />
              <EditableField emoji="📏" label="Taille" field="height" value={profile.height} />
              <EditableField emoji="🏃" label="Niveau sportif" field="fitness_level" value={profile.fitness_level} lookupMap={sportLevelLabels} />
              <EditableField emoji="🗂" label="Emploi du temps" field="schedule" value={profile.schedule || profile.status} lookupMap={scheduleLabels} />
              <EditableField emoji="💪" label="Charge de travail" field="workload" value={profile.workload || profile.organization_level} lookupMap={workloadLabels} />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Locked fields */}
          <div className="space-y-0.5">
            <LockedField emoji="🎭" label="Pseudo" value={profile.pseudo} />
            <LockedField emoji="🎂" label="Âge" value={profile.age} />
          </div>

          <div className="h-px bg-border" />

          {/* Focus Lock */}
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">Focus Lock</p>
            <button
              onClick={toggleFocusLock}
              className="flex items-center justify-between w-full p-3 rounded-xl bg-secondary"
            >
              <span className="text-xs font-medium text-foreground">Focus Lock</span>
              <div className={`w-10 h-6 rounded-full transition-colors ${profile.focus_lock_enabled ? "bg-primary" : "bg-muted"} flex items-center`}>
                <div className={`w-4 h-4 rounded-full bg-foreground transition-transform mx-1 ${profile.focus_lock_enabled ? "translate-x-4" : ""}`} />
              </div>
            </button>
            {profile.focus_lock_enabled && (
              <div className="mt-2 space-y-1">
                {[
                  { v: "social", l: "🎵 Réseaux sociaux" },
                  { v: "games", l: "🎮 Jeux" },
                  { v: "streaming", l: "📺 Streaming" },
                  { v: "shopping", l: "🛒 Shopping" },
                  { v: "messaging", l: "💬 Messageries" },
                ].map((c) => (
                  <label key={c.v} className="flex items-center gap-2 p-2 cursor-pointer text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={(profile.blocked_categories || []).includes(c.v)}
                      onChange={() => toggleCategory(c.v)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    {c.l}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" /> Mise à jour...
              </>
            ) : (
              "Sauvegarder"
            )}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ProfileDrawer;
