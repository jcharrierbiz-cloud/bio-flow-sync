import AnimatedScore from "@/components/AnimatedScore";
import { useEffect, useState } from "react";

interface EnergyRingProps {
  score: number;
  size?: number;
}

const getStatus = (score: number) => {
  if (score <= 0) return { label: "À calibrer", color: "text-muted-foreground" };
  if (score < 40) return { label: "Fatigué", color: "text-intensity" };
  if (score < 65) return { label: "Modéré", color: "text-warning" };
  if (score < 85) return { label: "En forme", color: "text-energy" };
  return { label: "Optimal", color: "text-energy" };
};

const EnergyRing = ({ score, size = 200 }: EnergyRingProps) => {
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const status = getStatus(score);

  // Animate the stroke offset on mount/score change so the ring "draws" itself
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimatedScore(score));
    return () => cancelAnimationFrame(t);
  }, [score]);

  const offset = circumference - (animatedScore / 100) * circumference;
  const isHigh = score >= 80;

  return (
    <div
      className={`relative flex items-center justify-center ${isHigh ? "ring-breathe" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#energyGradient)" strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1200ms cubic-bezier(0.22, 1, 0.36, 1)",
            filter: "drop-shadow(0 0 8px hsl(175 80% 45% / 0.4))",
          }}
        />
        <defs>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(175, 80%, 45%)" />
            <stop offset="100%" stopColor="hsl(160, 80%, 60%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold mono text-gradient-energy leading-none">
          <AnimatedScore value={score} />
        </span>
        <span className="text-[11px] text-muted-foreground font-medium tracking-wider uppercase mt-1">/ 100</span>
        <span className={`text-xs font-semibold mt-2 ${status.color}`}>{status.label}</span>
      </div>
    </div>
  );
};

export default EnergyRing;
