import { Zap, ZapOff } from "lucide-react";
import { useTorch } from "@/hooks/useTorch";
import { useSound } from "@/hooks/useSound";

/**
 * FlashToggle — case "Activer le flash" pour l'écran de scan.
 *
 * - Détecte si le device supporte le torch (sinon : grisé + explication).
 * - Style cohérent avec l'identité Bio-Flow (verre dépoli + accent teal).
 * - Feedback sonore au tap.
 *
 * Passe-lui le track vidéo du flux de la caméra :
 *   const track = stream?.getVideoTracks()[0] ?? null;
 *   <FlashToggle track={track} />
 *
 * Remplace les classes de couleur arbitraires (#…) par tes tokens Tailwind
 * (ex: bg-card, text-primary) si tu en as déjà.
 */
export function FlashToggle({
  track,
}: {
  track: MediaStreamTrack | null | undefined;
}) {
  const { supported, on, toggle } = useTorch(track);
  const { play } = useSound();

  const handleToggle = () => {
    if (!supported) return;
    play("tap");
    toggle();
  };

  return (
    <div className="w-full">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-disabled={!supported}
        disabled={!supported}
        onClick={handleToggle}
        className={[
          "group flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3",
          "border backdrop-blur-md transition-all duration-200",
          supported
            ? on
              ? "border-[#2dd4bf]/60 bg-[#2dd4bf]/10 shadow-[0_0_24px_-6px_rgba(45,212,191,0.55)]"
              : "border-white/10 bg-white/5 hover:border-white/20"
            : "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50",
        ].join(" ")}
      >
        <span className="flex items-center gap-3">
          <span
            className={[
              "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
              on ? "bg-[#2dd4bf]/20 text-[#2dd4bf]" : "bg-white/5 text-white/60",
            ].join(" ")}
          >
            {on ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
          </span>
          <span className="text-left">
            <span className="block text-sm font-medium text-white">
              Activer le flash
            </span>
            <span className="block text-xs text-white/50">
              {supported
                ? "Améliore la lecture du signal dans la pénombre"
                : "Indisponible sur cet appareil"}
            </span>
          </span>
        </span>

        {/* Piste du switch */}
        <span
          aria-hidden
          className={[
            "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
            on ? "bg-[#2dd4bf]" : "bg-white/15",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
              on ? "translate-x-[22px]" : "translate-x-0.5",
            ].join(" ")}
          />
        </span>
      </button>

      {/* Message dédié iOS : l'utilisateur comprend que ce n'est pas un bug */}
      {!supported && (
        <p className="mt-2 px-1 text-[11px] leading-snug text-white/40">
          Sur iPhone, le navigateur ne donne pas accès à la lampe. Place-toi
          dans un endroit bien éclairé pour une mesure fiable.
        </p>
      )}
    </div>
  );
}
