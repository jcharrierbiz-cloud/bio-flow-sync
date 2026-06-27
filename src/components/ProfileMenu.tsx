import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, ChevronDown, Edit2, Volume2, VolumeX, Bell, BellOff, RotateCcw, LogOut, Shield, Cookie } from "lucide-react";
import { getCachedProfile, updateProfileField, type UserProfile, getDeviceId } from "@/lib/profileStore";
import { setUserName, setAudioGreetingEnabled } from "@/hooks/useGreeting";
import { useRewardStore } from "@/lib/rewardStore";
import LevelBadge from "@/components/LevelBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const fitnessLabels: Record<string, string> = {
  sedentary: "🛋 Sédentaire",
  light: "🚶 Légèrement actif",
  moderate: "💪 Modérément actif",
  very_active: "🔥 Très actif",
  athlete: "⚡ Athlète",
};

const orgLabels: Record<string, string> = {
  chaotic: "😅 Chaotique",
  flexible: "🌊 Flexible",
  organized: "📋 Organisé",
  structured: "🎯 Très structuré",
};

const statusLabels: Record<string, string> = {
  student: "📚 Étudiant",
  working: "💼 En activité",
  both: "🔄 Les deux",
  entrepreneur: "🚀 Entrepreneur",
  transition: "🌱 En transition",
};

const goalLabels: Record<string, string> = {
  cognitive: "⚡ Performance cognitive",
  stress: "😌 Réduire le stress",
  sleep: "💤 Améliorer le sommeil",
  productivity: "🏆 Accomplir plus",
  fitness: "💪 Santé physique",
  holistic: "🧠 Tout optimiser",
};

const ProfileMenu = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [recalibrating, setRecalibrating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const xp = useRewardStore((s) => s.xp);
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = {
    current: xp % 100,
    needed: 100,
  };

  useEffect(() => {
    setProfile(getCachedProfile());
  }, [isOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditField(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!profile?.onboarding_completed) return null;

  const coachConfig = profile.ai_coach_config as any;
  const coachName = coachConfig?.coachName || "Coach";

  const toggleAudio = async () => {
    const newVal = !profile.audio_greeting_enabled;
    setAudioGreetingEnabled(newVal);
    await updateProfileField("audio_greeting_enabled", newVal);
    setProfile({ ...profile, audio_greeting_enabled: newVal });
  };

  const toggleNotif = async () => {
    const newVal = !profile.notification_enabled;
    await updateProfileField("notification_enabled", newVal);
    setProfile({ ...profile, notification_enabled: newVal });
  };

  const startEdit = (field: string, currentValue: string | number | null | undefined) => {
    setEditField(field);
    setEditValue(String(currentValue || ""));
  };

  const saveEdit = async (field: string) => {
    let value: any = editValue;
    if (field === "age" || field === "weight" || field === "height") {
      value = editValue ? Number(editValue) : null;
    }
    await updateProfileField(field, value);
    if (field === "pseudo") setUserName(editValue);
    setProfile({ ...profile, [field]: value } as UserProfile);
    setEditField(null);
  };

  const recalibrate = async () => {
    setRecalibrating(true);
    try {
      const profileData = {
        pseudo: profile.pseudo,
        age: profile.age,
        weight: profile.weight,
        weightUnit: profile.weight_unit,
        height: profile.height,
        heightUnit: profile.height_unit,
        fitness: profile.fitness_level,
        org: profile.organization_level,
        status: profile.status,
        goal: profile.main_goal,
        goalDetails: profile.goal_details || "",
      };

      const { data } = await supabase.functions.invoke("analyze-profile", { body: profileData });
      if (data?.config) {
        await updateProfileField("ai_coach_config", data.config);
        setProfile({ ...profile, ai_coach_config: data.config });
        toast.success("Ton coach a été mis à jour.");
      }
    } catch (err) {
      console.error("Recalibrate error:", err);
      toast.error("Erreur lors du recalibrage.");
    }
    setRecalibrating(false);
  };

  const renderField = (emoji: string, label: string, field: string, displayValue: string, lookupMap?: Record<string, string>) => (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm">{emoji}</span>
        {editField === field ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveEdit(field)}
            onBlur={() => saveEdit(field)}
            className="flex-1 bg-muted px-2 py-1 rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-xs text-foreground truncate">{lookupMap ? (lookupMap[displayValue] || displayValue) : displayValue}</p>
          </div>
        )}
      </div>
      {editField !== field && (
        <button onClick={() => startEdit(field, displayValue)} className="text-muted-foreground hover:text-foreground p-1">
          <Edit2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-secondary transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {profile.pseudo.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-medium text-foreground max-w-[80px] truncate">{profile.pseudo}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 glass-card p-4 space-y-3 z-50 animate-in fade-in-0 zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {profile.pseudo.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{profile.pseudo}</p>
                <LevelBadge />
              </div>
              <p className="text-[10px] text-muted-foreground">Ton coach : {coachName}</p>
            </div>
          </div>

          {/* XP Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">{xp} XP total</span>
              <span className="text-primary">{xpInLevel.current}/{xpInLevel.needed} → Lv.{level + 1}</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(xpInLevel.current / xpInLevel.needed) * 100}%` }}
              />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Editable Fields */}
          <div className="space-y-0.5">
            {renderField("👤", "Pseudo", "pseudo", profile.pseudo)}
            {renderField("🎂", "Âge", "age", String(profile.age))}
            {profile.weight != null && renderField("⚖️", "Poids", "weight", String(profile.weight))}
            {profile.height != null && renderField("📏", "Taille", "height", String(profile.height))}
            {renderField("🏃", "Niveau sportif", "fitness_level", profile.fitness_level, fitnessLabels)}
            {renderField("🗂", "Organisation", "organization_level", profile.organization_level, orgLabels)}
            {renderField("🎓", "Statut", "status", profile.status, statusLabels)}
            {renderField("🎯", "Objectif", "main_goal", profile.main_goal, goalLabels)}
          </div>

          <div className="h-px bg-border" />

          {/* Toggles */}
          <div className="space-y-2">
            <button onClick={toggleAudio} className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-xs text-foreground flex items-center gap-2">
                {profile.audio_greeting_enabled ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
                Accueil vocal
              </span>
              <div className={`w-8 h-5 rounded-full transition-colors ${profile.audio_greeting_enabled ? "bg-primary" : "bg-secondary"} flex items-center`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-foreground transition-transform mx-0.5 ${profile.audio_greeting_enabled ? "translate-x-3" : ""}`} />
              </div>
            </button>
            <button onClick={toggleNotif} className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-xs text-foreground flex items-center gap-2">
                {profile.notification_enabled ? <Bell className="w-3.5 h-3.5 text-primary" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
                Notifications
              </span>
              <div className={`w-8 h-5 rounded-full transition-colors ${profile.notification_enabled ? "bg-primary" : "bg-secondary"} flex items-center`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-foreground transition-transform mx-0.5 ${profile.notification_enabled ? "translate-x-3" : ""}`} />
              </div>
            </button>
          </div>

          <div className="h-px bg-border" />

          {/* Recalibrate */}
          <button
            onClick={recalibrate}
            disabled={recalibrating}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-primary/30 text-primary text-xs font-medium hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${recalibrating ? "animate-spin" : ""}`} />
            {recalibrating ? "Recalibrage en cours..." : "Recalibrer mon coach"}
          </button>

          {/* Privacy link */}
          <button
            onClick={() => {
              setIsOpen(false);
              navigate("/privacy");
            }}
            className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors text-xs text-foreground"
          >
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            Confidentialité & Sécurité
          </button>

          {/* Cookies link */}
          <button
            onClick={() => {
              setIsOpen(false);
              navigate("/cookies");
            }}
            className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors text-xs text-foreground"
            aria-label="Ouvrir la page Cookies & consentement"
          >
            <Cookie className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            Cookies & consentement
          </button>

          {/* Sign out */}
          <button
            onClick={async () => {
              setIsOpen(false);
              try {
                await signOut();
                toast.success("Déconnecté");
              } catch (err) {
                console.error("signOut error:", err);
                toast.error("Erreur lors de la déconnexion");
              }
            }}
            className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-destructive/10 transition-colors text-xs text-destructive"
            aria-label="Se déconnecter de Bio-Flow"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Se déconnecter
          </button>

          {/* Footer */}
          <div className="pt-1 text-center">
            <p className="text-[9px] text-muted-foreground/50">Bio-Flow v1.0</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
