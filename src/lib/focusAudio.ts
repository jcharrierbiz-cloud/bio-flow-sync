// Focus Mode ambient audio using Web Audio API
let audioCtx: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;

export type FocusSound = "silence" | "whitenoise" | "beats";

function createWhiteNoise(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * 60, sampleRate); // 60s loop
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.15; // low volume white noise
  }
  return buffer;
}

function createBinauralBeats(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 60;
  const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const baseFreq = 200; // Hz
  const beatFreq = 10; // 10Hz alpha waves for focus
  for (let i = 0; i < left.length; i++) {
    const t = i / sampleRate;
    left[i] = Math.sin(2 * Math.PI * baseFreq * t) * 0.1;
    right[i] = Math.sin(2 * Math.PI * (baseFreq + beatFreq) * t) * 0.1;
  }
  return buffer;
}

export function playFocusSound(type: FocusSound) {
  stopFocusSound();
  if (type === "silence") return;

  audioCtx = new AudioContext();
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.5;
  gainNode.connect(audioCtx.destination);

  const buffer =
    type === "whitenoise"
      ? createWhiteNoise(audioCtx)
      : createBinauralBeats(audioCtx);

  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.loop = true;
  sourceNode.connect(gainNode);
  sourceNode.start();
}

export function stopFocusSound() {
  try {
    sourceNode?.stop();
  } catch {}
  sourceNode?.disconnect();
  gainNode?.disconnect();
  audioCtx?.close();
  sourceNode = null;
  gainNode = null;
  audioCtx = null;
}
