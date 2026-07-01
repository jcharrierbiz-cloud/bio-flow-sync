// src/lib/feedback.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Retour sensoriel (sons + haptique) pour donner « un peu de vie »
// à chaque interaction : appuis boutons, tics du scan, succès, level up…
//
// 100 % Web Audio API (aucun fichier audio à embarquer, aucune dépendance).
// Les sons sont synthétisés à la volée → poids nul, latence quasi nulle.
//
// Préférences persistées en localStorage (instantané, hors-ligne) :
//   - bioflow_sound_fx  : "true" | "false"  (sons d'interface)
//   - bioflow_haptics   : "true" | "false"  (vibrations)
//
// ⚠️ iOS/Safari ne supporte pas navigator.vibrate → l'haptique est ignorée
//    silencieusement (aucune erreur). Le son fonctionne partout.
// -----------------------------------------------------------------------------

const SOUND_KEY = "bioflow_sound_fx";
const HAPTICS_KEY = "bioflow_haptics";

type OscType = "sine" | "triangle" | "square" | "sawtooth";

// --- État des préférences (lecture unique, mémorisée) ------------------------

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "true";
  } catch {
    return fallback;
  }
}

let soundEnabled = readBool(SOUND_KEY, true);
let hapticsEnabled = readBool(HAPTICS_KEY, true);

// Abonnés (permet aux hooks React de se re-rendre quand une préférence change).
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* noop */
    }
  });
}

export function subscribeFeedback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}
export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export function setSoundEnabled(on: boolean): void {
  soundEnabled = on;
  try {
    localStorage.setItem(SOUND_KEY, String(on));
  } catch {
    /* stockage indisponible : on garde la valeur en mémoire */
  }
  emit();
}

export function setHapticsEnabled(on: boolean): void {
  hapticsEnabled = on;
  try {
    localStorage.setItem(HAPTICS_KEY, String(on));
  } catch {
    /* noop */
  }
  emit();
}

// --- Moteur audio ------------------------------------------------------------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AudioCtor: typeof AudioContext | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    ctx = new AudioCtor();
    master = ctx.createGain();
    master.gain.value = 0.9; // les gains par-son sont déjà faibles
    master.connect(ctx.destination);
    return ctx;
  } catch {
    ctx = null;
    return null;
  }
}

/**
 * Débloque le contexte audio. À appeler lors du premier geste utilisateur
 * (les navigateurs suspendent l'AudioContext tant qu'aucune interaction n'a eu lieu).
 * Le hook useGlobalTapFeedback s'en charge automatiquement.
 */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") {
    c.resume().catch(() => {
      /* noop */
    });
  }
}

interface BlipOptions {
  freq: number;
  type?: OscType;
  duration?: number; // secondes
  gain?: number; // 0..1 (crête)
  attack?: number; // secondes
  when?: number; // offset depuis maintenant (secondes)
  sweepTo?: number; // fréquence cible (glissando) optionnelle
}

function blip(opts: BlipOptions): void {
  if (!soundEnabled) return;
  const c = getCtx();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const {
    freq,
    type = "sine",
    duration = 0.12,
    gain = 0.14,
    attack = 0.005,
    when = 0,
    sweepTo,
  } = opts;

  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo && sweepTo > 0) {
    osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
  }

  // Enveloppe percussive : attaque rapide puis extinction exponentielle.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

// --- Haptique ----------------------------------------------------------------

/** Vibration courte, ignorée silencieusement si l'appareil ne la supporte pas (iOS). */
export function vibrate(pattern: number | number[]): void {
  if (!hapticsEnabled) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    /* noop */
  }
}

// --- Palette de sons ----------------------------------------------------------

export const feedback = {
  unlock: unlockAudio,
  vibrate,

  /** Appui bouton « plein » (validation, action principale). */
  tap(): void {
    blip({ freq: 660, type: "triangle", duration: 0.07, gain: 0.12 });
  },

  /** Appui discret, utilisé par le retour global sur tous les boutons. */
  softTap(): void {
    blip({ freq: 520, type: "sine", duration: 0.05, gain: 0.07 });
  },

  /** Bascule d'un réglage : montante si activé, descendante si désactivé. */
  toggle(on: boolean): void {
    if (on) blip({ freq: 540, type: "sine", duration: 0.09, gain: 0.11, sweepTo: 760 });
    else blip({ freq: 480, type: "sine", duration: 0.09, gain: 0.09, sweepTo: 320 });
    vibrate(10);
  },

  /** Petit tic — cadence d'attente / décompte pendant le scan. */
  tick(): void {
    blip({ freq: 880, type: "sine", duration: 0.03, gain: 0.06 });
  },

  /** Battement — à jouer à chaque pulsation détectée pendant le scan. */
  beat(): void {
    blip({ freq: 130, type: "sine", duration: 0.11, gain: 0.16 });
    vibrate(12);
  },

  /** Démarrage d'une mesure / d'un flux. */
  scanStart(): void {
    blip({ freq: 320, type: "sine", duration: 0.22, gain: 0.12, sweepTo: 720 });
    vibrate(18);
  },

  /** Fin de mesure réussie — accord résolutif. */
  scanComplete(): void {
    blip({ freq: 523.25, type: "triangle", duration: 0.16, gain: 0.12, when: 0 }); // C5
    blip({ freq: 659.25, type: "triangle", duration: 0.16, gain: 0.12, when: 0.09 }); // E5
    blip({ freq: 783.99, type: "triangle", duration: 0.24, gain: 0.13, when: 0.18 }); // G5
    vibrate([20, 40, 20]);
  },

  /** Succès générique (sauvegarde, objectif atteint). */
  success(): void {
    blip({ freq: 587.33, type: "sine", duration: 0.12, gain: 0.12, when: 0 }); // D5
    blip({ freq: 880, type: "sine", duration: 0.16, gain: 0.12, when: 0.08 }); // A5
    vibrate(15);
  },

  /** Erreur / action refusée. */
  error(): void {
    blip({ freq: 220, type: "square", duration: 0.14, gain: 0.09, when: 0 });
    blip({ freq: 165, type: "square", duration: 0.18, gain: 0.09, when: 0.1 });
    vibrate([30, 40, 30]);
  },

  /** Montée de niveau (gamification). */
  levelUp(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, i) => blip({ freq: f, type: "triangle", duration: 0.18, gain: 0.13, when: i * 0.08 }));
    vibrate([15, 30, 15, 30]);
  },
};

export type Feedback = typeof feedback;
