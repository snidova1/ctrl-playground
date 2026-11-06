import type {Runtime} from './runtime';

/**
 * Natural sitting and napping. The seated clips slide the hips about HIP_BACK metres behind the
 * feet, so the feet (the avatar root) stand just in front of the cushion while the hips land on it.
 * Sequence: walk to the seat front → turn your back to it → sit down → seated (→ lie back) and,
 * when you move again, stand up and step out.
 */
export const HIP_BACK = 0.2;
const WALK = 1.9, TURN = 0.28, SIT_DOWN = 1.15, STAND_UP = 0.85, LIE_BACK = 0.9;

export interface Seat {
  phase: 'approach' | 'turn' | 'down' | 'seated' | 'lie' | 'up' | 'unlie';
  t: number;
  /** Where the feet end up while seated, and which way the body faces. */
  x: number; z: number; angle: number;
  /** Lift of the avatar root while seated (seat height above the floor minus the clip's hip height). */
  lift: number;
  standX: number; standZ: number;
  /** Lying down: final feet position and mattress lift. */
  lie?: {x: number; z: number; lift: number} | null;
  /** 0 = upright, 1 = flat on the back (drives the avatar's pitch). */
  recline: number;
  currentLift: number;
  from?: {x: number; z: number; angle: number};
  mood?: 'relaxed' | 'sleepy';
  /** Free cushion beside you (m) — a friend only sits down next to you if there's room. */
  room?: number;
}

export function requestSeat(rt: Runtime, o: {x: number; z: number; angle: number; lift: number; standX: number; standZ: number; lie?: Seat['lie']; mood?: Seat['mood']; room?: number}) {
  const p = rt.player;
  p.locked = true;
  p.seat = {phase: 'approach', t: 0, x: o.x, z: o.z, angle: o.angle, lift: o.lift, standX: o.standX, standZ: o.standZ, lie: o.lie ?? null, recline: 0, currentLift: 0, mood: o.mood ?? 'relaxed', room: o.room ?? 0};
  rt.camera.yaw = o.angle + 0.5;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const angleLerp = (a: number, b: number, t: number) => {let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t;};

/** Advances the seat sequence. Returns true while the seat owns the player's movement. */
export function updateSeat(rt: Runtime, dt: number, wantsToMove: boolean): boolean {
  const p = rt.player, s = p.seat;
  if (!s) return false;
  const m = p.motion.current;
  s.t += dt;
  const go = (phase: Seat['phase']) => {s.phase = phase; s.t = 0; s.from = {x: p.pos.x, z: p.pos.z, angle: p.angle};};
  switch (s.phase) {
    case 'approach': {
      const dx = s.x - p.pos.x, dz = s.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.05) {go('turn'); break;}
      const step = Math.min(d, WALK * dt);
      p.pos.x += (dx / d) * step; p.pos.z += (dz / d) * step;
      p.angle = angleLerp(p.angle, Math.atan2(dx, dz), Math.min(1, dt * 12));
      m.anim = 'walk'; m.speed = WALK; p.speed = WALK;
      if (s.t > 4) {p.pos.x = s.x; p.pos.z = s.z; go('turn');}
      break;
    }
    case 'turn': {
      p.speed = 0; m.anim = 'idle';
      p.angle = angleLerp(s.from!.angle, s.angle, ease(Math.min(1, s.t / TURN)));
      if (s.t >= TURN) {p.angle = s.angle; go('down'); m.anim = 'sitdown'; m.actionAt = performance.now(); m.mood = s.mood ?? 'relaxed';}
      break;
    }
    case 'down': {
      m.anim = 'sitdown';
      s.currentLift = s.lift * ease(Math.min(1, s.t / SIT_DOWN));
      if (s.t >= SIT_DOWN) {go(s.lie ? 'lie' : 'seated'); m.anim = 'sit';}
      break;
    }
    case 'seated':
      m.anim = 'sit'; s.currentLift = s.lift;
      if (wantsToMove) {go('up'); m.anim = 'standup'; m.actionAt = performance.now();}
      break;
    case 'lie': {
      // Lean back onto the mattress while sliding along the bed.
      const k = ease(Math.min(1, s.t / LIE_BACK)), l = s.lie!;
      s.recline = k;
      p.pos.x = s.x + (l.x - s.x) * k; p.pos.z = s.z + (l.z - s.z) * k;
      s.currentLift = s.lift + (l.lift - s.lift) * k;
      m.anim = k > 0.35 ? 'lie' : 'sit';
      if (k >= 1 && m.mood !== 'sleepy') {m.mood = 'sleepy'; m.emote = 'zzz'; m.emoteAt = performance.now();}
      if (wantsToMove && k >= 1) go('unlie');
      break;
    }
    case 'unlie': {
      const k = 1 - ease(Math.min(1, s.t / LIE_BACK)), l = s.lie!;
      s.recline = k;
      p.pos.x = s.x + (l.x - s.x) * k; p.pos.z = s.z + (l.z - s.z) * k;
      s.currentLift = s.lift + (l.lift - s.lift) * k;
      m.anim = k > 0.35 ? 'lie' : 'sit'; m.mood = 'relaxed';
      if (k <= 0) {go('up'); m.anim = 'standup'; m.actionAt = performance.now();}
      break;
    }
    case 'up': {
      m.anim = 'standup';
      const k = ease(Math.min(1, s.t / STAND_UP));
      s.currentLift = s.lift * (1 - k);
      // Step forward off the seat as the legs straighten.
      p.pos.x = s.from!.x + (s.standX - s.from!.x) * k * 0.6; p.pos.z = s.from!.z + (s.standZ - s.from!.z) * k * 0.6;
      if (s.t >= STAND_UP) {p.seat = null; p.locked = false; m.anim = 'idle'; m.mood = null; return false;}
      break;
    }
  }
  return true;
}
