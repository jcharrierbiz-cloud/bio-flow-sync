interface EnergyRingProps {
  score: number;
  size?: number;
}

const EnergyRing = ({ score, size = 180 }: EnergyRingProps) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Energy ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#energyGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
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
        <span className="text-4xl font-bold mono text-gradient-energy">{score}</span>
        <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase mt-1">/ 100</span>
      </div>
    </div>
  );
};

export default EnergyRing;
