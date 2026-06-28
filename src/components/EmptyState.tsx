// Composant d'état vide réutilisable (Tâche 7 — polish & cohérence).
// Remplace les zones vides muettes par un message clair + une action.
// Aligné sur la DA : glass-card, accent énergie (teal), arrondis 2xl.
//
// Exemples d'usage :
//   <EmptyState icon={ScanLine} title="Aucun scan aujourd'hui"
//     description="Fais ton scan matinal pour calibrer ta journée."
//     actionLabel="Scanner" onAction={() => navigate('/health')} />
//
//   <EmptyState icon={Dumbbell} title="Pas encore de séance"
//     description="Enregistre ta première séance pour suivre tes efforts." />
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** "energy" (teal, défaut) | "violet" (IA) | "muted" (neutre) */
  accent?: "energy" | "violet" | "muted";
}

const accentToken: Record<NonNullable<EmptyStateProps["accent"]>, string> = {
  energy: "var(--energy)",
  violet: "var(--ai-violet)",
  muted: "var(--muted-foreground)",
};

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  accent = "energy",
}: EmptyStateProps) => {
  const color = accentToken[accent];

  return (
    <div
      className={`glass-card p-8 flex flex-col items-center text-center gap-3 animate-in fade-in-0 zoom-in-95 duration-300 ${className}`}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: `hsl(${color} / 0.12)` }}
        aria-hidden="true"
      >
        <Icon className="w-6 h-6" style={{ color: `hsl(${color})` }} />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{description}</p>
        )}
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-1 px-4 py-2 rounded-xl text-xs font-semibold transition-transform hover:scale-[1.03]"
          style={{ backgroundColor: `hsl(${color})`, color: "hsl(var(--primary-foreground))" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
