/**
 * AmbientBackground
 * ------------------
 * Two very large, heavily-blurred radial halos (energy + violet) that drift
 * slowly behind the whole app. Pure CSS transforms — no canvas, no JS loop,
 * so it costs almost nothing and never blocks the main thread.
 *
 * Mounted ONCE, fixed, behind everything (z-index 0, content sits above).
 * Honours prefers-reduced-motion: halos still render (for depth) but stop moving.
 */
const AmbientBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="ambient-bg pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Energy halo — top, drifts gently */}
      <div
        className="ambient-blob ambient-blob--energy"
        style={{
          position: "absolute",
          top: "-15%",
          left: "20%",
          width: "60vw",
          height: "60vw",
          maxWidth: 620,
          maxHeight: 620,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, hsl(175 80% 45% / 0.10) 0%, hsl(175 80% 45% / 0.03) 45%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Violet halo — bottom, drifts on a different rhythm */}
      <div
        className="ambient-blob ambient-blob--violet"
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "10%",
          width: "55vw",
          height: "55vw",
          maxWidth: 560,
          maxHeight: 560,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, hsl(270 75% 60% / 0.09) 0%, hsl(270 75% 60% / 0.025) 45%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />
    </div>
  );
};

export default AmbientBackground;
