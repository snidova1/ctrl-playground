import * as THREE from 'three';
import type {Weather} from '@/game/core/clock';

interface Key {h: number; top: string; horizon: string; ground: string; sun: string; sunI: number; amb: number; fog: string}
// Pastel sky keyframes across the in-game day.
const KEYS: Key[] = [
  {h: 0, top: '#1d2453', horizon: '#3e4a86', ground: '#26304f', sun: '#9fb2ff', sunI: 0.35, amb: 0.55, fog: '#33406e'},
  {h: 4.5, top: '#2a2f66', horizon: '#6b6aa6', ground: '#3a3f63', sun: '#b7b8ff', sunI: 0.4, amb: 0.6, fog: '#5b5d93'},
  {h: 6, top: '#7fb0e8', horizon: '#ffc9a8', ground: '#8a8f7a', sun: '#ffc79a', sunI: 1.25, amb: 0.85, fog: '#f3c8b5'},
  {h: 8.5, top: '#6fb8f2', horizon: '#cdeaff', ground: '#8fa77a', sun: '#fff1d6', sunI: 2.1, amb: 1.0, fog: '#d6ecfb'},
  {h: 13, top: '#58aef2', horizon: '#c5e8ff', ground: '#94ad7c', sun: '#fffaf0', sunI: 2.5, amb: 1.05, fog: '#cfe9fb'},
  {h: 16.5, top: '#68a9e6', horizon: '#ffe2b8', ground: '#9ea676', sun: '#ffe1b0', sunI: 2.1, amb: 0.98, fog: '#f6e2c6'},
  {h: 18.5, top: '#7b7fd0', horizon: '#ffa98a', ground: '#8f7f7a', sun: '#ff9f73', sunI: 1.35, amb: 0.85, fog: '#f2ad98'},
  {h: 20, top: '#3c3f86', horizon: '#b27aa8', ground: '#4a4766', sun: '#c79ad6', sunI: 0.6, amb: 0.65, fog: '#77649a'},
  {h: 24, top: '#1d2453', horizon: '#3e4a86', ground: '#26304f', sun: '#9fb2ff', sunI: 0.35, amb: 0.55, fog: '#33406e'},
];

const a = new THREE.Color(), b = new THREE.Color();
function mix(x: string, y: string, t: number) {
  return a.set(x).lerp(b.set(y), t).clone();
}

export interface SkyState {top: THREE.Color; horizon: THREE.Color; ground: THREE.Color; sun: THREE.Color; sunIntensity: number; ambient: number; fog: THREE.Color; sunDir: THREE.Vector3; night: number}
export function skyAt(hour: number, weather: Weather): SkyState {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= hour) i++;
  const k0 = KEYS[i], k1 = KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (hour - k0.h) / (k1.h - k0.h)));
  const s: SkyState = {
    top: mix(k0.top, k1.top, t), horizon: mix(k0.horizon, k1.horizon, t), ground: mix(k0.ground, k1.ground, t),
    sun: mix(k0.sun, k1.sun, t), sunIntensity: k0.sunI + (k1.sunI - k0.sunI) * t, ambient: k0.amb + (k1.amb - k0.amb) * t,
    fog: mix(k0.fog, k1.fog, t), sunDir: new THREE.Vector3(), night: 0,
  };
  // Sun arcs east → west during the day; the moon light comes from above at night.
  const dayT = (hour - 6) / 14;
  const angle = Math.PI * Math.min(1, Math.max(0, dayT));
  const day = hour >= 6 && hour <= 20;
  s.sunDir.set(Math.cos(angle) * 0.9, day ? Math.max(0.25, Math.sin(angle)) : 0.8, 0.45).normalize();
  s.night = hour < 5.5 || hour > 19.5 ? 1 : hour < 7 ? (7 - hour) / 1.5 : hour > 18 ? (hour - 18) / 1.5 : 0;
  if (weather === 'cloudy' || weather === 'rain') {
    const grey = new THREE.Color(weather === 'rain' ? '#8f9aa8' : '#b9c3cc');
    const k = weather === 'rain' ? 0.55 : 0.35;
    s.top.lerp(grey, k); s.horizon.lerp(grey, k); s.fog.lerp(grey, k);
    s.sunIntensity *= weather === 'rain' ? 0.45 : 0.7;
  }
  return s;
}
