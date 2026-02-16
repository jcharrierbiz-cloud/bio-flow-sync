import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Bot, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";

interface CoachModalProps {
  children: ReactNode;
}

const CoachModal = ({ children }: CoachModalProps) => {
  const [answered, setAnswered] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const handleAnswer = (a: string) => {
    setAnswer(a);
    setAnswered(true);
  };

  return (
    <Drawer onOpenChange={() => { setAnswered(false); setAnswer(null); }}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="bg-card/95 backdrop-blur-2xl border-glass-border mx-auto max-w-lg">
        <div className="px-6 pt-4 pb-8 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ai-violet/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-ai-violet" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Coach Bio-Flow</h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-ai-violet" /> Analyse IA
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="glass-card p-4 glow-violet">
            <p className="text-sm text-secondary-foreground leading-relaxed">
              J'ai remarqué que ton sommeil était court cette nuit (6.2h au lieu de 7.5h recommandées).
              <br /><br />
              Veux-tu que je décale tes tâches <span className="text-energy font-medium">"High Energy"</span> de cet après-midi vers demain matin, quand ton niveau d'énergie sera meilleur ?
            </p>
          </div>

          {/* Response */}
          {!answered ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer("yes")}
                className="flex-1 py-3 rounded-xl bg-energy/15 text-energy font-medium text-sm border border-energy/20 hover:bg-energy/25 transition-all"
              >
                Oui, réorganise
              </button>
              <button
                onClick={() => handleAnswer("no")}
                className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm border border-glass-border hover:bg-secondary/80 transition-all"
              >
                Non, je maintiens
              </button>
            </div>
          ) : (
            <div className="glass-card p-4 border-energy/20">
              <p className="text-sm text-secondary-foreground">
                {answer === "yes"
                  ? "✅ C'est noté ! J'ai décalé 2 tâches énergivores à demain 9h-11h. Ton après-midi est maintenant allégé."
                  : "👍 Compris. Je maintiens ton planning. N'hésite pas à faire une micro-sieste de 20 min vers 14h pour recharger."}
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CoachModal;
