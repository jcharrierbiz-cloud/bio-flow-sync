// Carte "Paliers & déblocages" (Tâche 5) — motivation par progression.
// Affiche le palier courant, le prochain déblocage (avec l'XP restant),
// puis la liste complète des déblocages (acquis / à venir).
// À placer p.ex. sur la page Coach ou Home : <UnlocksCard />
import { Lock, Check } from "lucide-react";
import { UNLOCKS, useUnlocks } from "@/lib/levelUnlocks";
import { getTier } from "@/lib/rewardStore";

const UnlocksCard = ({ className = "" }: { className?: string }) => {
  const { level, tier, next } = useUnlocks();

  return (
    <div className={`glass-card p-5 space-y-4 ${className}`}>
      {/* En-tête : palier courant */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Palier actuel</p>
          <p className="text-lg font-bold" style={{ color: `hsl(${tier.color})` }}>
            {tier.name} · Lv.{level}
          </p>
        </div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
          style={{ backgroundColor: `hsl(${tier.color} / 0.15)` }}
        >
          {UNLOCKS.find((u) => u.tier === tier.name)?.emoji ?? "🌀"}
        </div>
      </div>

      {/* Prochain déblocage */}
      {next ? (
        <div className="rounded-xl border border-border/60 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base opacity-70">{next.unlock.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Prochain : {next.unlock.title}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{next.unlock.desc}</p>
            </div>
          </div>
          <p className="text-[10px] text-energy">
            Encore {next.xpRemaining} XP → palier {next.unlock.tier} (Lv.{next.unlock.minLevel})
          </p>
        </div>
      ) : (
        <p className="text-xs text-energy">Tous les déblocages sont acquis. Tu es au sommet. 🌀</p>
      )}

      {/* Liste complète */}
      <div className="space-y-1.5">
        {UNLOCKS.map((u) => {
          const unlocked = level >= u.minLevel;
          const c = getTier(u.minLevel).color;
          return (
            <div
              key={u.key}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${unlocked ? "" : "opacity-55"}`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: unlocked ? `hsl(${c} / 0.15)` : "hsl(var(--muted))" }}
              >
                {unlocked ? u.emoji : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{u.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {u.tier} · Lv.{u.minLevel}
                </p>
              </div>
              {unlocked && <Check className="w-3.5 h-3.5 text-energy shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UnlocksCard;
