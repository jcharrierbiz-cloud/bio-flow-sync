import ValuePropScreen from "@/components/ValuePropScreen";
const [showValue, setShowValue] = useState(true);
// ... au tout début du return, quand l'onboarding s'ouvre :
if (open && showValue) return <ValuePropScreen onStart={() => setShowValue(false)} />;
import { useState, useRef, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { saveProfile, getDeviceId, type UserProfile } from "@/lib/profileStore";
import { setUserName } from "@/hooks/useGreeting";
import { markOnboarded } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft } from "lucide-react";

interface Props {
  open: boolean;
  onClose: (profile: UserProfile | null) => void;
}

const loadingTexts = [
  "Analyse de ton profil...",
  "Calibrage de ton coach BIO...",
  "Construction de ta routine optimale...",
  "Personnalisation de tes objectifs...",
  "Tout est prêt. ✦",
];

const OnboardingFlow = ({ open, onClose }: Props) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  // Screen 1
  const [pseudo, setPseudo] = useState("");
  const [age, setAge] = useState("");
  const [pseudoError, setPseudoError] = useState("");
  const [ageError, setAgeError] = useState("");

  // Screen 2
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");

  // Screen 3
  const [sportLevel, setSportLevel] = useState("");
  const [sportHistory, setSportHistory] = useState("");
  const [schedule, setSchedule] = useState("");
  const [workload, setWorkload] = useState("");

  // Screen 4
  const [mainGoal, setMainGoal] = useState("");
  const [goalDetail, setGoalDetail] = useState("");
  const [focusLockEnabled, setFocusLockEnabled] = useState(false);
  const [blockedCategories, setBlockedCategories] = useState<string[]>([
    "social", "games", "streaming", "shopping", "messaging",
  ]);

  // Screen 5
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [parentalAccepted, setParentalAccepted] = useState(false);
  const [requiresParentalConsent, setRequiresParentalConsent] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);

  // Loading
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const loadingInterval = useRef<ReturnType<typeof setInterval>>();

  if (!open) return null;

  const goTo = (s: number) => {
    setDirection(s > step ? "next" : "prev");
    setStep(s);
  };

  const slideClass = direction === "next"
    ? "animate-in fade-in-0 slide-in-from-right-8 duration-300"
    : "animate-in fade-in-0 slide-in-from-left-8 duration-300";

  const validatePseudo = (v: string) => {
    if (v.length < 2) return "Minimum 2 caractères";
    if (v.length > 20) return "Maximum 20 caractères";
    if (!/^[a-zA-Z0-9_-]+$/.test(v)) return "Lettres, chiffres, _ et - uniquement";
    return "";
  };

  const screen1Valid = pseudo.trim().length >= 2 && !validatePseudo(pseudo.trim()) && age && Number(age) >= 1 && Number(age) <= 120;
  const screen3Valid = sportLevel && sportHistory && schedule && workload;
  const screen4Valid = !!mainGoal;

  const handleContinueScreen1 = () => {
    const pErr = validatePseudo(pseudo.trim());
    const ageNum = Number(age);
    let aErr = "";
    if (!age || ageNum < 1 || ageNum > 120) {
      aErr = "Âge entre 1 et 120";
    } else if (ageNum < 13) {
      aErr = "Bio-Flow n'est pas accessible aux moins de 13 ans.";
    }
    setPseudoError(pErr);
    setAgeError(aErr);
    if (!pErr && !aErr) {
      setRequiresParentalConsent(ageNum < 15);
      goTo(2);
    }
  };

  const handleTermsScroll = () => {
    const el = termsRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 20;
    if (atBottom) setHasScrolledToBottom(true);
  };

  const toggleCategory = (cat: string) => {
    setBlockedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleFinish = async () => {
    goTo(6); // loading screen
    let idx = 0;
    loadingInterval.current = setInterval(() => {
      idx++;
      if (idx < loadingTexts.length) setLoadingTextIdx(idx);
    }, 1500);

    try {
      const profileData = {
        pseudo: pseudo.trim(),
        age: Number(age),
        weight: weight ? Number(weight) : null,
        weightUnit,
        height: height ? Number(height) : null,
        heightUnit,
        sportLevel,
        sportHistory,
        schedule,
        workload,
        mainGoal,
        goalDetail: goalDetail || null,
        focusLockEnabled,
        blockedCategories,
      };

      const { data } = await supabase.functions.invoke("analyze-profile", {
        body: profileData,
      });

      const profile: Omit<UserProfile, "id"> = {
        device_id: getDeviceId(),
        pseudo: pseudo.trim(),
        age: Number(age),
        weight: weight ? Number(weight) : null,
        weight_unit: weightUnit,
        height: height ? Number(height) : null,
        height_unit: heightUnit,
        fitness_level: sportLevel,
        sport_history: sportHistory,
        organization_level: workload,
        status: schedule,
        schedule,
        workload,
        main_goal: mainGoal,
        goal_details: goalDetail || undefined,
        ai_coach_config: data?.config || null,
        onboarding_completed: true,
        audio_greeting_enabled: true,
        notification_enabled: false,
        reminder_minutes: 30,
        morning_scan_enabled: true,
        focus_lock_enabled: focusLockEnabled,
        blocked_categories: blockedCategories,
        parental_consent: requiresParentalConsent ? parentalAccepted : null,
        consent_age: Number(age),
      };

      setUserName(pseudo.trim());
      markOnboarded();
      const saved = await saveProfile(profile);
      clearInterval(loadingInterval.current);
      setLoadingTextIdx(loadingTexts.length - 1);
      setTimeout(() => onClose(saved), 2000);
    } catch (err) {
      console.error("Onboarding error:", err);
      clearInterval(loadingInterval.current);
      const profile: Omit<UserProfile, "id"> = {
        device_id: getDeviceId(),
        pseudo: pseudo.trim(),
        age: Number(age),
        weight: weight ? Number(weight) : null,
        weight_unit: weightUnit,
        height: height ? Number(height) : null,
        height_unit: heightUnit,
        fitness_level: sportLevel,
        sport_history: sportHistory,
        organization_level: workload,
        status: schedule,
        schedule,
        workload,
        main_goal: mainGoal,
        goal_details: goalDetail || undefined,
        ai_coach_config: null,
        onboarding_completed: true,
        audio_greeting_enabled: true,
        notification_enabled: false,
        reminder_minutes: 30,
        morning_scan_enabled: true,
        focus_lock_enabled: focusLockEnabled,
        blocked_categories: blockedCategories,
        parental_consent: requiresParentalConsent ? parentalAccepted : null,
        consent_age: Number(age),
      };
      setUserName(pseudo.trim());
      markOnboarded();
      const saved = await saveProfile(profile);
      setTimeout(() => onClose(saved), 1500);
    }
  };

  const SelectCard = ({ emoji, label, desc, selected, onClick, fullWidth }: {
    emoji: string; label: string; desc?: string; selected: boolean; onClick: () => void; fullWidth?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl border text-left transition-all ${fullWidth ? "w-full" : ""} ${
        selected
          ? "border-primary/60 bg-primary/10"
          : "border-[hsl(var(--glass-border))] hover:border-[hsl(var(--glass-highlight))]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg shrink-0">{emoji}</span>
        <div>
          <p className={`text-xs font-medium ${selected ? "text-primary" : "text-foreground"}`}>{label}</p>
          {desc && <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>}
        </div>
      </div>
    </button>
  );

  // Loading screen (step 6)
  if (step === 6) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center" style={{ background: "#090F0D" }}>
        <div className="w-20 h-20 rounded-full border-2 border-primary/40 flex items-center justify-center animate-pulse">
          <div className="w-12 h-12 rounded-full bg-primary/20 animate-ping" />
        </div>
        <p className="mt-8 text-sm text-foreground animate-in fade-in-0 duration-500" key={loadingTextIdx}>
          {loadingTexts[loadingTextIdx]}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: "#090F0D" }}>
      {/* Progress bar */}
      {step <= 5 && (
        <div className="px-5 pt-4 pb-1">
          <div className="h-[3px] w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
          <p className="text-center text-[12px] text-muted-foreground mt-2">Étape {step} sur 5</p>
        </div>
      )}

      {/* Back button */}
      {step > 1 && step <= 5 && (
        <button onClick={() => goTo(step - 1)} className="absolute top-14 left-4 text-muted-foreground hover:text-foreground z-10 flex items-center gap-1 text-xs">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
      )}

      {/* Logo */}
      {step <= 5 && (
        <div className="text-center mt-1 mb-2">
          <span className="text-primary font-bold text-sm tracking-wider">BIO-FLOW</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="max-w-sm mx-auto">

          {/* SCREEN 1 — Identity */}
          {step === 1 && (
            <div key="s1" className={`space-y-5 pt-6 ${slideClass}`}>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Bienvenue sur Bio-Flow</h1>
                <p className="text-sm text-muted-foreground">Quelques informations pour personnaliser ton expérience.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Ton pseudo</label>
                <input
                  type="text"
                  placeholder="Choisis un pseudo..."
                  value={pseudo}
                  onChange={(e) => { setPseudo(e.target.value); setPseudoError(""); }}
                  className={`w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${pseudoError ? "border border-destructive ring-destructive/50" : ""}`}
                  autoFocus
                />
                {pseudoError && <p className="text-[11px] text-destructive">{pseudoError}</p>}
                <p className="text-[11px] text-muted-foreground">Ce pseudo est permanent — il ne pourra plus être modifié.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Ton âge</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="Ex: 17"
                  value={age}
                  onChange={(e) => { setAge(e.target.value); setAgeError(""); }}
                  className={`w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${ageError ? "border border-destructive ring-destructive/50" : ""}`}
                />
                {ageError && <p className="text-[11px] text-destructive">{ageError}</p>}
              </div>

              <button
                onClick={handleContinueScreen1}
                disabled={!screen1Valid}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
                style={{ height: 48, borderRadius: 12 }}
              >
                Continuer
              </button>
            </div>
          )}

          {/* SCREEN 2 — Physical data */}
          {step === 2 && (
            <div key="s2" className={`space-y-5 pt-4 ${slideClass}`}>
              {/* Info card */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(0, 229, 195, 0.08)", border: "1px solid rgba(0, 229, 195, 0.3)" }}>
                <div className="flex items-start gap-2">
                  <span className="text-primary text-base">✦</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Pourquoi ces informations ?</p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">
                      Ton poids et ta taille permettent à BIO de calculer ton métabolisme de base, d'estimer ta dépense énergétique réelle et de calibrer tes seuils d'effort. Plus ces données sont précises, plus les recommandations de ton coach seront adaptées à ta réalité physiologique. Tout cela reste strictement privé et n'est jamais partagé.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Poids <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Ex: 68"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex rounded-xl overflow-hidden border border-border">
                    {(["kg", "lbs"] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setWeightUnit(u)}
                        className={`px-3 py-3 text-xs font-medium transition-colors ${weightUnit === u ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Taille <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Ex: 175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex rounded-xl overflow-hidden border border-border">
                    {(["cm", "ft"] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setHeightUnit(u)}
                        className={`px-3 py-3 text-xs font-medium transition-colors ${heightUnit === u ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-center text-[12px] text-muted-foreground">Tu peux laisser ces champs vides et les renseigner plus tard dans tes paramètres.</p>

              <button
                onClick={() => goTo(3)}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                style={{ height: 48, borderRadius: 12 }}
              >
                Continuer
              </button>
            </div>
          )}

          {/* SCREEN 3 — Profile & lifestyle */}
          {step === 3 && (
            <div key="s3" className={`space-y-5 pt-4 ${slideClass}`}>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">Ton profil de vie</h1>
                <p className="text-[13px] text-muted-foreground">Pour que BIO adapte ton planning à ta réalité.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Niveau sportif actuel</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "sedentary", e: "🛋", l: "Sédentaire", d: "Peu ou pas d'activité" },
                    { v: "beginner", e: "🚶", l: "Débutant", d: "J'essaie de bouger plus" },
                    { v: "intermediate", e: "💪", l: "Intermédiaire", d: "2 à 4 séances/semaine" },
                    { v: "advanced", e: "🔥", l: "Avancé", d: "5 séances et plus" },
                    { v: "athlete", e: "⚡", l: "Athlète", d: "Entraînement intensif quotidien" },
                  ].map((o) => (
                    <SelectCard key={o.v} emoji={o.e} label={o.l} desc={o.d} selected={sportLevel === o.v} onClick={() => setSportLevel(o.v)} />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">As-tu déjà pratiqué un sport régulièrement ?</label>
                <div className="space-y-2">
                  {[
                    { v: "yes", e: "✅", l: "Oui, j'ai un historique sportif" },
                    { v: "no", e: "🆕", l: "Non, je commence maintenant" },
                    { v: "paused", e: "⏸", l: "J'en faisais avant, j'ai arrêté" },
                  ].map((o) => (
                    <SelectCard key={o.v} emoji={o.e} label={o.l} selected={sportHistory === o.v} onClick={() => setSportHistory(o.v)} fullWidth />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Ton emploi du temps au quotidien</label>
                <div className="space-y-2">
                  {[
                    { v: "student", e: "📚", l: "Étudiant — cours et révisions" },
                    { v: "working", e: "💼", l: "En activité — travail à temps plein" },
                    { v: "both", e: "🔄", l: "Étudiant et travailleur" },
                    { v: "entrepreneur", e: "🚀", l: "Entrepreneur — projet personnel" },
                    { v: "flexible", e: "🌱", l: "Flexible — peu de contraintes fixes" },
                  ].map((o) => (
                    <SelectCard key={o.v} emoji={o.e} label={o.l} selected={schedule === o.v} onClick={() => setSchedule(o.v)} fullWidth />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Intensité de ton emploi du temps</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "heavy", e: "😤", l: "Chargé" },
                    { v: "moderate", e: "😐", l: "Modéré" },
                    { v: "light", e: "😌", l: "Léger" },
                  ].map((o) => (
                    <SelectCard key={o.v} emoji={o.e} label={o.l} selected={workload === o.v} onClick={() => setWorkload(o.v)} />
                  ))}
                </div>
              </div>

              <button
                onClick={() => goTo(4)}
                disabled={!screen3Valid}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
                style={{ height: 48, borderRadius: 12 }}
              >
                Continuer
              </button>
            </div>
          )}

          {/* SCREEN 4 — Goals & Focus Lock */}
          {step === 4 && (
            <div key="s4" className={`space-y-5 pt-4 ${slideClass}`}>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">Tes objectifs</h1>
                <p className="text-[13px] text-muted-foreground">BIO va tout organiser autour de ce qui compte pour toi.</p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "cognitive", e: "⚡", l: "Performance cognitive" },
                    { v: "stress", e: "😌", l: "Réduire le stress" },
                    { v: "sleep", e: "💤", l: "Meilleur sommeil" },
                    { v: "productivity", e: "🏆", l: "Productivité maximale" },
                    { v: "fitness", e: "💪", l: "Santé physique" },
                    { v: "holistic", e: "🧠", l: "Optimisation totale" },
                  ].map((o) => (
                    <SelectCard key={o.v} emoji={o.e} label={o.l} selected={mainGoal === o.v} onClick={() => setMainGoal(o.v)} />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Précise si tu veux <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                <div className="relative">
                  <textarea
                    value={goalDetail}
                    onChange={(e) => setGoalDetail(e.target.value.slice(0, 200))}
                    placeholder="Ex: Je veux réussir mon bac sans m'épuiser..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{goalDetail.length}/200</span>
                </div>
              </div>

              {/* Focus Lock */}
              <div className="border-t border-primary/20 pt-4 space-y-3">
                <h2 className="text-[15px] font-medium text-foreground">🔒 Focus Lock</h2>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Quand une tâche de ta to-do list arrive à l'heure prévue, Bio-Flow peut bloquer les applications de divertissement sur ton téléphone pour t'aider à rester concentré. Tu choisis maintenant quelles apps sont considérées comme 'divertissement'.
                </p>

                <button
                  onClick={() => setFocusLockEnabled(!focusLockEnabled)}
                  className="flex items-center justify-between w-full p-3 rounded-xl bg-secondary"
                >
                  <span className="text-sm text-foreground font-medium">Activer le Focus Lock</span>
                  <div className={`w-10 h-6 rounded-full transition-colors ${focusLockEnabled ? "bg-primary" : "bg-muted"} flex items-center`}>
                    <div className={`w-4 h-4 rounded-full bg-foreground transition-transform mx-1 ${focusLockEnabled ? "translate-x-4" : ""}`} />
                  </div>
                </button>

                {focusLockEnabled && (
                  <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                    <p className="text-[12px] text-muted-foreground">Coche les catégories à bloquer pendant le focus :</p>
                    {[
                      { v: "social", e: "🎵", l: "Réseaux sociaux (TikTok, Instagram, Snapchat...)" },
                      { v: "games", e: "🎮", l: "Jeux mobiles (Brawl Stars, Clash...)" },
                      { v: "streaming", e: "📺", l: "Streaming vidéo (YouTube, Netflix...)" },
                      { v: "shopping", e: "🛒", l: "Shopping (Amazon, Vinted...)" },
                      { v: "messaging", e: "💬", l: "Messageries de divertissement (Discord...)" },
                    ].map((cat) => (
                      <label key={cat.v} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={blockedCategories.includes(cat.v)}
                          onChange={() => toggleCategory(cat.v)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-xs text-foreground">{cat.e} {cat.l}</span>
                      </label>
                    ))}
                    <p className="text-[12px] text-muted-foreground">Les appels, SMS, et apps de productivité restent toujours accessibles.</p>
                    <p className="text-[12px] text-warning">⚠ Le blocage complet nécessite une app native. Dans cette version, Bio-Flow crée un environnement de focus maximal avec overlay plein écran et alertes de sortie.</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => goTo(5)}
                disabled={!screen4Valid}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
                style={{ height: 48, borderRadius: 12 }}
              >
                Continuer
              </button>
            </div>
          )}

          {/* SCREEN 5 — Terms */}
          {step === 5 && (
            <div key="s5" className={`space-y-4 pt-4 ${slideClass}`}>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-foreground">Conditions d'utilisation</h1>
                <p className="text-[13px] text-muted-foreground">Lis attentivement avant de continuer.</p>
              </div>

              <div
                ref={termsRef}
                onScroll={handleTermsScroll}
                className="rounded-xl p-4 text-[13px] text-muted-foreground leading-relaxed overflow-y-auto custom-scrollbar space-y-4"
                style={{ maxHeight: "55vh", background: "rgba(255,255,255,0.03)", borderRadius: 12 }}
              >
                <p><strong className="text-foreground">1. Données personnelles</strong><br />Bio-Flow collecte ton pseudo, âge, poids (optionnel), taille (optionnel), niveau sportif et objectifs dans le seul but de personnaliser ton expérience. Ces données sont stockées de manière sécurisée et ne sont jamais vendues ni partagées avec des tiers.</p>
                <p><strong className="text-foreground">2. Données biométriques</strong><br />Les mesures effectuées via le scanner PPG (fréquence cardiaque, HRV estimée) sont des estimations à visée bien-être uniquement. Bio-Flow n'est pas un dispositif médical. Ces données ne remplacent en aucun cas un avis médical professionnel. Ces données biométriques sont conservées localement sur ton appareil ainsi que dans notre base sécurisée (Supabase). Tu peux à tout moment demander leur suppression en écrivant à support@bioflow.app.</p>
                <p><strong className="text-foreground">3. Intelligence artificielle</strong><br />Le coach BIO est un assistant IA. Ses recommandations sont personnalisées mais restent des suggestions. En cas de problème de santé, consulte un professionnel.</p>
                <p><strong className="text-foreground">4. Focus Lock</strong><br />La fonctionnalité Focus Lock crée un environnement de concentration via l'interface de l'app. L'utilisateur reste libre de quitter à tout moment. Bio-Flow décline toute responsabilité en cas d'utilisation inappropriée.</p>
                <p><strong className="text-foreground">5. Âge et données de santé</strong><br />Bio-Flow traite des données de santé (fréquence cardiaque, variabilité cardiaque, indicateurs de stress) considérées comme des données sensibles au sens du RGPD. L'application est réservée aux personnes de 13 ans et plus. Les utilisateurs de moins de 15 ans doivent disposer de l'accord explicite d'un parent ou titulaire de l'autorité parentale, conformément à l'article 8 du RGPD et au droit français. Cet accord est recueilli lors de l'inscription. Le parent ou tuteur peut à tout moment demander l'accès, la rectification ou la suppression des données en contactant support@bioflow.app.</p>
                <p><strong className="text-foreground">6. Modifications</strong><br />Bio-Flow se réserve le droit de modifier ces conditions. Les utilisateurs seront notifiés de tout changement majeur.</p>
                <p><strong className="text-foreground">7. Contact</strong><br />Pour toute question : support@bioflow.app</p>
              </div>

              {requiresParentalConsent && (
                <div
                  role="note"
                  className="rounded-xl p-3 text-[12px] leading-relaxed"
                  style={{
                    background: "rgba(255, 184, 0, 0.08)",
                    border: "1px solid rgba(255, 184, 0, 0.4)",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  <strong className="text-warning">⚠ Accord parental requis.</strong>{" "}
                  Tu as moins de 15 ans. En France, l'utilisation d'une application
                  traitant des données de santé nécessite l'accord d'un parent ou
                  tuteur légal. En cochant les cases ci-dessous, tu confirmes qu'un
                  parent ou tuteur a lu et accepté ces conditions.
                </div>
              )}

              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${!hasScrolledToBottom ? "opacity-40 pointer-events-none" : "animate-in zoom-in-95 duration-300"}`}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={!hasScrolledToBottom}
                  className="w-5 h-5 rounded accent-primary"
                />
                <span className="text-sm text-foreground">J'ai lu et j'accepte les conditions d'utilisation de Bio-Flow</span>
              </label>

              {requiresParentalConsent && (
                <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${!hasScrolledToBottom ? "opacity-40 pointer-events-none" : ""}`}>
                  <input
                    type="checkbox"
                    checked={parentalAccepted}
                    onChange={(e) => setParentalAccepted(e.target.checked)}
                    disabled={!hasScrolledToBottom}
                    className="w-5 h-5 rounded accent-primary mt-0.5"
                  />
                  <span className="text-sm text-foreground leading-snug">
                    Un parent ou tuteur légal a pris connaissance et donné son
                    accord pour l'utilisation de Bio-Flow et le traitement des
                    données de santé associées.
                  </span>
                </label>
              )}

              <button
                onClick={handleFinish}
                disabled={!termsAccepted || (requiresParentalConsent && !parentalAccepted)}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
                style={{ height: 48, borderRadius: 12 }}
              >
                Terminer et accéder à Bio-Flow
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
