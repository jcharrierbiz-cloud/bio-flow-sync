// Écran de proposition de valeur (Tâche 6 — montrer la valeur en < 60s).
// À afficher comme TOUTE PREMIÈRE étape de l'onboarding, avant le formulaire :
// l'utilisateur comprend en 10 secondes la boucle de valeur (Scan → Score → 1 action)
// AVANT qu'on lui demande quoi que ce soit. C'est le moment où l'on gagne ou perd 80% des gens.
//
// Intégration (voir README_LIVRAISON) :
//   const [showValue, setShowValue] = useState(true);
//   if (showValue) return <ValuePropScreen onStart={() => setShowValue(false)} />;
import { ScanLine, Gauge, Target, ArrowRight, Sparkles } from "lucide-react";

interface Props {
  onStart: () => void;
  onSkip?: () => void;
}

const STEPS = [
  { icon: ScanLine, color: "var(--energy)", title: "Scanne ta forme", desc: "30 s avec la caméra : HR, HRV, stress." },
  { icon: Gauge, color: "var(--ai-violet)", title: "Reçois ton score", desc: "Ton énergie du jour, calculée pour toi." },
  { icon: Target, color: "var(--intensity)", title: "1 action concrète", desc: "Le coach te dit quoi faire, maintenant." },
];

const ValuePropScreen = ({ onStart, onSkip }: Props) => {
  return (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col items-center justify-center px-6 py-10 animate-in fade-in-0 duration-300">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / titre */}
        <div className="text-center space-y-2">
          <div
            className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(var(--energy)), hsl(var(--ai-violet)))" }}
          >
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bio-Flow</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Chaque matin, transforme ton état réel en <strong className="text-foreground">une action claire</strong>.
            Pas un dashboard de plus.
          </p>
        </div>

        {/* La boucle de valeur en 3 temps */}
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="glass-card p-4 flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `hsl(${s.color} / 0.15)` }}
                >
                  <Icon className="w-5 h-5" style={{ color: `hsl(${s.color})` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    <span className="mono text-muted-foreground mr-1.5">{i + 1}.</span>
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={onStart}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, hsl(var(--energy)), hsl(var(--ai-violet)))" }}
          >
            Commencer — 60 secondes
            <ArrowRight className="w-4 h-4" />
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              J'ai déjà un compte
            </button>
          )}
          <p className="text-[10px] text-center text-muted-foreground/70">
            Tes données de santé restent privées et chiffrées. Toi seul y as accès.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ValuePropScreen;
