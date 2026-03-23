// @ts-nocheck
import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";
import { generateBioWindowCurve, ScanSession } from "@/lib/scanStore";

interface Props {
  morningScan: ScanSession | null;
  additionalScans: ScanSession[];
}

const BioWindowChart = ({ morningScan, additionalScans }: Props) => {
  const data = useMemo(
    () => generateBioWindowCurve(morningScan, additionalScans),
    [morningScan, additionalScans]
  );

  const currentHour = new Date().getHours();

  // Find peak window
  const peakHours = data
    .filter((d) => d.zone === "peak")
    .map((d) => d.hour);
  const peakLabel = peakHours.length >= 2
    ? `${peakHours[0]}-${peakHours[peakHours.length - 1]}`
    : "—";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">BioWindow</h2>
        <span className="text-[10px] text-energy font-medium bg-energy/10 px-2 py-0.5 rounded-full">
          Peak: {peakLabel}
        </span>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="bioGradPeak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(175, 80%, 45%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(175, 80%, 45%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              interval={3}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 40, 65, 100]}
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={65} stroke="hsl(175, 80%, 45%)" strokeDasharray="3 3" strokeOpacity={0.4} />
            <ReferenceLine y={40} stroke="hsl(45, 90%, 55%)" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine
              x={`${currentHour.toString().padStart(2, "0")}:00`}
              stroke="hsl(var(--foreground))"
              strokeDasharray="2 2"
              strokeOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="energy"
              stroke="hsl(175, 80%, 45%)"
              strokeWidth={2}
              fill="url(#bioGradPeak)"
              animationDuration={800}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(175, 80%, 45%)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-energy" /> Pic de performance
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" /> Travail léger
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-intensity" /> Repos conseillé
        </span>
      </div>
    </div>
  );
};

export default BioWindowChart;
