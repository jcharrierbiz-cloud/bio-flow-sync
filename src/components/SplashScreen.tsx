import { useEffect, useState } from "react";

const NAVY = "#0A0E1A";

interface SplashScreenProps {
  ready: boolean;
  minDuration?: number;
  onFinish?: () => void;
}

export default function SplashScreen({ ready, minDuration = 800, onFinish }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [mountedAt] = useState(() => performance.now());

  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, minDuration - (performance.now() - mountedAt));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onFinish?.(), 450);
    }, wait);
    return () => clearTimeout(t);
  }, [ready, minDuration, mountedAt, onFinish]);

  return (
    <div
      className="bf-splash"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(120% 120% at 50% 40%, #121a2e 0%, ${NAVY} 70%)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 450ms ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="bf-mark" style={{ width: 132, height: 132, marginBottom: 26 }}>
        <svg width="132" height="132" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="bfGrad" x1="0" y1="14" x2="0" y2="106" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#6BD089" />
              <stop offset="1" stopColor="#3C9A5E" />
            </linearGradient>
          </defs>

          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke="url(#bfGrad)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="232 44.46"
            transform="rotate(125 60 60)"
          />

          <path
            className="bf-pulse"
            d="M14 60 H44 L50 60 L56 52 L62 60 L68 60 L74 40 L82 82 L90 60 L96 57 L102 60 H106"
            fill="none"
            stroke="url(#bfGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
          />
        </svg>
      </div>

      <div
        style={{
          font: "600 26px/1 'Poppins', system-ui, -apple-system, sans-serif",
          letterSpacing: ".5px",
          color: "#F4F1EA",
        }}
      >
        Bio<span style={{ fontWeight: 400, color: "#BFE6CD" }}>-Flow</span>
      </div>

      <style>{`
        .bf-pulse { stroke-dasharray: 1; stroke-dashoffset: 1; animation: bf-trace 1.6s ease-in-out infinite; }
        .bf-mark  { animation: bf-breath 1.6s ease-in-out infinite; transform-origin: center; }
        @keyframes bf-trace {
          0% { stroke-dashoffset: 1; }
          45% { stroke-dashoffset: 0; }
          70%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes bf-breath {
          0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 6px rgba(107,208,137,.25)); }
          45%      { transform: scale(1.04); filter: drop-shadow(0 0 16px rgba(107,208,137,.45)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bf-pulse, .bf-mark { animation: none !important; }
          .bf-pulse { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
