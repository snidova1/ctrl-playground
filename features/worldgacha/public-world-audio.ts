'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {districtAt, MARKET_STALLS} from './public-districts';

/** Structural subset: no state/scene runtime dependency, and old states remain valid. */
export interface WorldAudioState {
  time: number;
  phase: string;
  player: {x: number; z: number; moving: boolean; running?: boolean; action: string};
  publicPulse?: {id: string; sequence: number; x: number; z: number; until: number};
}
export type WorldAudioRef = {readonly current: WorldAudioState};
export type AudioCue = 'step' | 'bird' | 'insect' | 'crockery' | 'chime' | 'water';
export interface AudioEvent {kind: AudioCue; gain: number; pan: number; soft?: boolean}
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

/** Smooth finite hearing radius: distant districts never leak across the whole map. */
export function audioProximity(x: number, z: number, sourceX: number, sourceZ: number, radius: number) {
  const t = clamp(1 - Math.hypot(x - sourceX, z - sourceZ) / radius);
  return t * t * (3 - 2 * t);
}
export function worldAudioMix(state: WorldAudioState) {
  const {x, z, moving, running, action} = state.player;
  const garden = audioProximity(x, z, -39, 0, 21);
  const evening = state.phase === 'sunset' || state.phase === 'dusk';
  const stall = MARKET_STALLS.reduce((best, point) =>
    Math.hypot(x - point[0], z - point[1]) < Math.hypot(x - best[0], z - best[1]) ? point : best,
  MARKET_STALLS[0] as typeof MARKET_STALLS[number]);
  return {
    district: districtAt(x).id,
    breeze: evening ? .018 : .024,
    fountain: .075 * audioProximity(x, z, 0, 0, 22),
    fountainPan: clamp(-x / 16, -.65, .65),
    birds: evening ? 0 : garden * .018,
    insects: evening ? garden * .006 : 0,
    market: .013 * audioProximity(x, z, stall[0], stall[1], 13),
    marketPan: clamp((stall[0] - x) / 12, -.65, .65),
    steps: moving && action === 'walk',
    stepInterval: running ? .31 : .52,
    softSteps: districtAt(x).id === 'spring-garden',
  };
}

export interface AudioCursor {
  x: number; z: number; time: number; nextStep: number; nextDetail: number;
  nextReaction: number; pulse: string; foot: number;
}
const pulseKey = (state: WorldAudioState) => state.publicPulse ? `${state.publicPulse.id}:${state.publicPulse.sequence}` : '';
export function createAudioCursor(state: WorldAudioState, clock: number): AudioCursor {
  return {x: state.player.x, z: state.player.z, time: state.time, nextStep: clock,
    nextDetail: clock + 6, nextReaction: clock, pulse: pulseKey(state), foot: 0};
}
/** Pure scheduler. At most one detail/reaction plus one footstep per tick; never catch up. */
export function decideWorldAudio(state: WorldAudioState, clock: number, previous: AudioCursor, random = .5) {
  const mix = worldAudioMix(state), cursor = {...previous}, events: AudioEvent[] = [];
  const advanced = state.time > previous.time;
  const moved = Math.hypot(state.player.x - previous.x, state.player.z - previous.z);
  if (mix.steps && advanced && moved > .004 && moved < 3 && clock >= cursor.nextStep) {
    events.push({kind: 'step', gain: state.player.running ? .034 : .025, pan: cursor.foot % 2 ? .13 : -.13, soft: mix.softSteps});
    cursor.foot++;
    cursor.nextStep = clock + mix.stepInterval;
  } else if (!mix.steps || !advanced || moved >= 3) cursor.nextStep = clock;
  cursor.x = state.player.x; cursor.z = state.player.z; cursor.time = state.time;
  const key = pulseKey(state), pulse = state.publicPulse;
  if (key !== cursor.pulse) {
    cursor.pulse = key;
    if (pulse && pulse.until > state.time && clock >= cursor.nextReaction) {
      const gain = audioProximity(state.player.x, state.player.z, pulse.x, pulse.z, 16);
      const kind = pulse.id === 'market-bell' ? 'chime' : pulse.id === 'market-tea' ? 'crockery' : pulse.id === 'garden-tend' ? 'water' : null;
      if (kind && gain > .02) {
        events.push({kind, gain: gain * (kind === 'water' ? .032 : .025), pan: clamp((pulse.x - state.player.x) / 12, -.65, .65)});
        cursor.nextReaction = clock + 1.2;
        cursor.nextDetail = Math.max(cursor.nextDetail, clock + 8);
      }
    }
  }
  if (clock >= cursor.nextDetail) {
    if (mix.market > .001) events.push({kind: random > .8 ? 'chime' : 'crockery', gain: mix.market, pan: mix.marketPan});
    else if (mix.birds > .001) events.push({kind: 'bird', gain: mix.birds, pan: -.3});
    else if (mix.insects > .0005) events.push({kind: 'insect', gain: mix.insects, pan: .25});
    cursor.nextDetail = clock + (mix.market > .001 ? 20 : 11) + clamp(random) * 13;
  }
  return {mix, cursor, events};
}

interface Voice {source: AudioScheduledSourceNode; nodes: AudioNode[]}
class AudioGraph {
  private master: GainNode;
  private breeze: GainNode;
  private fountain: GainNode;
  private fountainPan: StereoPannerNode | null;
  private noise: AudioBuffer;
  private voices = new Set<Voice>();
  private disposed = false;
  constructor(private ctx: AudioContext, random: () => number) {
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = random() - .5;
    this.breeze = this.loop('lowpass', 440, .5).gain;
    const fountain = this.loop('bandpass', 1350, .65);
    this.fountain = fountain.gain; this.fountainPan = fountain.pan;
  }
  private panner(gain: GainNode, value: number) {
    // Older browsers can fall back to centered audio without breaking the toggle.
    if (typeof this.ctx.createStereoPanner !== 'function') {gain.connect(this.master); return null;}
    const pan = this.ctx.createStereoPanner(); pan.pan.value = value;
    gain.connect(pan).connect(this.master); return pan;
  }
  private track(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    const voice = {source, nodes}; this.voices.add(voice);
    source.onended = () => {for (const node of nodes) node.disconnect(); this.voices.delete(voice);};
  }
  private loop(type: BiquadFilterType, frequency: number, q: number) {
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    source.buffer = this.noise; source.loop = true;
    filter.type = type; filter.frequency.value = frequency; filter.Q.value = q; gain.gain.value = 0;
    source.connect(filter).connect(gain);
    const pan = this.panner(gain, 0);
    this.track(source, [source, filter, gain, ...(pan ? [pan] : [])]); source.start();
    return {gain, pan};
  }
  update(mix: ReturnType<typeof worldAudioMix>) {
    this.master.gain.setTargetAtTime(.4, this.ctx.currentTime, .12);
    this.breeze.gain.setTargetAtTime(mix.breeze, this.ctx.currentTime, .7);
    this.fountain.gain.setTargetAtTime(mix.fountain, this.ctx.currentTime, .35);
    this.fountainPan?.pan.setTargetAtTime(mix.fountainPan, this.ctx.currentTime, .35);
  }
  silence() {
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
  }
  /** Short filtered sole/soil contact, not a pitched kick or game click. */
  private rustle(event: AudioEvent, duration: number, frequency: number) {
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain(), t = this.ctx.currentTime;
    source.buffer = this.noise; source.loop = true;
    filter.type = 'lowpass'; filter.frequency.value = frequency; filter.Q.value = .6;
    gain.gain.setValueAtTime(.00001, t); gain.gain.linearRampToValueAtTime(event.gain, t + .012);
    gain.gain.exponentialRampToValueAtTime(.00001, t + duration);
    source.connect(filter).connect(gain); const pan = this.panner(gain, event.pan);
    this.track(source, [source, filter, gain, ...(pan ? [pan] : [])]);
    source.start(t, .37); source.stop(t + duration + .02);
  }
  private tone(event: AudioEvent, frequency: number, end: number, duration: number, delay = 0) {
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain(), t = this.ctx.currentTime + delay;
    osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(end, t + duration * .8);
    gain.gain.setValueAtTime(.00001, t); gain.gain.linearRampToValueAtTime(event.gain, t + .008);
    gain.gain.exponentialRampToValueAtTime(.00001, t + duration);
    osc.connect(gain); const pan = this.panner(gain, event.pan);
    this.track(osc, [osc, gain, ...(pan ? [pan] : [])]); osc.start(t); osc.stop(t + duration + .02);
  }
  play(event: AudioEvent) {
    switch (event.kind) {
      case 'step': this.rustle(event, event.soft ? .12 : .085, event.soft ? 720 : 1150); break;
      case 'water': this.rustle(event, .55, 1900); break;
      case 'bird':
        this.tone(event, 2480, 3350, .12);
        this.tone({...event, gain: event.gain * .6}, 2900, 2350, .11, .19); break;
      case 'insect':
        for (let i = 0; i < 3; i++) this.tone(event, 4250, 4170, .055, i * .11); break;
      // Inharmonic decays evoke one ceramic/metal object, never a melody.
      case 'crockery':
      case 'chime': {
        const bell = event.kind === 'chime', f = bell ? 1140 : 1760;
        this.tone({...event, gain: event.gain * .65}, f, f * .998, bell ? 1.1 : .16);
        this.tone({...event, gain: event.gain * .25}, f * 2.71, f * 2.708, bell ? .5 : .07);
        break;
      }
    }
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.silence();
    for (const {source, nodes} of this.voices) {
      source.onended = null;
      try {source.stop();} catch {/* Already-ended finite voices are harmless. */}
      for (const node of nodes) node.disconnect();
    }
    this.voices.clear(); this.master.disconnect();
  }
}

export interface WorldAudioEnvironment {
  createContext: () => AudioContext;
  visibility: {readonly hidden: boolean; addEventListener: (type: 'visibilitychange', fn: () => void) => void; removeEventListener: (type: 'visibilitychange', fn: () => void) => void};
  setInterval: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearInterval: (id: ReturnType<typeof setInterval>) => void;
  random?: () => number;
}
interface AudioSession {
  ctx: AudioContext; graph?: AudioGraph; cursor?: AudioCursor;
  timer?: ReturnType<typeof setInterval>; pending: Promise<void>;
}
/** Injectable lifecycle controller: creating/mounting it never creates audio. */
export function createWorldAmbience(stateRef: WorldAudioRef, env: WorldAudioEnvironment, changed: (on: boolean) => void = () => {}) {
  let optedIn = false, disposed = false, session: AudioSession | undefined;
  const random = env.random ?? Math.random;
  const valid = (s: AudioSession) => !disposed && optedIn && session === s;
  const pause = (s: AudioSession) => {
    if (s.timer !== undefined) env.clearInterval(s.timer);
    s.timer = undefined;
    // Drop finite voices as well: a half-finished step/bell must not replay on return.
    s.graph?.dispose(); s.graph = undefined; s.cursor = undefined;
  };
  const release = (s: AudioSession) => {
    pause(s);
    // Some hosts reject close() while resume() is pending; suspension is the fallback.
    try {void s.ctx.close().catch(() => {try {void s.ctx.suspend().catch(() => {});} catch {}});} catch {try {void s.ctx.suspend().catch(() => {});} catch {}}
  };
  const tick = (s: AudioSession) => {
    if (!valid(s) || env.visibility.hidden || s.ctx.state !== 'running') return;
    const state = stateRef.current;
    if (!s.cursor) s.cursor = createAudioCursor(state, s.ctx.currentTime);
    const frame = decideWorldAudio(state, s.ctx.currentTime, s.cursor, random());
    s.cursor = frame.cursor; s.graph?.update(frame.mix);
    for (const event of frame.events) s.graph?.play(event);
  };
  const fail = (s: AudioSession) => {
    if (!valid(s)) return;
    optedIn = false; session = undefined; release(s); changed(false);
  };
  const reconcile = async (s: AudioSession) => {
    if (!valid(s)) {
      // A host may reject close during resume. Ensure the eventual stale resume
      // cannot leave an orphaned running context after the close fallback.
      if (s.ctx.state !== 'closed') await s.ctx.suspend();
      return;
    }
    if (env.visibility.hidden) {
      pause(s); if (s.ctx.state !== 'closed') await s.ctx.suspend(); return;
    }
    if (s.ctx.state !== 'running') await s.ctx.resume();
    if (!valid(s)) {if (s.ctx.state !== 'closed') await s.ctx.suspend(); return;}
    if (env.visibility.hidden) {pause(s); await s.ctx.suspend(); return;}
    if (!s.graph) s.graph = new AudioGraph(s.ctx, random);
    if (s.timer === undefined) {
      s.cursor = createAudioCursor(stateRef.current, s.ctx.currentTime);
      tick(s); s.timer = env.setInterval(() => {try {tick(s);} catch {fail(s);}}, 80);
    }
  };
  const visibility = () => {
    const s = session; if (!s || !optedIn || disposed) return;
    if (env.visibility.hidden) pause(s); // Mute synchronously, even during pending resume.
    s.pending = s.pending.then(() => reconcile(s)).catch(() => fail(s));
  };
  env.visibility.addEventListener('visibilitychange', visibility);
  return {
    get on() {return optedIn;},
    toggle(): Promise<void> {
      if (disposed) return Promise.resolve();
      if (optedIn) {
        optedIn = false; const old = session; session = undefined;
        if (old) release(old); changed(false); return Promise.resolve();
      }
      optedIn = true; changed(true);
      let s: AudioSession;
      try {
        s = {ctx: env.createContext(), pending: Promise.resolve()}; session = s;
        // Start resume inside the click stack (required by Safari's user activation).
        const start = env.visibility.hidden ? s.ctx.suspend() : s.ctx.resume();
        s.pending = Promise.resolve(start).then(() => reconcile(s)).catch(() => fail(s));
        return s.pending;
      } catch {
        if (session) release(session); session = undefined; optedIn = false; changed(false);
        return Promise.resolve();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true; optedIn = false;
      env.visibility.removeEventListener('visibilitychange', visibility);
      if (session) release(session); session = undefined;
    },
  };
}

/** Call unconditionally beside the existing state ref; wire toggle to an explicit button. */
export function useWorldAmbience(stateRef: WorldAudioRef): {on: boolean; toggle: () => Promise<void>} {
  const [on, setOn] = useState(false);
  const controller = useRef<ReturnType<typeof createWorldAmbience> | null>(null);
  useEffect(() => {
    const sound = createWorldAmbience(stateRef, {
      createContext: () => {
        const Constructor = window.AudioContext ?? (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
        if (!Constructor) throw new Error('Web Audio unavailable');
        return new Constructor();
      },
      visibility: document,
      setInterval: (fn, ms) => setInterval(fn, ms), clearInterval: id => clearInterval(id),
    }, setOn);
    controller.current = sound;
    return () => {controller.current = null; sound.dispose();};
  }, [stateRef]);
  const toggle = useCallback(() => controller.current?.toggle() ?? Promise.resolve(), []);
  return {on, toggle};
}
