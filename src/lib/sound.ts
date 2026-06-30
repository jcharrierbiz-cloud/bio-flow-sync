/**
 * Bio-Flow — moteur sonore
 * --------------------------------------------------------------------------
 * Sons SYNTHÉTISÉS via la Web Audio API (aucun fichier audio, ~0 ko de bundle).
 *
 * Signature sonore Bio-Flow : tout est construit autour du pouls.
 *  - scanStart    : deux "thumps" graves façon battement cardiaque (lub-dub)
 *  - scanComplete : montée d'une quinte juste = sensation de "lock"/verrouillage
 *  - success      : quinte ascendante douce
 *  - tap          : tick sinusoïdal très court
 *  - levelUp      : petit arpège chaud
 *  - error        : descente douce, jamais agressive
 *
 * Contraintes respectées :
 *  - l'AudioContext ne démarre qu'après un geste utilisateur (politique navigateur)
 *  - mute global persistant (localStorage)
 *  - volume maître bas par défaut : on touche les sens, on n'agresse pas
 */

type SoundName =
  | "tap"
  | "success"
  | "scanStart"
  | "scanComplete"
  | "levelUp"
  | "error";

const STORAGE_KEY = "bioflow.sound.muted";
const MASTER_VOLUME = 0.18; // volontairement bas

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean;
  private unlocked = false;

  constructor() {
    this.muted =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(STORAGE_KEY) === "true";
  }

  /** À appeler une fois au démarrage : débloque le son au premier geste. */
  registerUnlock() {
    if (typeof window === "undefined" || this.unlocked) return;
    const unlock = () => {
      this.ensureContext();
      if (this.ctx?.state === "suspended") this.ctx.resume();
      this.unlocked = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });
    window.addEventListener("touchstart", unlock, { once: false });
  }

  private ensureContext() {
    if (this.ctx) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_VOLUME;
    this.master.connect(this.ctx.destination);
  }

  isMuted() {
    return this.muted;
  }

  setMuted(value: boolean) {
    this.muted = value;
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* mode privé : on ignore */
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Joue une note simple avec enveloppe ADSR douce.
   */
  private note(
    freq: number,
    {
      type = "sine",
      start = 0,
      duration = 0.18,
      gain = 1,
      glideTo,
    }: {
      type?: OscillatorType;
      start?: number;
      duration?: number;
      gain?: number;
      glideTo?: number;
    } = {}
  ) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);

    // Enveloppe : attaque rapide, release exponentiel (évite les "clics")
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  play(name: SoundName) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    switch (name) {
      // Tick discret : feedback de tap / navigation
      case "tap":
        this.note(660, { type: "sine", duration: 0.06, gain: 0.5 });
        break;

      // Battement cardiaque : lub-dub grave avant le scan
      case "scanStart":
        this.note(98, { type: "sine", duration: 0.16, gain: 0.9 });
        this.note(74, { type: "sine", start: 0.22, duration: 0.2, gain: 0.7 });
        break;

      // "Lock" : glide ascendant = capture verrouillée
      case "scanComplete":
        this.note(330, {
          type: "triangle",
          duration: 0.28,
          gain: 0.8,
          glideTo: 494,
        });
        this.note(494, { type: "sine", start: 0.18, duration: 0.32, gain: 0.6 });
        break;

      // Succès : quinte juste ascendante (do → sol), douce
      case "success":
        this.note(523.25, { type: "sine", duration: 0.16, gain: 0.7 });
        this.note(783.99, { type: "sine", start: 0.1, duration: 0.26, gain: 0.6 });
        break;

      // Level up : petit arpège majeur chaud
      case "levelUp":
        this.note(523.25, { type: "triangle", duration: 0.14, gain: 0.7 });
        this.note(659.25, { type: "triangle", start: 0.1, duration: 0.14, gain: 0.7 });
        this.note(783.99, { type: "triangle", start: 0.2, duration: 0.14, gain: 0.7 });
        this.note(1046.5, { type: "sine", start: 0.3, duration: 0.34, gain: 0.6 });
        break;

      // Erreur : descente douce, non punitive
      case "error":
        this.note(392, { type: "sine", duration: 0.18, gain: 0.6, glideTo: 261.63 });
        break;
    }
  }
}

/** Instance unique partagée par toute l'appli. */
export const sound = new SoundEngine();
export type { SoundName };
