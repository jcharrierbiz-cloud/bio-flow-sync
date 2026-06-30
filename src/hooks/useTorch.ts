import { useCallback, useEffect, useRef, useState } from "react";

export function useTorch(stream: MediaStream | null) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    const track = stream?.getVideoTracks?.()[0] ?? null;
    trackRef.current = track;
    if (!track) {
      setSupported(false);
      return;
    }
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
    setSupported(Boolean(caps.torch));
  }, [stream]);

  const set = useCallback(async (value: boolean) => {
    const track = trackRef.current;
    if (!track) return false;
    try {
      await track.applyConstraints({ advanced: [{ torch: value } as any] });
      setOn(value);
      return true;
    } catch (e) {
      console.warn("[torch] échec", e);
      return false;
    }
  }, []);

  return { supported, on, set, toggle: () => set(!on) };
}
