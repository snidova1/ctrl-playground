import {describe, expect, it, vi} from 'vitest';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {audioProximity, createAudioCursor, createWorldAmbience, decideWorldAudio, useWorldAmbience, worldAudioMix, type WorldAudioEnvironment, type WorldAudioState} from '../../features/worldgacha/public-world-audio';

const state = (x = 0, z = 0, phase = 'afternoon'): WorldAudioState => ({time: 0, phase, player: {x, z, moving: false, running: false, action: 'idle'}});
const flush = async () => {for (let i = 0; i < 12; i++) await Promise.resolve();};
function deferred() {let resolve!: () => void, reject!: (reason: Error) => void; const promise = new Promise<void>((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};}
class Param {
  value = 0;
  setValueAtTime = vi.fn((value: number) => {this.value = value;});
  setTargetAtTime = vi.fn((value: number) => {this.value = value;});
  linearRampToValueAtTime = vi.fn((value: number) => {this.value = value;});
  exponentialRampToValueAtTime = vi.fn((value: number) => {this.value = value;});
  cancelScheduledValues = vi.fn();
}
class Node {
  gain = new Param(); frequency = new Param(); Q = new Param(); pan = new Param();
  loop = false; type = ''; buffer: unknown; onended: (() => void) | null = null;
  connect = vi.fn((node: Node) => node); disconnect = vi.fn();
  start = vi.fn(); stop = vi.fn();
}
class Context {
  state = 'suspended'; currentTime = 0; sampleRate = 8000;
  destination = new Node(); nodes: Node[] = []; sources: Node[] = []; oscillators: Node[] = [];
  resumeGate?: ReturnType<typeof deferred>;
  resume = vi.fn(async () => {if (this.resumeGate) await this.resumeGate.promise; if (this.state !== 'closed') this.state = 'running';});
  suspend = vi.fn(async () => {if (this.state !== 'closed') this.state = 'suspended';});
  close = vi.fn(async () => {this.state = 'closed';});
  createBuffer = vi.fn((_channels: number, length: number) => ({getChannelData: () => new Float32Array(length)}));
  make() {const node = new Node(); this.nodes.push(node); return node;}
  createGain = () => this.make(); createBiquadFilter = () => this.make(); createStereoPanner = () => this.make();
  createBufferSource = () => {const node = this.make(); this.sources.push(node); return node;};
  createOscillator = () => {const node = this.make(); this.oscillators.push(node); return node;};
}
function harness(initial = state()) {
  const ref = {current: initial}, contexts: Context[] = [], timers = new Map<number, () => void>(), listeners = new Set<() => void>();
  let counter = 0;
  const visibility = {hidden: false, addEventListener: vi.fn((_type: string, fn: () => void) => {listeners.add(fn);}), removeEventListener: vi.fn((_type: string, fn: () => void) => {listeners.delete(fn);})};
  const createContext = vi.fn(() => {const ctx = new Context(); contexts.push(ctx); return ctx as unknown as AudioContext;});
  const changed = vi.fn();
  const env: WorldAudioEnvironment = {createContext, visibility, random: () => .5,
    setInterval: fn => {const id = ++counter; timers.set(id, fn); return id as unknown as ReturnType<typeof setInterval>;},
    clearInterval: id => {timers.delete(id as unknown as number);}};
  const sound = createWorldAmbience(ref, env, changed);
  return {ref, contexts, timers, listeners, createContext, visibility, sound, changed,
    hide(hidden: boolean) {visibility.hidden = hidden; for (const fn of listeners) fn();},
    tick(dt = .08, dx = 0) {ref.current.time += dt; ref.current.player.x += dx; for (const ctx of contexts) if (ctx.state === 'running') ctx.currentTime += dt; for (const fn of timers.values()) fn();},
  };
}

describe('Public World spatial audio decisions', () => {
  it('anchors fountain at the actual origin and smoothly fades it out before remote districts', () => {
    expect(audioProximity(0, 0, 0, 0, 22)).toBe(1);
    const near = worldAudioMix(state(0, 0)), midway = worldAudioMix(state(11, 0)), far = worldAudioMix(state(22, 0));
    expect(near.fountain).toBe(.075); expect(midway.fountain).toBeCloseTo(.0375); expect(far.fountain).toBe(0);
    expect(worldAudioMix(state(-39, 0)).fountain).toBe(0); expect(worldAudioMix(state(39, 0)).fountain).toBe(0);
    expect(worldAudioMix(state(5, 0)).fountainPan).toBeLessThan(0);
    expect(worldAudioMix(state(-5, 0)).fountainPan).toBeGreaterThan(0);
  });
  it('uses garden birds only by day, gentle insects at sunset/dusk, with spatial boundaries', () => {
    for (const phase of ['afternoon', 'golden']) {const mix = worldAudioMix(state(-39, 0, phase)); expect(mix.birds).toBeGreaterThan(0); expect(mix.insects).toBe(0);}
    for (const phase of ['sunset', 'dusk']) {const mix = worldAudioMix(state(-39, 0, phase)); expect(mix.birds).toBe(0); expect(mix.insects).toBeGreaterThan(0); expect(mix.insects).toBeLessThan(.01);}
    expect(worldAudioMix(state()).birds).toBe(0); expect(worldAudioMix(state(39, 0, 'dusk')).insects).toBe(0);
  });
  it('anchors sparse market details to stalls, never invents a crowd/music layer', () => {
    const close = worldAudioMix(state(35, 6)), distant = worldAudioMix(state(39, 25));
    expect(close.market).toBeGreaterThan(worldAudioMix(state(39, 0)).market); expect(distant.market).toBe(0);
    expect(close.marketPan).toBe(0); expect(worldAudioMix(state(34, 6)).marketPan).toBeGreaterThan(0);
    const s = state(35, 6); let cursor = createAudioCursor(s, 0); const events: string[] = [];
    for (let clock = 0; clock < 120; clock++) {const frame = decideWorldAudio(s, clock, cursor, .5); cursor = frame.cursor; events.push(...frame.events.map(event => event.kind));}
    expect(events.length).toBeGreaterThan(2); expect(events.length).toBeLessThanOrEqual(6); expect(new Set(events)).toEqual(new Set(['crockery']));
    expect(decideWorldAudio(s, 6, createAudioCursor(s, 0), .95).events[0].kind).toBe('chime');
  });
  it('does not emit immediate birds or accumulate a catch-up burst after a long gap', () => {
    const s = state(-39); const cursor = createAudioCursor(s, 0);
    expect(decideWorldAudio(s, 0, cursor).events).toEqual([]);
    const frame = decideWorldAudio(s, 5000, cursor);
    expect(frame.events.map(e => e.kind)).toEqual(['bird']); expect(frame.cursor.nextDetail).toBeGreaterThan(5000);
  });
  it('walk/run cadence needs actual movement and advancing world time, not only moving flags', () => {
    const s = state(-39); s.player.moving = true; s.player.action = 'walk';
    let cursor = createAudioCursor(s, 0);
    expect(decideWorldAudio(s, .1, cursor).events).toEqual([]);
    s.time = .1; s.player.x += .1;
    let frame = decideWorldAudio(s, .1, cursor); cursor = frame.cursor;
    expect(frame.events).toEqual([{kind: 'step', gain: .025, pan: -.13, soft: true}]);
    s.time += .3; s.player.x += .2; frame = decideWorldAudio(s, .4, cursor); cursor = frame.cursor;
    expect(frame.events).toEqual([]);
    s.time += .3; s.player.x += .2; frame = decideWorldAudio(s, .7, cursor);
    expect(frame.events[0].pan).toBe(.13);
    s.player.running = true;
    const run = decideWorldAudio(s, 2, createAudioCursor({...s, time: s.time - .1, player: {...s.player, x: s.player.x - .1}}, 1));
    expect(run.cursor.nextStep).toBeCloseTo(2.31); expect(run.events[0].gain).toBe(.034);
  });
  it('stays quiet at rest/sitting/coffee, against a wall, on frozen frames and teleports', () => {
    for (const action of ['idle', 'sit', 'coffee', 'garden', 'read']) {
      const s = state(); const cursor = createAudioCursor(s, 0); s.player.moving = true; s.player.action = action; s.player.x += .2; s.time = .2;
      expect(decideWorldAudio(s, .2, cursor).events).toEqual([]);
    }
    const s = state(); s.player.action = 'walk'; s.player.moving = true; const cursor = createAudioCursor(s, 0);
    s.time = .2; expect(decideWorldAudio(s, .2, cursor).events).toEqual([]);
    s.time = 0; s.player.x = .1; expect(decideWorldAudio(s, .2, cursor).events).toEqual([]);
    s.time = .2; s.player.x = 39; expect(decideWorldAudio(s, .2, cursor).events).toEqual([]);
  });
  it.each([['market-bell', 'chime'], ['market-tea', 'crockery'], ['garden-tend', 'water']])('reacts to %s once per new sequence', (id, kind) => {
    const s = state(39); let cursor = createAudioCursor(s, 0);
    s.publicPulse = {id, sequence: 1, x: 39, z: 0, until: 10};
    let frame = decideWorldAudio(s, 1, cursor); cursor = frame.cursor;
    expect(frame.events.map(e => e.kind)).toEqual([kind]);
    frame = decideWorldAudio(s, 2, cursor); cursor = frame.cursor; expect(frame.events).toEqual([]);
    s.publicPulse.sequence++; expect(decideWorldAudio(s, 3, cursor).events[0].kind).toBe(kind);
  });
  it('ignores old, expired, distant and unknown pulses, and bounds reaction spam', () => {
    const s = state(39); s.publicPulse = {id: 'market-bell', sequence: 1, x: 39, z: 0, until: 5};
    expect(decideWorldAudio(s, 1, createAudioCursor(s, 0)).events).toEqual([]);
    let cursor = createAudioCursor({...s, publicPulse: undefined}, 0);
    const first = decideWorldAudio(s, 1, cursor); cursor = first.cursor; s.publicPulse.sequence++;
    expect(decideWorldAudio(s, 1.1, cursor).events).toEqual([]);
    for (const patch of [{until: -1}, {x: -39}, {id: 'garden-rest'}]) {
      const next = {...s, publicPulse: {...s.publicPulse, ...patch}};
      expect(decideWorldAudio(next, 1, createAudioCursor({...s, publicPulse: undefined}, 0)).events).toEqual([]);
    }
  });
});

describe('opt-in WebAudio engine and lifecycle', () => {
  it('mounts and server-renders with no context, timer, or autoplay', () => {
    const h = harness(); expect(h.createContext).not.toHaveBeenCalled(); expect(h.timers.size).toBe(0); expect(h.sound.on).toBe(false);
    function Probe() {const audio = useWorldAmbience(h.ref); return createElement('span', null, String(audio.on));}
    expect(renderToString(createElement(Probe))).toBe('<span>false</span>'); h.sound.dispose(); expect(h.listeners.size).toBe(0);
  });
  it('builds two subtle filtered beds only after explicit toggle; movement uses finite noise, not pitched kicks', async () => {
    const h = harness(); await h.sound.toggle(); const ctx = h.contexts[0];
    expect(h.sound.on).toBe(true); expect(ctx.resume).toHaveBeenCalledOnce(); expect(h.timers.size).toBe(1);
    expect(ctx.sources).toHaveLength(2); expect(ctx.oscillators).toHaveLength(0);
    expect(ctx.nodes[0].gain.value).toBe(.4);
    h.ref.current.player.moving = true; h.ref.current.player.action = 'walk'; h.tick(.08, .15);
    expect(ctx.sources).toHaveLength(3); expect(ctx.sources[2].stop).toHaveBeenCalledOnce(); expect(ctx.oscillators).toHaveLength(0);
    h.ref.current.player.moving = false; for (let i = 0; i < 20; i++) h.tick(); expect(ctx.sources).toHaveLength(3);
    await h.sound.toggle(); expect(h.sound.on).toBe(false); expect(h.timers.size).toBe(0); expect(ctx.close).toHaveBeenCalledOnce();
    for (const source of ctx.sources) expect(source.stop).toHaveBeenCalled();
    for (const node of ctx.nodes) expect(node.disconnect).toHaveBeenCalled(); h.sound.dispose();
  });
  it('actually synthesizes finite garden daytime/evening and sparse market details', async () => {
    for (const [x, phase, voices] of [[-39, 'afternoon', 2], [-39, 'dusk', 3], [35, 'afternoon', 2]] as const) {
      const h = harness(state(x, 0, phase)); await h.sound.toggle(); h.tick(6.1);
      const ctx = h.contexts[0]; expect(ctx.oscillators).toHaveLength(voices);
      for (const osc of ctx.oscillators) {expect(osc.start).toHaveBeenCalledOnce(); expect(osc.stop).toHaveBeenCalledOnce();}
      for (const osc of ctx.oscillators) osc.onended?.();
      expect(ctx.oscillators.every(osc => osc.disconnect.mock.calls.length === 1)).toBe(true); h.sound.dispose();
    }
  });
  it('pauses hidden tabs immediately, resumes only opt-in, and drops hidden pulses/old finite voices', async () => {
    const h = harness(state(39)); await h.sound.toggle(); const ctx = h.contexts[0];
    h.ref.current.publicPulse = {id: 'market-bell', sequence: 1, x: 39, z: 0, until: 10}; h.tick();
    const oldVoices = [...ctx.oscillators]; expect(oldVoices).toHaveLength(2);
    h.hide(true); expect(h.timers.size).toBe(0); expect(ctx.nodes[0].gain.value).toBe(0);
    expect(oldVoices.every(voice => voice.stop.mock.calls.length === 2)).toBe(true);
    await flush(); expect(ctx.state).toBe('suspended'); expect(h.sound.on).toBe(true);
    h.ref.current.publicPulse.sequence++; h.hide(false); await flush(); expect(ctx.state).toBe('running'); expect(h.timers.size).toBe(1);
    h.tick(); expect(ctx.oscillators).toHaveLength(2);
    await h.sound.toggle(); const resumes = ctx.resume.mock.calls.length;
    h.hide(true); h.hide(false); await flush(); expect(ctx.resume.mock.calls.length).toBe(resumes); expect(h.timers.size).toBe(0); h.sound.dispose();
  });
  it('rapid on/off/on cannot let a stale pending resume replace or mute the new session', async () => {
    const h = harness(), gate = deferred();
    h.createContext.mockImplementationOnce(() => {const ctx = new Context(); ctx.resumeGate = gate; h.contexts.push(ctx); return ctx as unknown as AudioContext;});
    const stale = h.sound.toggle(); expect(h.sound.on).toBe(true);
    await h.sound.toggle(); await h.sound.toggle(); expect(h.contexts).toHaveLength(2); expect(h.timers.size).toBe(1);
    gate.resolve(); await stale; expect(h.sound.on).toBe(true); expect(h.timers.size).toBe(1);
    expect(h.contexts[0].sources).toHaveLength(0); expect(h.contexts[0].close).toHaveBeenCalledOnce(); h.sound.dispose();
  });
  it('does not revive a pending session after unmount, even when resume resolves later', async () => {
    const h = harness(), gate = deferred();
    h.createContext.mockImplementationOnce(() => {const ctx = new Context(); ctx.resumeGate = gate; h.contexts.push(ctx); return ctx as unknown as AudioContext;});
    const pending = h.sound.toggle(); h.sound.dispose(); h.sound.dispose(); gate.resolve(); await pending;
    expect(h.contexts[0].close).toHaveBeenCalledOnce(); expect(h.contexts[0].sources).toHaveLength(0); expect(h.listeners.size).toBe(0); expect(h.timers.size).toBe(0);
    await h.sound.toggle(); expect(h.createContext).toHaveBeenCalledOnce();
  });
  it('settles an orphaned pending resume back to suspended when close is rejected', async () => {
    const h = harness(), gate = deferred();
    h.createContext.mockImplementationOnce(() => {
      const ctx = new Context(); ctx.resumeGate = gate; ctx.close.mockRejectedValue(new Error('pending resume'));
      h.contexts.push(ctx); return ctx as unknown as AudioContext;
    });
    const pending = h.sound.toggle(); h.sound.dispose(); await flush();
    expect(h.contexts[0].state).toBe('suspended'); gate.resolve(); await pending;
    expect(h.contexts[0].state).toBe('suspended'); expect(h.contexts[0].sources).toHaveLength(0); expect(h.timers.size).toBe(0);
  });
  it('ignores an old resume rejection after a newer explicit opt-in', async () => {
    const h = harness(), gate = deferred();
    h.createContext.mockImplementationOnce(() => {const ctx = new Context(); ctx.resumeGate = gate; h.contexts.push(ctx); return ctx as unknown as AudioContext;});
    const old = h.sound.toggle(); await h.sound.toggle(); await h.sound.toggle();
    gate.reject(new Error('old permission denied')); await old;
    expect(h.sound.on).toBe(true); expect(h.contexts[1].state).toBe('running'); expect(h.timers.size).toBe(1); h.sound.dispose();
  });
  it('serializes visibility changes during pending resume and does not create a hidden graph', async () => {
    const h = harness(), gate = deferred();
    h.createContext.mockImplementationOnce(() => {const ctx = new Context(); ctx.resumeGate = gate; h.contexts.push(ctx); return ctx as unknown as AudioContext;});
    const pending = h.sound.toggle(); h.hide(true); gate.resolve(); await pending; await flush();
    const ctx = h.contexts[0]; expect(ctx.state).toBe('suspended'); expect(ctx.sources).toHaveLength(0); expect(h.timers.size).toBe(0);
    h.hide(false); h.hide(true); h.hide(false); await flush(); expect(ctx.state).toBe('running'); expect(ctx.sources).toHaveLength(2); expect(h.timers.size).toBe(1); h.sound.dispose();
  });
  it('explicit opt-in while hidden stays suspended until visible', async () => {
    const h = harness(); h.hide(true); await h.sound.toggle(); expect(h.sound.on).toBe(true);
    expect(h.contexts[0].resume).not.toHaveBeenCalled(); expect(h.contexts[0].sources).toHaveLength(0);
    h.hide(false); await flush(); expect(h.contexts[0].resume).toHaveBeenCalledOnce(); expect(h.timers.size).toBe(1); h.sound.dispose();
  });
  it('handles denied/unavailable audio and permits a clean retry without unhandled rejection', async () => {
    const h = harness(); h.createContext.mockImplementationOnce(() => {throw new Error('unsupported');});
    await h.sound.toggle(); expect(h.sound.on).toBe(false); expect(h.timers.size).toBe(0);
    h.createContext.mockImplementationOnce(() => {const ctx = new Context(); ctx.resume.mockRejectedValue(new Error('denied')); h.contexts.push(ctx); return ctx as unknown as AudioContext;});
    await h.sound.toggle(); expect(h.sound.on).toBe(false); expect(h.contexts[0].close).toHaveBeenCalledOnce();
    await h.sound.toggle(); expect(h.sound.on).toBe(true); expect(h.timers.size).toBe(1); h.sound.dispose();
  });
  it('falls back to suspension if context close rejects, removes listeners and timers', async () => {
    const h = harness(); await h.sound.toggle(); const ctx = h.contexts[0]; ctx.close.mockRejectedValue(new Error('close blocked'));
    h.sound.dispose(); await flush(); expect(ctx.suspend).toHaveBeenCalledOnce(); expect(ctx.state).toBe('suspended'); expect(h.listeners.size).toBe(0); expect(h.timers.size).toBe(0);
  });
  it('works without StereoPanner and closes on an audio graph creation failure', async () => {
    const h = harness(); h.createContext.mockImplementationOnce(() => {const ctx = new Context(); Object.assign(ctx, {createStereoPanner: undefined}); h.contexts.push(ctx); return ctx as unknown as AudioContext;});
    await h.sound.toggle(); expect(h.sound.on).toBe(true); h.sound.dispose();
    const broken = harness(); broken.createContext.mockImplementationOnce(() => {const ctx = new Context(); ctx.createBuffer.mockImplementation(() => {throw new Error('buffer allocation');}); broken.contexts.push(ctx); return ctx as unknown as AudioContext;});
    await broken.sound.toggle(); expect(broken.sound.on).toBe(false); expect(broken.contexts[0].close).toHaveBeenCalledOnce(); expect(broken.timers.size).toBe(0); broken.sound.dispose();
  });
});
