import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface Props {
  greeting: string;
  userName: string;
  shouldPlay: boolean;
  onPlayed: () => void;
}

/**
 * Plays a warm TTS greeting via the edge function.
 * Falls back silently if unavailable.
 */
const AudioGreeting = ({ greeting, userName, shouldPlay, onPlayed }: Props) => {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!shouldPlay || muted) return;

    const playGreeting = async () => {
      try {
        const text = `${greeting} ${userName} ! J'espère que tu passes une excellente journée.`;
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-greeting`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text }),
          }
        );

        if (!response.ok) throw new Error("TTS failed");

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.volume = 0.6;
        audioRef.current = audio;

        setPlaying(true);
        audio.onended = () => {
          setPlaying(false);
          URL.revokeObjectURL(audioUrl);
          onPlayed();
        };
        await audio.play();
      } catch {
        // Silently fail — audio greeting is optional
        onPlayed();
      }
    };

    playGreeting();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPlay, muted]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    }
    setMuted(true);
    onPlayed();
  };

  if (!shouldPlay && !playing) return null;

  return (
    <button
      onClick={toggleMute}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ai-violet/10 text-ai-violet text-[10px] font-medium hover:bg-ai-violet/20 transition-colors"
    >
      {playing ? (
        <>
          <Volume2 className="w-3 h-3 animate-pulse" />
          <span>En cours…</span>
        </>
      ) : (
        <>
          <VolumeX className="w-3 h-3" />
          <span>Muet</span>
        </>
      )}
    </button>
  );
};

export default AudioGreeting;
