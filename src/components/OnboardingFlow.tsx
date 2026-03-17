import { useState, useRef } from "react";
import { Info, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { saveProfile, getDeviceId, type UserProfile } from "@/lib/profileStore";
import { setUserName, setAudioGreetingEnabled } from "@/hooks/useGreeting";
import { savePrefs, requestPermission, markOnboarded } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOTAL_STEPS = 10;

interface Props {
  open: boolean;
  onClose: (profile: UserProfile | null) => void;
}

type FitnessLevel = "sedentary" | "light" | "moderate" | "very_active" | "athlete";
type OrgLevel = "chaotic" | "flexible" | "organized" | "structured";
type Status = "student" | "working" | "both" | "entrepreneur" | "transition";
type Goal = "cognitive" | "stress" | "sleep" | "productivity" | "fitness" | "holistic";

const fitnessOptions: { value: FitnessLevel; emoji: string; label: string; desc: string }[] = [
  { value: "sedentary", emoji: "🛋", label: "Sédentaire", desc: "Peu ou pas d'activité physique" },
  { value: "light", emoji: "🚶", label: "Légèrement actif", desc: "1-2 séances/semaine" },
  { value: "moderate", emoji: "💪", label: "Modérément actif", desc: "3-4 séances/semaine" },
  { value: "very_active", emoji: "🔥", label: "Très actif", desc: "5+ séances/semaine" },
  { value: "athlete", emoji: "⚡", label: "Athlète", desc: "Entraînement quotidien" },
];

const orgOptions: { value: OrgLevel; emoji: string; label: string; desc: string }[] = [
  { value: "chaotic", emoji: "😅", label: "Chaotique", desc: "J'oublie souvent, j'improvise" },
  { value: "flexible", emoji: "🌊", label: "Flexible", desc: "J'ai une direction mais peu de structure" },
  { value: "organized", emoji: "📋", label: "Organisé", desc: "J'utilise des listes et des routines" },
  { value: "structured", emoji: "🎯", label: "Très structuré", desc: "Chaque heure est planifiée" },
];

const statusOptions: { value: Status; emoji: string; label: string; desc: string }[] = [
  { value: "student", emoji: "📚", label: "Étudiant", desc: "Cours, révisions, examens" },
  { value: "working", emoji: "💼", label: "En activité", desc: "Job à temps plein ou partiel" },
  { value: "both", emoji: "🔄", label: "Les deux", desc: "Études et travail simultanés" },
  { value: "entrepreneur", emoji: "🚀", label: "Entrepreneur", desc: "Je construis mon propre projet" },
  { value: "transition", emoji: "🌱", label: "En transition", desc: "Entre deux étapes de vie" },
];

const goalOptions: { value: Goal; emoji: string; label: string; desc: string }[] = [
  { value: "cognitive", emoji: "⚡", label: "Performance cognitive", desc: "Être au maximum mental chaque jour" },
  { value: "stress", emoji: "😌", label: "Réduire le stress", desc: "Retrouver calme et équilibre" },
  { value: "sleep", emoji: "💤", label: "Améliorer mon sommeil", desc: "Récupérer vraiment" },
  { value: "productivity", emoji: "🏆", label: "Accomplir plus", desc: "Productivité et discipline" },
  { value: "fitness", emoji: "💪", label: "Santé physique", desc: "Bouger plus, me sentir mieux" },
  { value: "holistic", emoji: "🧠", label: "Tout optimiser", desc: "Performance holistique complète" },
];

const loadingTexts = [
  "Analyse de ton profil biologique...",
  "Calibrage de ton coach personnel...",
  "Construction de ta routine optimale...",
  "Définition de tes récompenses...",
  "Tout est prêt.",
];

const OnboardingFlow = ({ open, onClose }: Props) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [pseudo, setPseudo] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [fitness, setFitness] = useState<FitnessLevel | "">("");
  const [org, setOrg] = useState<OrgLevel | "">("");
  const [status, setStatus] = useState<Status | "">("");
  const [goal, setGoal] = useState<Goal | "">("");
  const [goalDetails, setGoalDetails] = useState("");
  const [showWeightInfo, setShowWeightInfo] = useState(false);
  const [showHeightInfo, setShowHeightInfo] = useState(false);
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const loadingInterval = useRef<ReturnType<typeof setInterval>>();

  if (!open) return null;

  const goTo = (nextStep: number) => {
    setDirection(nextStep > step ? "next" : "prev");
    setStep(nextStep);
  };

  const next = () => goTo(step + 1);

  const handleAnalysis = async () => {
    goTo(9);
    
    // Start loading text cycle
    let idx = 0;
    loadingInterval.current = setInterval(() => {
      idx++;
      if (idx < loadingTexts.length) setLoadingTextIdx(idx);
    }, 1500);

    // Call AI analysis
    try {
      const profileData = {
        pseudo, age: Number(age),
        weight: weight ? Number(weight) : null, weightUnit,
        height: height ? Number(height) : null, heightUnit,
        fitness, org, status, goal, goalDetails,
      };
      
      const { data } = await supabase.functions.invoke("analyze-profile", {
        body: profileData,
      });

      // Save profile to Supabase
      const profile: Omit<UserProfile, "id"> = {
        device_id: getDeviceId(),
        pseudo,
        age: Number(age),
        weight: weight ? Number(weight) : null,
        weight_unit: weightUnit,
        height: height ? Number(height) : null,
        height_unit: heightUnit,
        fitness_level: fitness,
        organization_level: org,
        status,
        main_goal: goal,
        goal_details: goalDetails || undefined,
        ai_coach_config: data?.config || null,
        onboarding_completed: true,
        audio_greeting_enabled: audioEnabled,
        notification_enabled: false,
        reminder_minutes: 30,
        morning_scan_enabled: true,
      };

      // Persist to localStorage too
      setUserName(pseudo);
      setAudioGreetingEnabled(audioEnabled);
      markOnboarded();

      const saved = await saveProfile(profile);
      
      clearInterval(loadingInterval.current);
      setLoadingTextIdx(loadingTexts.length - 1);
      
      setTimeout(() => goTo(10), 1200);
      setTimeout(() => onClose(saved), 3500);
    } catch (err) {
      console.error("Analysis error:", err);
      clearInterval(loadingInterval.current);
      
      // Save anyway without AI config
      const profile: Omit<UserProfile, "id"> = {
        device_id: getDeviceId(),
        pseudo, age: Number(age),
        weight: weight ? Number(weight) : null,
        weight_unit: weightUnit,
        height: height ? Number(height) : null,
        height_unit: heightUnit,
        fitness_level: fitness,
        organization_level: org,
        status,
        main_goal: goal,
        goal_details: goalDetails || undefined,
        ai_coach_config: null,
        onboarding_completed: true,
        audio_greeting_enabled: audioEnabled,
        notification_enabled: false,
        reminder_minutes: 30,
        morning_scan_enabled: true,
      };
      setUserName(pseudo);
      setAudioGreetingEnabled(audioEnabled);
      markOnboarded();
      const saved = await saveProfile(profile);
      
      setTimeout(() => goTo(10), 800);
      setTimeout(() => onClose(saved), 2500);
    }
  };

  const slideClass = direction === "next"
    ? "animate-in fade-in-0 slide-in-from-right-8 duration-300"
    : "animate-in fade-in-0 slide-in-from-left-8 duration-300";

  const renderSelectCards = (
    options: { value: string; emoji: string; label: string; desc: string }[],
    selected: string,
    onSelect: (v: string) => void,
    large?: boolean,
  ) => (
    <div className={`grid gap-2 ${large ? "grid-cols-1" : "grid-cols-2"}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={`glass-card p-3 flex items-center gap-3 text-left transition-all ${
            selected === opt.value
              ? "border-primary/50 bg-primary/10"
              : "hover:border-glass-highlight"
          }`}
        >
          <span className="text-xl shrink-0">{opt.emoji}</span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">{opt.label}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background">
      {/* Progress bar */}
      {step <= 8 && (
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground">Étape {step}/8</span>
            {step > 1 && (
              <button onClick={() => goTo(step - 1)} className="text-[10px] text-muted-foreground hover:text-foreground">
                ← Retour
              </button>
            )}
          </div>
          <Progress value={(step / 8) * 100} className="h-1.5" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <div className="max-w-sm mx-auto pt-4">
          {/* Step 1: Pseudo */}
          {step === 1 && (
            <div key="s1" className={`space-y-5 ${slideClass}`}>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl">👤</span>
                <h1 className="text-xl font-bold text-foreground">Comment on t'appelle ?</h1>
                <p className="text-sm text-muted-foreground">Ce sera ton nom dans l'app.</p>
              </div>
              <input
                type="text"
                placeholder="Ton pseudo..."
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={next}
                disabled={pseudo.trim().length < 2}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Continuer
              </button>
            </div>
          )}

          {/* Step 2: Age */}
          {step === 2 && (
            <div key="s2" className={`space-y-5 ${slideClass}`}>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl">🎂</span>
                <h1 className="text-xl font-bold text-foreground">Quel âge as-tu ?</h1>
                <p className="text-sm text-muted-foreground">Permet d'adapter les recommandations biologiques à ton profil.</p>
              </div>
              <input
                type="number"
                min={13}
                max={99}
                placeholder="Ton âge"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={next}
                disabled={!age || Number(age) < 13 || Number(age) > 99}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Continuer
              </button>
            </div>
          )}

          {/* Step 3: Weight (optional) */}
          {step === 3 && (
            <div key="s3" className={`space-y-5 ${slideClass}`}>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl">⚖️</span>
                <h1 className="text-xl font-bold text-foreground">Quel est ton poids ?</h1>
                <p className="text-sm text-muted-foreground">
                  Optionnel — utile pour calculer ta charge physiologique.
                </p>
                <button onClick={() => setShowWeightInfo(!showWeightInfo)} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <Info className="w-3 h-3" /> En savoir plus
                </button>
                {showWeightInfo && (
                  <p className="text-[10px] text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-3 text-left">
                    Ton poids nous permet d'estimer ta dépense énergétique basale, d'adapter tes recommandations de récupération post-effort, et de calibrer ton score de charge allostatique. Cette donnée reste privée et n'est jamais partagée.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={weightUnit === "kg" ? "70" : "154"}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <div className="flex rounded-xl overflow-hidden border border-border">
                  {(["kg", "lbs"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setWeightUnit(u)}
                      className={`px-3 py-3 text-xs font-medium transition-colors ${
                        weightUnit === u ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={next}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Continuer
                </button>
                <button
                  onClick={() => { setWeight(""); next(); }}
                  className="py-3 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Passer
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Height (optional) */}
          {step === 4 && (
            <div key="s4" className={`space-y-5 ${slideClass}`}>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl">📏</span>
                <h1 className="text-xl font-bold text-foreground">Quelle est ta taille ?</h1>
                <p className="text-sm text-muted-foreground">
                  Optionnel — affine le calcul de ton IMC et de tes seuils d'effort.
                </p>
                <button onClick={() => setShowHeightInfo(!showHeightInfo)} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <Info className="w-3 h-3" /> En savoir plus
                </button>
                {showHeightInfo && (
                  <p className="text-[10px] text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-3 text-left">
                    La taille combinée au poids permet de calculer ton IMC et d'estimer ton métabolisme de base avec précision. Cela aide le coach à calibrer tes objectifs sans sur ou sous-estimer ta capacité physique réelle.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={heightUnit === "cm" ? "175" : "5.9"}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <div className="flex rounded-xl overflow-hidden border border-border">
                  {(["cm", "ft"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setHeightUnit(u)}
                      className={`px-3 py-3 text-xs font-medium transition-colors ${
                        heightUnit === u ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={next}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Continuer
                </button>
                <button
                  onClick={() => { setHeight(""); next(); }}
                  className="py-3 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Passer
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Fitness */}
          {step === 5 && (
            <div key="s5" className={`space-y-5 ${slideClass}`}>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl">🏃</span>
                <h1 className="text-xl font-bold text-foreground">Ton niveau sportif ?</h1>
                <p className="text-sm text-muted-foreground">Pour calibrer tes recommandations de récupération.</p>
              </div>
              {renderSelectCards(fitnessOptions, fitness, (v) => setFitness(v as FitnessLevel))}
              <button
                onClick={next}
                disabled={!fitness}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Continuer
              </button>
            </div>
          )}

          {/* Step 6: Organization */}
          {step === 6 && (
            <div key="s6" className={`space-y-5 ${slideClass}`}>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl">🗂</span>
                <h1 className="text-xl font-bold text-foreground">Côté organisation ?</h1>
                <p className="text-sm text-muted-foreground">Pour adapter le style de coaching et la structure de ton planning.</p>
              </div>
              {renderSelectCards(orgOptions, org, (v) => setOrg(v as OrgLevel))}
              <button
                onClick={next}
                disabled={!org}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Continuer
              </button>
            </div>
          )}

          {/* Step 7: Status */}
          {step === 7 && (
            <div key="s7" className={`space-y-5 ${slideClass}`}>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl">🎓</span>
                <h1 className="text-xl font-bold text-foreground">Tu es plutôt...</h1>
                <p className="text-sm text-muted-foreground">Influence ton rythme de vie et la façon dont le coach structure tes journées.</p>
              </div>
              {renderSelectCards(statusOptions, status, (v) => setStatus(v as Status))}
              <button
                onClick={next}
                disabled={!status}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Continuer
              </button>
            </div>
          )}

          {/* Step 8: Goal */}
          {step === 8 && (
            <div key="s8" className={`space-y-5 ${slideClass}`}>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl">🎯</span>
                <h1 className="text-xl font-bold text-foreground">Ton objectif n°1 ?</h1>
                <p className="text-sm text-muted-foreground">Le coach va tout organiser autour de cela.</p>
              </div>
              {renderSelectCards(goalOptions, goal, (v) => setGoal(v as Goal), true)}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Détaille si tu veux (optionnel)</label>
                <textarea
                  placeholder="Ex: je veux réussir mon année scolaire sans m'épuiser..."
                  value={goalDetails}
                  onChange={(e) => setGoalDetails(e.target.value.slice(0, 200))}
                  maxLength={200}
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <p className="text-[10px] text-muted-foreground text-right">{goalDetails.length}/200</p>
              </div>
              <button
                onClick={handleAnalysis}
                disabled={!goal}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Analyser mon profil <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          )}

          {/* Step 9: AI Loading */}
          {step === 9 && (
            <div key="s9" className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in-0 duration-500">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "0.3s" }} />
              </div>
              <p className="text-sm text-muted-foreground text-center transition-all duration-300">
                {loadingTexts[loadingTextIdx]}
              </p>
            </div>
          )}

          {/* Step 10: Done */}
          {step === 10 && (
            <div key="s10" className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in fade-in-0 zoom-in-95 duration-500">
              <span className="text-6xl">✨</span>
              <h1 className="text-2xl font-bold text-foreground text-center">
                Bienvenue, {pseudo} !
              </h1>
              <p className="text-sm text-muted-foreground text-center">
                Ton coach personnel est prêt. Bio-Flow va t'accompagner tout au long de ta journée.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
