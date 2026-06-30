import { useEffect, useRef, useState } from "react";

/**
 * SplashScreen — écran d'ouverture Bio-Flow.
 *
 * Philosophie :
 *  - PAS de délai factice. Le splash reste affiché tant que l'init réelle
 *    n'est pas finie (`ready`), avec une durée minimale (`minDuration`) pour
 *    éviter le "flash" disgracieux quand l'appli charge instantanément.
 *  - Signature visuelle = l'onde de pouls (PPG) qui se dessine, le motif
 *    le plus caractéristique de Bio-Flow. Dégradé teal → violet → orange
 *    pour reprendre la palette des accents.
 *  - `prefers-reduced-motion` respecté : pas de tracé animé, simple fondu.
 *
 * Usage dans App.tsx :
 *   const [ready, setReady] = useState(false);
 *   // setReady(true) quand session Supabase restaurée + polices prêtes, etc.
 *   const [showSplash, setShowSplash] = useState(true);
 *   {showSplash && (
 *     <SplashScreen ready={ready} onFinish={() => setShowSplash(false)} />
 *   )}
 */
export function SplashScreen({
  ready,
  onFinish,
  minDuration = 900,
  logoSrc = "/logo.svg",
}: {
  ready: boolean;
  onFinish: () => void;
  minDuration?: number;
  logoSrc?: string;
}) {
  const [exiting, setExiting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, minDuration - elapsed);
    const t1 = setTimeout(() => setExiting(true), wait);
    const t2 = setTimeout(onFinish, wait + 380); // 380ms = durée du fondu sortie
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ready, minDuration, onFinish]);

  return (
    <div
      role="status"
      aria-label="Chargement de Bio-Flow"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #0d1b2a 0%, #0a1422 55%, #070f1a 100%)",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.02)" : "scale(1)",
        transition: "opacity 380ms ease, transform 600ms ease",
      }}
    >
      <style>{splashCss}</style>

      {/* Halo ambiant qui pulse doucement (respiration) */}
      <div aria-hidden className="bf-halo" />

      <div className="relative flex flex-col items-center gap-6 px-8">
        {/* Logo (le tien) avec repli SVG si le fichier est absent */}
        <div className="bf-logo">
          {!logoFailed ? (
            <img
              src={logoSrc}
              alt="Bio-Flow"
              width={88}
              height={88}
              onError={() => setLogoFailed(true)}
              className="h-22 w-22"
              style={{ height: 88, width: 88 }}
            />
          ) : (
            <FallbackMark />
          )}
        </div>

        {/* Mot-symbole */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="bf-wordmark">
            Bio
            <span style={{ color: "#2dd4bf" }}>·</span>
            Flow
          </h1>
          <p className="bf-tagline">Ton corps, en signal.</p>
        </div>

        {/* Signature : l'onde de pouls qui se dessine */}
        <svg
          className="bf-pulse"
          viewBox="0 0 240 48"
          fill="none"
          aria-hidden
          width={240}
          height={48}
        >
          <defs>
            <linearGradient id="bf-grad" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="55%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          </defs>
          <path
            d="M0 24 H70 L80 24 L88 8 L98 40 L108 16 L116 24 H150 L158 24 L166 30 L174 24 H240"
            stroke="url(#bf-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/** Repli si /logo.svg n'existe pas encore : un cœur-signal stylisé. */
function FallbackMark() {
  return (
    <svg width={88} height={88} viewBox="0 0 88 88" fill="none" aria-hidden>
      <circle cx="44" cy="44" r="42" stroke="#1e3a4f" strokeWidth="2" />
      <path
        d="M14 44 H30 L36 28 L46 60 L54 36 L60 44 H74"
        stroke="#2dd4bf"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const splashCss = `
@keyframes bf-draw { to { stroke-dashoffset: 0; } }
@keyframes bf-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bf-breathe { 0%,100% { opacity: .35; transform: scale(1); } 50% { opacity: .6; transform: scale(1.08); } }

.bf-halo {
  position: absolute;
  width: 460px; height: 460px;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(45,212,191,.18) 0%, rgba(45,212,191,0) 68%);
  filter: blur(8px);
  animation: bf-breathe 3.4s ease-in-out infinite;
  pointer-events: none;
}
.bf-logo { animation: bf-rise .6s ease-out both; }
.bf-wordmark {
  font-family: var(--font-display, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 700;
  font-size: 30px;
  letter-spacing: .04em;
  color: #f8fafc;
  margin: 0;
  animation: bf-rise .6s ease-out .08s both;
}
.bf-tagline {
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 12.5px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: rgba(148,163,184,.7);
  margin: 0;
  animation: bf-rise .6s ease-out .16s both;
}
.bf-pulse path {
  stroke-dasharray: 420;
  stroke-dashoffset: 420;
  animation: bf-draw 1.1s cubic-bezier(.5,0,.2,1) .28s forwards;
  filter: drop-shadow(0 0 6px rgba(45,212,191,.45));
}

@media (prefers-reduced-motion: reduce) {
  .bf-halo, .bf-logo, .bf-wordmark, .bf-tagline { animation: none; }
  .bf-pulse path { stroke-dashoffset: 0; animation: none; }
}
`;
