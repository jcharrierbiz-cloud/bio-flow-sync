import { useState, useEffect, useRef } from "react";
import { User, ChevronDown, Edit2, Volume2, VolumeX, Bell, BellOff } from "lucide-react";
import { getCachedProfile, updateProfileField, type UserProfile } from "@/lib/profileStore";
import { setUserName, setAudioGreetingEnabled } from "@/hooks/useGreeting";

const fitnessLabels: Record<string, string> = {
  sedentary: "🛋 Sédentaire",
  light: "🚶 Légèrement actif",
  moderate: "💪 Modérément actif",
  very_active: "🔥 Très actif",
  athlete: "⚡ Athlète",
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
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(getCachedProfile());
  }, [isOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!profile?.onboarding_completed) return null;

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-secondary transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium text-foreground max-w-[80px] truncate">{profile.pseudo}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 glass-card p-4 space-y-3 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{profile.pseudo}</p>
              <p className="text-[10px] text-muted-foreground">{profile.age} ans • {fitnessLabels[profile.fitness_level] || ""}</p>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {profile.weight && (
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Poids</p>
                <p className="text-xs font-medium text-foreground">{profile.weight} {profile.weight_unit}</p>
              </div>
            )}
            {profile.height && (
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Taille</p>
                <p className="text-xs font-medium text-foreground">{profile.height} {profile.height_unit}</p>
              </div>
            )}
          </div>

          {/* Goal */}
          <div className="bg-secondary/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground">Objectif</p>
            <p className="text-xs font-medium text-foreground">{goalLabels[profile.main_goal] || profile.main_goal}</p>
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
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
