'use client';
/** Procedural UI sounds (no audio files). Soft, short and quiet like a cozy game. */
let ctx: AudioContext | null = null;
let muted = false;
export function setMuted(value: boolean) {muted = value;}
export function isMuted() {return muted;}

function audio() {
  if (typeof window === 'undefined' || muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {return null;}
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.08) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + duration);
  osc.connect(g).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + duration + 0.05);
}

export const sfx = {
  tap: () => tone(880, 0, 0.08, 'triangle', 0.05),
  open: () => {tone(660, 0, 0.08, 'triangle', 0.05); tone(990, 0.05, 0.1, 'triangle', 0.04);},
  coin: () => {tone(1318, 0, 0.08, 'square', 0.03); tone(1760, 0.07, 0.14, 'square', 0.03);},
  success: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.06)),
  fail: () => {tone(392, 0, 0.15, 'triangle', 0.05); tone(311, 0.12, 0.25, 'triangle', 0.05);},
  splash: () => {tone(220, 0, 0.18, 'sine', 0.06); tone(160, 0.05, 0.25, 'sine', 0.04);},
  bite: () => {tone(1200, 0, 0.06, 'square', 0.05); tone(1200, 0.1, 0.06, 'square', 0.05);},
  shutter: () => {tone(2000, 0, 0.03, 'square', 0.04); tone(900, 0.04, 0.05, 'square', 0.03);},
  swish: () => tone(500, 0, 0.12, 'sawtooth', 0.02),
  levelUp: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle', 0.07)),
  step: () => tone(140 + Math.random() * 30, 0, 0.05, 'sine', 0.015),
};
