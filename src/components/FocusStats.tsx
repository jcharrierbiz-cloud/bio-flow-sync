import { useFocusStats } from "@/hooks/useFocusStats";

const GREEN = "#6BD089";
const GREEN_DEEP = "#3C9A5E";

const fmt = (s: number) => {
  if (!s) return "0m";
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m}m`;
};

export default function FocusStats() {
  const { stats, loading } = useFocusStats();

  if (loading)
    return (
      <div style={{ color: "#9AA6BD", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: 16 }}>
        Chargement…
      </div>
    );

  if (stats.sessionCount === 0)
    return (
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          textAlign: "center",
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div style={{ fontSize: 15, color: "#E8EDF7", marginBottom: 6 }}>Aucune session pour l'instant</div>
        <div style={{ fontSize: 13, color: "#9AA6BD" }}>Lance ton premier Focus Lock — tes stats apparaîtront ici.</div>
      </div>
    );

  const maxDay = Math.max(...stats.last7Days.map((d) => d.seconds), 1);

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div
      style={{
        flex: 1,
        minWidth: 110,
        padding: 14,
        borderRadius: 14,
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600, color: GREEN }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#9AA6BD", marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Stat label="Aujourd'hui" value={fmt(stats.todaySeconds)} />
        <Stat label="Série" value={`${stats.currentStreak} j`} />
        <Stat label="7 jours" value={fmt(stats.weekSeconds)} />
        <Stat label="Session moy." value={fmt(stats.avgSeconds)} />
        <Stat label="Plus longue" value={fmt(stats.longestSeconds)} />
        <Stat label="Aboutissement" value={`${Math.round(stats.completionRate * 100)}%`} />
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 16,
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div style={{ fontSize: 12, color: "#9AA6BD", marginBottom: 12 }}>Focus — 7 derniers jours</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
          {stats.last7Days.map((d) => {
            const h = Math.max(4, Math.round((d.seconds / maxDay) * 80));
            const dow = new Date(d.date).toLocaleDateString("fr-FR", { weekday: "narrow" });
            return (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: "100%",
                    height: h,
                    borderRadius: 6,
                    background: `linear-gradient(180deg, ${GREEN}, ${GREEN_DEEP})`,
                    opacity: d.seconds ? 1 : 0.25,
                  }}
                />
                <span style={{ fontSize: 10, color: "#7A879E" }}>{dow}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
