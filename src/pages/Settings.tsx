// src/pages/Settings.tsx
// -----------------------------------------------------------------------------
// Bio-Flow — Écran Réglages (le « rouage » ⚙️, route /settings).
//
// Regroupe :
//   • Mon compte : infos d'onboarding éditables (pseudo, âge, sexe, poids,
//     taille, niveau sportif, statut, objectif, organisation).
//   • Préférences : apparence (clair/sombre), sons d'interface, vibrations,
//     accueil vocal, notifications + rappels, scan matinal.
//   • Mes données (RGPD) : export JSON, suppression de compte.
//   • Déconnexion.
//
// Réutilise les briques existantes : updateProfileField, setAudioGreetingEnabled,
// exportMyData / deleteAccount, useAuth. Aucune nouvelle dépendance npm.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Palette,
  Volume2,
  VolumeX,
  Vibrate,
  Mic,
  MicOff,
  Bell,
  BellOff,
  Clock,
  ScanLine,
  Shield,
  Cookie,
  Download,
  Trash2,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import {
  getCachedProfile,
  fetchProfile,
  updateProfileField,
  type UserProfile,
} from "@/lib/profileStore";
import { setAudioGreetingEnabled } from "@/hooks/useGreeting";
import { exportMyData, deleteAccount } from "@/lib/account";
import { useAuth } from "@/hooks/useAuth";
import { useFeedback } from "@/hooks/useFeedback";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";

// --- Options (valeur → libellé), alignées sur l'onboarding & ProfileMenu ------

const SEX_OPTIONS: { value: string; label: string }[] = [
  { value: "male", label: "Homme" },
  { value: "female", label: "Femme" },
  { value: "unspecified", label: "Non précisé" },
];

const fitnessOptions: Record<string, string> = {
  sedentary: "🛋 Sédentaire",
  light: "🚶 Légèrement actif",
  moderate: "💪 Modérément actif",
  very_active: "🔥 Très actif",
  athlete: "⚡ Athlète",
};
const orgOptions: Record<string, string> = {
  chaotic: "😅 Chaotique",
  flexible: "🌊 Flexible",
  organized: "📋 Organisé",
  structured: "🎯 Très structuré",
};
const statusOptions: Record<string, string> = {
  student: "📚 Étudiant",
  working: "💼 En activité",
  both: "🔄 Les deux",
  entrepreneur: "🚀 Entrepreneur",
  transition: "🌱 En transition",
};
const goalOptions: Record<string, string> = {
  cognitive: "⚡ Performance cognitive",
  stress: "😌 Réduire le stress",
  sleep: "💤 Améliorer le sommeil",
  productivity: "🏆 Accomplir plus",
  fitness: "💪 Santé physique",
  holistic: "🧠 Tout optimiser",
};

// --- Petits composants réutilisables -----------------------------------------

const SectionCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="glass-card p-5 space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-energy/15 flex items-center justify-center" aria-hidden="true">
        <Icon className="w-4 h-4 text-energy" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
    <div className="space-y-2">{children}</div>
  </section>
);

const Toggle = ({
  checked,
  onChange,
  label,
  onIcon: OnIcon,
  offIcon: OffIcon,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  onIcon: typeof Volume2;
  offIcon: typeof VolumeX;
  hint?: string;
}) => (
  <button
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-secondary/50 transition-colors"
    role="switch"
    aria-checked={checked}
    aria-label={label}
  >
    <span className="flex items-center gap-2 min-w-0">
      {checked ? (
        <OnIcon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
      ) : (
        <OffIcon className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
      )}
      <span className="text-left min-w-0">
        <span className="block text-sm text-foreground truncate">{label}</span>
        {hint && <span className="block text-[10px] text-muted-foreground">{hint}</span>}
      </span>
    </span>
    <span
      className={`w-9 h-5 rounded-full transition-colors flex items-center shrink-0 ${
        checked ? "bg-primary" : "bg-secondary"
      }`}
    >
      <span
        className={`w-3.5 h-3.5 rounded-full bg-foreground transition-transform mx-0.5 ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </span>
  </button>
);

const EditRow = ({
  emoji,
  label,
  value,
  suffix,
  type = "text",
  onSave,
}: {
  emoji: string;
  label: string;
  value: string;
  suffix?: string;
  type?: "text" | "number";
  onSave: (raw: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm">{emoji}</span>
        {editing ? (
          <input
            autoFocus
            type={type}
            inputMode={type === "number" ? "numeric" : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            onBlur={commit}
            className="flex-1 bg-muted px-2 py-1 rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-energy"
          />
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-xs text-foreground truncate">
              {value ? `${value}${suffix ? ` ${suffix}` : ""}` : "—"}
            </p>
          </div>
        )}
      </div>
      {!editing && (
        <button
          onClick={() => setEditing(true)}
          className="text-[10px] text-energy hover:underline px-2 py-1"
          aria-label={`Modifier ${label}`}
        >
          Modifier
        </button>
      )}
    </div>
  );
};

const SelectRow = ({
  emoji,
  label,
  value,
  options,
  onChange,
}: {
  emoji: string;
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center justify-between py-1.5 gap-2">
    <span className="flex items-center gap-2 min-w-0">
      <span className="text-sm">{emoji}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </span>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="bg-muted text-xs text-foreground rounded px-2 py-1.5 max-w-[60%] focus:outline-none focus:ring-1 focus:ring-energy"
      aria-label={label}
    >
      {!value && <option value="">—</option>}
      {Object.entries(options).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  </div>
);

// --- Page --------------------------------------------------------------------

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { feedback, soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled } = useFeedback();

  const [profile, setProfile] = useState<UserProfile | null>(() => getCachedProfile());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Réglages — Bio-Flow";
    fetchProfile().then((p) => p && setProfile(p));
  }, []);

  // Met à jour un champ profil de façon optimiste (UI immédiate) puis persiste.
  const patch = async (field: keyof UserProfile, value: unknown) => {
    setProfile((prev) => (prev ? ({ ...prev, [field]: value } as UserProfile) : prev));
    await updateProfileField(field as string, value);
  };

  const toggleVoice = async (next: boolean) => {
    feedback.toggle(next);
    setAudioGreetingEnabled(next); // garde useGreeting synchronisé (comme ProfileMenu)
    await patch("audio_greeting_enabled", next);
  };

  const toggleNotif = async (next: boolean) => {
    feedback.toggle(next);
    // Demande la permission navigateur à l'activation (best-effort).
    if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* noop */
      }
    }
    await patch("notification_enabled", next);
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportMyData();
      feedback.success();
      toast.success("Export téléchargé (JSON).");
    } catch (err) {
      console.error("export error:", err);
      feedback.error();
      toast.error("Erreur lors de l'export.");
    }
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    const res = await deleteAccount();
    setBusy(false);
    if (res.ok) {
      toast.success("Compte et données supprimés.");
    } else {
      feedback.error();
      toast.error(res.error || "Erreur lors de la suppression.");
      setConfirmDelete(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const sex = profile.sex ?? "unspecified";

  return (
    <div className="min-h-dvh bg-background pb-24">
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy"
            aria-label="Revenir à la page précédente"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Réglages</h1>
            <p className="text-[11px] text-muted-foreground">Ton compte et tes préférences</p>
          </div>
        </div>

        {/* Mon compte */}
        <SectionCard icon={User} title="Mon compte">
          <EditRow emoji="👤" label="Pseudo" value={profile.pseudo} onSave={(v) => patch("pseudo", v)} />
          <EditRow
            emoji="🎂"
            label="Âge"
            type="number"
            value={String(profile.age ?? "")}
            onSave={(v) => patch("age", v ? Number(v) : null)}
          />

          {/* Sexe (segmenté) */}
          <div className="flex items-center justify-between py-1.5 gap-2">
            <span className="flex items-center gap-2">
              <span className="text-sm">⚧</span>
              <span className="text-[10px] text-muted-foreground">Sexe</span>
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/50" role="radiogroup" aria-label="Sexe">
              {SEX_OPTIONS.map((o) => {
                const active = sex === o.value;
                return (
                  <button
                    key={o.value}
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      feedback.tap();
                      patch("sex", o.value);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <EditRow
            emoji="⚖️"
            label="Poids"
            type="number"
            value={profile.weight != null ? String(profile.weight) : ""}
            suffix={profile.weight_unit}
            onSave={(v) => patch("weight", v ? Number(v) : null)}
          />
          <EditRow
            emoji="📏"
            label="Taille"
            type="number"
            value={profile.height != null ? String(profile.height) : ""}
            suffix={profile.height_unit}
            onSave={(v) => patch("height", v ? Number(v) : null)}
          />
          <SelectRow
            emoji="🏃"
            label="Niveau sportif"
            value={profile.fitness_level}
            options={fitnessOptions}
            onChange={(v) => patch("fitness_level", v)}
          />
          <SelectRow
            emoji="🎓"
            label="Statut"
            value={profile.status}
            options={statusOptions}
            onChange={(v) => patch("status", v)}
          />
          <SelectRow
            emoji="🎯"
            label="Objectif"
            value={profile.main_goal}
            options={goalOptions}
            onChange={(v) => patch("main_goal", v)}
          />
          <SelectRow
            emoji="🗂"
            label="Organisation"
            value={profile.organization_level}
            options={orgOptions}
            onChange={(v) => patch("organization_level", v)}
          />
        </SectionCard>

        {/* Apparence */}
        <SectionCard icon={Palette} title="Apparence">
          <ThemeToggle />
        </SectionCard>

        {/* Sons & retour */}
        <SectionCard icon={Volume2} title="Sons & retour">
          <Toggle
            checked={soundEnabled}
            onChange={setSoundEnabled}
            label="Sons d'interface"
            hint="Petit son satisfaisant à chaque appui"
            onIcon={Volume2}
            offIcon={VolumeX}
          />
          <Toggle
            checked={hapticsEnabled}
            onChange={setHapticsEnabled}
            label="Vibrations"
            hint="Retour tactile (Android)"
            onIcon={Vibrate}
            offIcon={Vibrate}
          />
          <Toggle
            checked={profile.audio_greeting_enabled}
            onChange={toggleVoice}
            label="Accueil vocal"
            hint="Message vocal personnalisé à l'ouverture"
            onIcon={Mic}
            offIcon={MicOff}
          />
        </SectionCard>

        {/* Notifications */}
        <SectionCard icon={Bell} title="Notifications & rappels">
          <Toggle
            checked={profile.notification_enabled}
            onChange={toggleNotif}
            label="Notifications"
            onIcon={Bell}
            offIcon={BellOff}
          />
          {profile.notification_enabled && (
            <div className="flex items-center justify-between py-1.5 gap-2">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm text-foreground">Rappel avant un événement</span>
              </span>
              <select
                value={String(profile.reminder_minutes ?? 10)}
                onChange={(e) => patch("reminder_minutes", Number(e.target.value))}
                className="bg-muted text-xs text-foreground rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-energy"
                aria-label="Délai de rappel"
              >
                {[5, 10, 15, 30, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} min avant
                  </option>
                ))}
              </select>
            </div>
          )}
          <Toggle
            checked={profile.morning_scan_enabled}
            onChange={(next) => {
              feedback.toggle(next);
              patch("morning_scan_enabled", next);
            }}
            label="Rappel du scan matinal"
            onIcon={ScanLine}
            offIcon={ScanLine}
          />
        </SectionCard>

        {/* Mes données (RGPD) */}
        <SectionCard icon={Shield} title="Mes données (RGPD)">
          <button
            onClick={() => navigate("/privacy")}
            className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors text-sm text-foreground"
          >
            <Shield className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Confidentialité & Sécurité
          </button>
          <button
            onClick={() => navigate("/cookies")}
            className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors text-sm text-foreground"
          >
            <Cookie className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Cookies & consentement
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={handleExport}
            disabled={busy}
            className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors text-sm text-foreground disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Exporter mes données (JSON)
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className={`w-full flex items-center gap-2 py-2 px-2 rounded-lg transition-colors text-sm disabled:opacity-50 ${
              confirmDelete ? "bg-destructive/15 text-destructive font-medium" : "hover:bg-destructive/10 text-destructive"
            }`}
            aria-label="Supprimer définitivement mon compte et mes données"
          >
            {confirmDelete ? (
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            )}
            {busy ? "Suppression en cours…" : confirmDelete ? "Confirmer la suppression définitive ?" : "Supprimer mon compte"}
          </button>
          {confirmDelete && !busy && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1"
            >
              Annuler
            </button>
          )}
        </SectionCard>

        {/* Déconnexion */}
        <button
          onClick={async () => {
            try {
              await signOut();
              toast.success("Déconnecté");
            } catch (err) {
              console.error("signOut error:", err);
              toast.error("Erreur lors de la déconnexion");
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl glass-card hover:bg-destructive/10 transition-colors text-sm text-destructive font-medium"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Se déconnecter
        </button>

        <p className="text-center text-[9px] text-muted-foreground/50">Bio-Flow v1.0</p>
      </main>
    </div>
  );
};

export default Settings;
