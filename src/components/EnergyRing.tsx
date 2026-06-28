import AnimatedScore from "@/components/AnimatedScore";

interface EnergyRingProps {
  score: number;
  size?: number;
}

// Status text derived from the score so the empty space inside the ring carries meaning
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
  const offset = circumference - (score / 100) * circumference;
  const status = getStatus(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#energyGradient)" strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-[1200ms] ease-out"
          style={{ filter: "drop-shadow(0 0 8px hsl(175 80% 45% / 0.4))" }}
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
