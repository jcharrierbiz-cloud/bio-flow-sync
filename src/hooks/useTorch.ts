import { useCallback, useEffect, useState } from "react";

/**
 * useTorch — contrôle de la lampe (flash) de la caméra pendant un scan PPG.
 *
 * IMPORTANT — limitation navigateur :
 *   Le torch via le web fonctionne sur Android (Chrome/Edge) mais PAS sur
 *   iOS Safari : Apple n'expose pas la lampe aux APIs web. On détecte donc
 *   la capacité réelle via track.getCapabilities().torch et on expose
 *   `supported` pour que l'UI s'adapte (case grisée + message sur iOS).
 *
 * Usage :
 *   const track = stream?.getVideoTracks()[0] ?? null;
 *   const { supported, on, toggle } = useTorch(track);
 */

// getCapabilities/torch ne sont pas encore dans le typage standard DOM.
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchConstraint = { torch?: boolean };

export function useTorch(track: MediaStreamTrack | null | undefined) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);

  // Détection de capacité dès qu'un track est disponible
  useEffect(() => {
    if (!track || typeof track.getCapabilities !== "function") {
      setSupported(false);
      return;
    }
    try {
      const caps = track.getCapabilities() as TorchCapabilities;
      setSupported(Boolean(caps.torch));
    } catch {
      setSupported(false);
    }
  }, [track]);

  // Si le track change (nouvelle caméra), on repart éteint
  useEffect(() => {
    setOn(false);
  }, [track]);

  const setTorch = useCallback(
    async (value: boolean) => {
      if (!track || !supported) return false;
      try {
        await track.applyConstraints({
          advanced: [{ torch: value } as unknown as MediaTrackConstraintSet],
        });
        setOn(value);
        return true;
      } catch (err) {
        // Le device a annoncé la capacité mais a refusé : on remet l'état au propre
        console.warn("[useTorch] applyConstraints a échoué :", err);
        setSupported(false);
        setOn(false);
        return false;
      }
    },
    [track, supported]
  );

  const toggle = useCallback(() => setTorch(!on), [on, setTorch]);

  // Sécurité : on coupe la lampe quand le composant se démonte / le track meurt
  useEffect(() => {
    return () => {
      if (track && supported) {
        track
          .applyConstraints({ advanced: [{ torch: false } as unknown as MediaTrackConstraintSet] })
          .catch(() => {});
      }
    };
  }, [track, supported]);

  return { supported, on, toggle, setTorch };
}
