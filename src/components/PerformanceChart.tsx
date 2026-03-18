// @ts-nocheck
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";

const data = [
  { hour: "6h", energy: 40 },
  { hour: "7h", energy: 55 },
  { hour: "8h", energy: 72 },
  { hour: "9h", energy: 85 },
  { hour: "10h", energy: 88 },
  { hour: "11h", energy: 82 },
  { hour: "12h", energy: 70 },
  { hour: "13h", energy: 55 },
  { hour: "14h", energy: 50 },
  { hour: "15h", energy: 62 },
  { hour: "16h", energy: 75 },
  { hour: "17h", energy: 70 },
  { hour: "18h", energy: 60 },
  { hour: "19h", energy: 50 },
  { hour: "20h", energy: 40 },
  { hour: "21h", energy: 30 },
  { hour: "22h", energy: 20 },
];

const PerformanceChart = () => {
  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(175, 80%, 45%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(175, 80%, 45%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }}
            interval={3}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }}
            domain={[0, 100]}
            ticks={[0, 50, 100]}
          />
          <ReferenceLine y={70} stroke="hsl(175, 80%, 45%)" strokeDasharray="3 6" strokeOpacity={0.3} />
          <Area
            type="monotone"
            dataKey="energy"
            stroke="hsl(175, 80%, 45%)"
            strokeWidth={2}
            fill="url(#energyFill)"
            dot={false}
            activeDot={{ r: 4, fill: "hsl(175, 80%, 45%)", stroke: "hsl(222, 47%, 5%)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
