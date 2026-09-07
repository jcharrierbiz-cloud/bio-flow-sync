// src/components/MonthlyTaskChart.tsx
// -----------------------------------------------------------------------------
// Bio-Flow — Bilan mensuel des tâches : combien mises en place, combien faites.
//
// Choix de lecture (assumés, et écrits dans l'écran) :
//   • deux barres par mois, une seule échelle. Pas de second axe pour le taux —
//     un graphique à deux échelles trompe l'œil plus qu'il n'informe : le taux
//     est donné en chiffre, pas en courbe.
//   • « Créées » compte par date de création, « Réalisées » par date de
//     réalisation. Une tâche créée en mars et cochée en avril compte dans mars
//     d'un côté, avril de l'autre : réalisées peut dépasser créées sur un mois.
//   • Le « taux de réalisation » est un taux de cohorte : parmi les tâches
//     créées sur la période, la part finalement cochée. C'est la seule lecture
//     honnête de « est-ce que je tiens ce que je planifie ».
//
// Couleurs : paire validée (contraste + daltonisme) sur fond clair ET sombre.
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Info, Table2 } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useTodoStore } from "@/lib/todoStore";
import { approximatedCompletions, monthlyTaskStats, totalsFor } from "@/lib/taskStats";

/** Vert (réalisées) / bleu-canard (créées) — ΔE daltonisme ≥ 17 dans les 2 thèmes. */
const COLOR_CREATED = "#3488b2";
const COLOR_COMPLETED = "#5f8f3d";

// Recharts pose ses couleurs en attributs SVG : `var(--token)` n'y est pas
// interprété. On résout donc l'encre secondaire depuis le thème courant.
const AXIS_INK = { light: "#6b6b6b", dark: "#ada69a" } as const;

const RANGES = [
  { months: 6, label: "6 mois" },
  { months: 12, label: "12 mois" },
];

interface TooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  fill: string;
}

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.fill }}
            aria-hidden="true"
          />
          {p.name} : <span className="text-foreground font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const MonthlyTaskChart = () => {
  const todos = useTodoStore((s) => s.todos);
  const resolvedTheme = useTheme((s) => s.resolved);
  const axisInk = AXIS_INK[resolvedTheme] ?? AXIS_INK.light;
  const [months, setMonths] = useState(6);
  const [showTable, setShowTable] = useState(false);

  const stats = useMemo(() => monthlyTaskStats(todos, months), [todos, months]);
  const totals = useMemo(() => totalsFor(stats), [stats]);
  const approximated = useMemo(() => approximatedCompletions(todos), [todos]);
  const hasData = totals.created > 0 || totals.completed > 0;

  const data = stats.map((s) => ({
    label: s.label,
    created: s.created,
    completed: s.completed,
    cohortRate: s.cohortRate,
  }));

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Tâches par mois</h2>
          <p className="text-[10px] text-muted-foreground">
            Mises en place vs réellement réalisées
          </p>
        </div>
        {/* Filtres : une seule rangée, au-dessus du graphique */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/40 shrink-0">
          {RANGES.map((r) => (
            <button
              key={r.months}
              onClick={() => setMonths(r.months)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                months === r.months
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Créées", value: totals.created, color: COLOR_CREATED },
          { label: "Réalisées", value: totals.completed, color: COLOR_COMPLETED },
          {
            label: "Taux tenu",
            value: totals.rate != null ? `${totals.rate} %` : "—",
            color: null,
          },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-glass-border bg-muted/20 p-2.5">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {tile.color && (
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: tile.color }}
                  aria-hidden="true"
                />
              )}
              {tile.label}
            </span>
            <p className="mono text-lg font-bold text-foreground mt-0.5">{tile.value}</p>
          </div>
        ))}
      </div>

      {hasData ? (
        <>
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }} barGap={2}>
                <CartesianGrid
                  vertical={false}
                  stroke={axisInk}
                  strokeOpacity={0.2}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisInk, fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                  tick={{ fill: axisInk, fontSize: 10 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: axisInk, fillOpacity: 0.1 }} />
                <Legend
                  verticalAlign="bottom"
                  height={24}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                  // Le texte reste en encre neutre : c'est la pastille qui
                  // porte la couleur de la série, jamais le mot lui-même.
                  formatter={(value: string) => (
                    <span style={{ color: axisInk }}>{value}</span>
                  )}
                />
                {/* Animation courte : elle se rejoue à chaque filtre, une
                    longue transition donnerait un graphique vide pendant une
                    seconde et demie à chaque clic. */}
                <Bar
                  dataKey="created"
                  name="Créées"
                  fill={COLOR_CREATED}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                  animationDuration={400}
                />
                <Bar
                  dataKey="completed"
                  name="Réalisées"
                  fill={COLOR_COMPLETED}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                  animationDuration={400}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vue chiffrée — lisible sans percevoir les couleurs */}
          <button
            onClick={() => setShowTable((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Table2 className="w-3 h-3" />
            {showTable ? "Masquer les chiffres" : "Voir les chiffres"}
          </button>

          {showTable && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="font-medium py-1">Mois</th>
                    <th className="font-medium py-1 text-right">Créées</th>
                    <th className="font-medium py-1 text-right">Réalisées</th>
                    <th className="font-medium py-1 text-right">Taux tenu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-t border-glass-border">
                      <td className="py-1 text-foreground">{row.label}</td>
                      <td className="py-1 text-right mono text-foreground">{row.created}</td>
                      <td className="py-1 text-right mono text-foreground">{row.completed}</td>
                      <td className="py-1 text-right mono text-muted-foreground">
                        {row.cohortRate != null ? `${row.cohortRate} %` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-8">
          Aucune tâche enregistrée sur la période. Le graphique se remplit tout
          seul au fil de tes tâches.
        </p>
      )}

      {/* Honnêteté sur la donnée */}
      <div className="flex items-start gap-2 text-[10px] text-muted-foreground border-t border-glass-border pt-2">
        <Info className="w-3 h-3 shrink-0 mt-0.5" />
        <p>
          « Taux tenu » = part des tâches créées sur la période qui ont fini par
          être cochées.
          {approximated > 0 && (
            <>
              {" "}
              {approximated} tâche{approximated > 1 ? "s" : ""} cochée
              {approximated > 1 ? "s" : ""} avant cette mise à jour n'ont pas de
              date de réalisation : elles sont comptées à leur mois de création.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default MonthlyTaskChart;
