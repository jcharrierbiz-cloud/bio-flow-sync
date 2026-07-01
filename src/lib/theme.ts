// src/lib/theme.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Thème clair / sombre / système.
//
// Bascule la classe `.dark` sur <html> (convention shadcn/ui déjà utilisée par
// le projet : index.css définit les tokens `:root` et `.dark`). Persistance en
// localStorage (bioflow_theme). Le mode « système » suit prefers-color-scheme
// en temps réel.
//
// ⚙️ Câblage : importe et appelle initTheme() une fois au démarrage (App.tsx).
//    Le module applique aussi le thème dès l'import pour limiter le flash.
// -----------------------------------------------------------------------------

import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "bioflow_theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* noop */
  }
  return "system";
}

function apply(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  // Aligne aussi les contrôles natifs (inputs, scrollbars).
  root.style.colorScheme = resolved;
}

interface ThemeStore {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

export const useTheme = create<ThemeStore>((set) => {
  const initialMode = readStored();
  return {
    mode: initialMode,
    resolved: resolve(initialMode),
    setMode: (mode) => {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* noop */
      }
      const resolved = resolve(mode);
      apply(resolved);
      set({ mode, resolved });
    },
  };
});

let mediaBound = false;

/**
 * À appeler une fois au démarrage de l'app. Applique le thème stocké et
 * branche l'écoute des changements système (pour le mode « système »).
 */
export function initTheme(): void {
  if (typeof window === "undefined") return;
  apply(resolve(readStored()));

  if (!mediaBound && window.matchMedia) {
    mediaBound = true;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const { mode } = useTheme.getState();
      if (mode === "system") {
        const resolved = resolve("system");
        apply(resolved);
        useTheme.setState({ resolved });
      }
    };
    // addEventListener moderne, avec repli addListener (vieux Safari).
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    else if (typeof mq.addListener === "function") mq.addListener(onChange);
  }
}

// Application immédiate à l'import → réduit le flash de thème au chargement.
if (typeof window !== "undefined") {
  try {
    apply(resolve(readStored()));
  } catch {
    /* noop */
  }
}
