// Moteur de sons 100% synthétisé (Web Audio). Aucun fichier mp3, chargement nul,
// signature sonore propre à Bio-Flow.

type SoundName = "tap" | "scanStart" | "scanComplete" | "levelUp" | "error" | "focusStart" | "focusComplete";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
const KEY = "bioflow.sound";

export function initSound() {
  if (typeof window === "undefined") return;
  enabled = localStorage.getItem(KEY) !== "off";
  const unlock = () => {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  localStorage.setItem(KEY, v ? "on" : "off");
}
export function isSoundEnabled() {
  return enabled;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", peak = 0.5) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function play(name: SoundName) {
  if (!enabled || !ctx) return;
  switch (name) {
    case "tap":
      tone(420, 0, 0.06, "sine", 0.22);
      break;
    case "scanStart":
      tone(330, 0, 0.18, "sine", 0.3);
      tone(440, 0.06, 0.22, "sine", 0.25);
      break;
    case "scanComplete":
      tone(523.25, 0, 0.14, "sine", 0.4);
      tone(783.99, 0.1, 0.3, "sine", 0.35);
      break;
    case "levelUp":
      tone(523.25, 0, 0.12, "triangle", 0.35);
      tone(659.25, 0.1, 0.12, "triangle", 0.35);
      tone(987.77, 0.2, 0.4, "triangle", 0.4);
      break;
    case "error":
      tone(220, 0, 0.18, "sawtooth", 0.18);
      break;
    case "focusStart":
      tone(294, 0, 0.2, "sine", 0.28);
      break;
    case "focusComplete":
      tone(392, 0, 0.14, "sine", 0.32);
      tone(587.33, 0.1, 0.32, "sine", 0.36);
      break;
  }
}
