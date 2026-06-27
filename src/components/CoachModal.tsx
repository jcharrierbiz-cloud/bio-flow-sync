import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Bot, Sparkles, ArrowRight } from "lucide-react";
import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface CoachModalProps {
  children: ReactNode;
}

/**
 * CoachModal — lightweight drawer that points users to the real Coach chat.
 *
 * The previous implementation displayed hardcoded fake claims about sleep data
 * and offered fake "yes/no" responses that didn't reflect any real analysis.
 * This version simply invites the user to open the real Coach page (which is
 * backed by the live coach-chat edge function).
 */
const CoachModal = ({ children }: CoachModalProps) => {
  const navigate = useNavigate();

  return (
    <Drawer>
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
                <Sparkles className="w-3 h-3 text-ai-violet" /> Assistant IA
              </span>
            </div>
          </div>

          {/* Honest invite */}
          <div className="glass-card p-4">
            <p className="text-sm text-secondary-foreground leading-relaxed">
              Ouvre le Coach pour discuter de ta journée, demander une réorganisation de ton agenda
              ou des conseils basés sur tes scans et ton historique.
            </p>
          </div>

          <button
            onClick={() => navigate("/coach")}
            className="w-full py-3 rounded-xl bg-ai-violet/15 text-ai-violet font-medium text-sm border border-ai-violet/20 hover:bg-ai-violet/25 transition-all flex items-center justify-center gap-2"
          >
            Ouvrir le Coach
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CoachModal;
