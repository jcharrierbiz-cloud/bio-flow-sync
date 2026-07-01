// src/components/ThemeToggle.tsx
// -----------------------------------------------------------------------------
// Bio-Flow — Sélecteur segmenté clair / système / sombre.
// -----------------------------------------------------------------------------

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { feedback } from "@/lib/feedback";

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Clair", Icon: Sun },
  { mode: "system", label: "Système", Icon: Monitor },
  { mode: "dark", label: "Sombre", Icon: Moon },
];

const ThemeToggle = () => {
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);

  return (
    <div
      className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/50"
      role="radiogroup"
      aria-label="Apparence de l'application"
    >
      {OPTIONS.map(({ mode: m, label, Icon }) => {
        const active = mode === m;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={active}
            onClick={() => {
              setMode(m);
              feedback.tap();
            }}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className={`w-4 h-4 ${active ? "text-energy" : ""}`} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
