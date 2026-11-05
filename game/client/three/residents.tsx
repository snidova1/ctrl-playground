'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {BODY_GENDER, HAIR_STYLES, randomAppearance, type Appearance} from '@/game/core/appearance';
import {PIER, POND, SEA_Z, heightAt} from '@/game/core/map';
import {mulberry32} from '@/game/core/rng';
import type {Runtime} from '../runtime';
import {Avatar, type AvatarMotion, type Tool} from './avatar';
import {canvasTexture} from './materials';

/**
 * AI residents: townsfolk with their own looks and routines who live like players do. They fish,
 * catch bugs, take photos and rest on benches, come over to say hi, and can be invited to hang
 * out: then they follow you, sit next to you, copy your emotes and pose in your selfies.
 */
export const PLAZA_BENCHES: [number, number, number][] = [[-9.5, 3, 1.57], [9.5, 3, -1.57], [-9.5, -3, 1.57], [9.5, -3, -1.57]];

type Activity = {kind: 'wander' | 'sit' | 'fish' | 'net' | 'photo'; x: number; z: number; angle?: number; anim: string; tool: Tool; secs: number; lift?: number};
const SPOTS: Activity[] = [
  ...PLAZA_BENCHES.map(([x, z, r]) => ({kind: 'sit' as const, x: x + Math.sin(r) * 0.05, z: z + Math.cos(r) * 0.05, angle: r, anim: 'sit', tool: 'none' as Tool, secs: 16, lift: 0.2})),
  {kind: 'fish', x: PIER.x - 0.6, z: PIER.z1 - 1.5, angle: 0, anim: 'fish', tool: 'rod', secs: 22},
  {kind: 'fish', x: PIER.x + 0.7, z: PIER.z1 - 3.5, angle: 0.3, anim: 'fish', tool: 'rod', secs: 22},
  {kind: 'fish', x: 2, z: SEA_Z - 2.2, angle: 0, anim: 'fish', tool: 'rod', secs: 20},
  {kind: 'fish', x: POND.x - 2, z: POND.z + POND.rz + 0.9, angle: Math.PI, anim: 'fish', tool: 'rod', secs: 20},
  {kind: 'net', x: -36, z: 2, anim: 'sneak', tool: 'net', secs: 12},
  {kind: 'net', x: -30, z: 12, anim: 'sneak', tool: 'net', secs: 12},
  {kind: 'photo', x: 6, z: -24, angle: Math.PI, anim: 'camera', tool: 'camera', secs: 10},
  {kind: 'photo', x: 18, z: 4, angle: 1.4, anim: 'camera', tool: 'camera', secs: 10},
  {kind: 'wander', x: 3, z: 6, anim: 'idle', tool: 'none', secs: 6},
  {kind: 'wander', x: -4, z: -6, anim: 'idle', tool: 'none', secs: 6},
  {kind: 'wander', x: 12, z: -4, anim: 'idle', tool: 'none', secs: 6},
];

const GIRLS = ['Mika', 'Yuki', 'Hana', 'Rin', 'Aiko', 'Nora'];
const BOYS = ['Sora', 'Ren', 'Kai', 'Haru', 'Leo', 'Jun'];
const HELLO = ['Hi {p}! Nice day, huh?', 'Oh hey {p}!', '{p}! Want to hang out?', 'Yo {p}, the fish are biting today!', 'Hiii {p} ✨'];
const CHATTER = {
  fish: ['Come on, big one…', 'Got a nibble!', 'Caught a sea bream earlier!'],
  net: ['Shh… a butterfly.', 'So many bugs today!', 'Almost got it!'],
  photo: ['Smile, birdie!', 'That light is perfect.', 'Got a kingfisher shot!'],
  sit: ['Ahh, comfy.', 'I could sit here all day.', 'Love this fountain.'],
  wander: ['La la la~', 'What should I cook tonight?', 'The flowers smell great.'],
  follow: ['Lead the way!', 'Where are we going?', 'This is fun!', 'Selfie time? 📸', 'Race you!'],
};
const pick = <T,>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)];

interface Brain {
  act: Activity; phase: 'walk' | 'do'; until: number; stuck: number; hangUntil: number; greetedAt: number;
  say: {text: string; until: number} | null; lastPlayerEmote: number; copyAt: number; copyEmote: string | null;
}

function Bubble({text}: {text: string}) {
  const texture = useMemo(() => canvasTexture(512, 128, ctx => {
    ctx.font = '800 34px system-ui, sans-serif';
    const w = Math.min(500, ctx.measureText(text).width + 48);
    ctx.fillStyle = 'rgba(255,252,244,0.96)';
    ctx.beginPath(); ctx.roundRect((512 - w) / 2, 10, w, 76, 30); ctx.fill();
    ctx.beginPath(); ctx.moveTo(240, 84); ctx.lineTo(256, 112); ctx.lineTo(272, 84); ctx.fill();
    ctx.fillStyle = '#5a4636'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 49, 470);
  }), [text]);
  return <sprite position={[0, 2.2, 0]} scale={[1.9, 0.48, 1]} renderOrder={6}><spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} /></sprite>;
}

function Resident({rt, look, name, seed, index, playerName}: {rt: Runtime; look: Appearance; name: string; seed: number; index: number; playerName: string}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<AvatarMotion>({anim: 'idle', speed: 0, tool: 'none', actionAt: 0});
  const rand = useMemo(() => mulberry32(seed), [seed]);
  const start = SPOTS[(index * 5) % SPOTS.length];
  const pos = useRef(new THREE.Vector3(start.x + 1, heightAt(start.x + 1, start.z), start.z + 1));
  const angle = useRef(0);
  const brain = useRef<Brain>({act: start, phase: 'walk', until: 0, stuck: 0, hangUntil: 0, greetedAt: -1e9, say: null, lastPlayerEmote: 0, copyAt: 0, copyEmote: null});
  const [bubble, setBubble] = useState<string | null>(null);
  const id = `resident-${index}`;

  const say = (text: string, secs = 3.2) => {brain.current.say = {text: text.replace('{p}', playerName || 'friend'), until: performance.now() + secs * 1000};};
  const emote = (e: string) => {motion.current.emote = e; motion.current.emoteAt = performance.now();};

  useEffect(() => {
    rt.targets.set(id, {id, label: `Hang out with ${name}`, icon: '🤝', x: pos.current.x, z: pos.current.z, radius: 1.4, priority: 0.1, run: () => {
      const b = brain.current;
      if (performance.now() < b.hangUntil) {b.hangUntil = 0; say('See you around! 👋'); emote('wave'); rt.toast(`${name} went back to their day.`, 'info', '👋'); return;}
      b.hangUntil = performance.now() + 120000; b.phase = 'walk';
      say(pick(rand, ['Yay, let\'s go!', 'Sure! Lead the way.', 'Hang out? Always!'])); emote('heart');
      rt.toast(`${name} is hanging out with you`, 'good', '🤝');
    }});
    return () => {rt.targets.delete(id);};
  }, [rt, id, name, rand]);

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05), now = performance.now();
    const b = brain.current, m = motion.current, p = rt.player, P = p.pos;
    const target = rt.targets.get(id);
    if (target) {target.x = pos.current.x; target.z = pos.current.z; target.label = now < b.hangUntil ? `Say bye to ${name}` : `Hang out with ${name}`;}
    const distToPlayer = Math.hypot(P.x - pos.current.x, P.z - pos.current.z);
    const hanging = now < b.hangUntil;
    const ui = rt.ui.get();

    // Copy the player's emotes while hanging out (or when close by).
    const pe = p.motion.current;
    if (pe.emote && (pe.emoteAt ?? 0) > b.lastPlayerEmote) {
      b.lastPlayerEmote = pe.emoteAt ?? 0;
      if (hanging || distToPlayer < 4) {b.copyAt = now + 500 + rand() * 400; b.copyEmote = pe.emote;}
    }
    if (b.copyEmote && now > b.copyAt) {emote(b.copyEmote); if (b.copyEmote === 'wave' || b.copyEmote === 'heart') m.anim = 'wave'; b.copyEmote = null;}

    // Say hi to players who come close (once a minute).
    if (!hanging && distToPlayer < 4.5 && now - b.greetedAt > 60000 && b.act.kind !== 'fish') {
      b.greetedAt = now; say(pick(rand, HELLO)); emote('wave'); m.anim = 'wave'; m.actionAt = now;
      angle.current = Math.atan2(P.x - pos.current.x, P.z - pos.current.z);
    }

    let goal: {x: number; z: number} | null = null, speed = 2.3, run = false;
    if (hanging) {
      // Stay at the player's side; join in with whatever they are doing.
      const side = index % 2 ? 1 : -1;
      const pa = p.angle;
      const seated = !!p.seat, fishing = !!ui.fishing, selfie = ui.photo && ui.photoView === 'selfie';
      const offX = Math.cos(pa) * side * (seated ? 0.85 : 1.1) - Math.sin(pa) * (seated || selfie ? 0 : 0.7);
      const offZ = -Math.sin(pa) * side * (seated ? 0.85 : 1.1) - Math.cos(pa) * (seated || selfie ? 0 : 0.7);
      goal = {x: P.x + offX, z: P.z + offZ};
      let d = Math.hypot(goal.x - pos.current.x, goal.z - pos.current.z);
      // Lost on the far side of a river or wall: catch up out of sight.
      if (d > 16) {pos.current.set(P.x - Math.sin(pa) * 6, P.y, P.z - Math.cos(pa) * 6); d = Math.hypot(goal.x - pos.current.x, goal.z - pos.current.z);}
      run = d > 4; speed = run ? 5.2 : 2.9;
      if (d < 0.35) {
        goal = null;
        angle.current = seated || fishing || selfie ? pa : Math.atan2(P.x - pos.current.x, P.z - pos.current.z) * 0.3 + pa * 0.7;
        m.anim = seated ? 'sit' : fishing ? 'fish' : selfie ? (Math.floor(now / 2500) % 2 ? 'cheer' : 'wave') : m.anim === 'wave' && now - m.actionAt < 1500 ? 'wave' : 'idle';
        m.tool = fishing ? 'rod' : 'none';
        if (seated && pos.current.y < heightAt(pos.current.x, pos.current.z) + 0.1) pos.current.y += 0.2;
        if (!b.say && rand() < dt * 0.05) say(pick(rand, CHATTER.follow));
      }
    } else if (b.phase === 'walk') {
      goal = {x: b.act.x, z: b.act.z};
    } else if (now > b.until) {
      // Next activity: anywhere in town, weighted toward hobbies.
      b.act = SPOTS[Math.floor(rand() * SPOTS.length)]; b.phase = 'walk'; m.anim = 'idle'; m.tool = 'none';
    } else {
      m.anim = b.act.anim; m.tool = b.act.tool;
      if (b.act.kind === 'net') {
        // Creep around, swing the net now and then.
        if (Math.floor(now / 2600) !== Math.floor((now - dt * 1000) / 2600)) {m.anim = 'net'; m.actionAt = now; if (rand() < 0.4) emote(rand() < 0.5 ? 'wow' : '!');}
      }
      if (b.act.kind === 'fish' && rand() < dt * 0.03) {emote('!'); setTimeout(() => {emote(rand() < 0.6 ? 'laugh' : 'star'); m.anim = 'cheer'; m.actionAt = performance.now();}, 1200);}
      if (!b.say && rand() < dt * 0.03) say(pick(rand, CHATTER[b.act.kind]));
    }

    if (goal) {
      const dx = goal.x - pos.current.x, dz = goal.z - pos.current.z, d = Math.hypot(dx, dz);
      if (d < 0.25 && !hanging) {
        b.phase = 'do'; b.until = now + b.act.secs * 1000 * (0.7 + rand() * 0.6);
        if (b.act.angle !== undefined) angle.current = b.act.angle;
        m.anim = b.act.anim; m.tool = b.act.tool; m.actionAt = now;
      } else {
        const step = Math.min(d, speed * dt);
        let nx = pos.current.x + (dx / d) * step, nz = pos.current.z + (dz / d) * step;
        if (!rt.walkable(nx, nz)) {
          // Slide around obstacles; give up on a goal we cannot reach.
          const sx = pos.current.x + (-dz / d) * step, sz = pos.current.z + (dx / d) * step;
          if (rt.walkable(sx, sz)) {nx = sx; nz = sz;} else {nx = pos.current.x; nz = pos.current.z;}
          b.stuck += dt;
          if (b.stuck > 2.5 && !hanging) {b.stuck = 0; b.act = SPOTS[Math.floor(rand() * SPOTS.length)];}
          if (b.stuck > 2.5 && hanging) {b.stuck = 0; nx = goal.x; nz = goal.z;}
        } else b.stuck = 0;
        pos.current.x = nx; pos.current.z = nz;
        angle.current = Math.atan2(dx, dz);
        m.anim = run ? 'run' : 'walk'; m.speed = speed; m.tool = 'none';
      }
    }
    const ground = heightAt(pos.current.x, pos.current.z) + ((b.phase === 'do' && b.act.lift && !hanging) || (hanging && p.seat && !goal) ? 0.2 : 0);
    pos.current.y += (ground - pos.current.y) * Math.min(1, dt * 12);
    g.position.copy(pos.current);
    let diff = angle.current - g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.rotation.y += diff * Math.min(1, dt * 8);
    const text = b.say && now < b.say.until ? b.say.text : null;
    if (!text) b.say = null;
    if (text !== bubble) setBubble(text);
  });

  return <group ref={group}>
    <Avatar look={look} motion={motion} name={name} nameColor="#d9f1ff" />
    {bubble && <Bubble text={bubble} />}
  </group>;
}

/** A few AI residents for town; fewer on low-end devices. */
export function Residents({rt, count, playerName = ''}: {rt: Runtime; count: number; playerName?: string}) {
  const list = useMemo(() => {
    const r = mulberry32(2026);
    const used = new Set<string>();
    return Array.from({length: count}, (_, i) => {
      const look = randomAppearance(`resident-${i}-${Math.floor(r() * 1e6)}`, true);
      // Mix of girls and boys, each with a hairstyle that differs from their body's own.
      look.body = [4, 2, 7, 3, 8, 5][i % 6];
      if (look.body !== 0) {
        const options = HAIR_STYLES.map((h, k) => k).filter(k => k === 0 || HAIR_STYLES[k].donor !== look.body);
        look.hair = options[Math.floor(r() * options.length)];
      }
      const names = BODY_GENDER[look.body] === 'girl' ? GIRLS : BOYS;
      let name = names[Math.floor(r() * names.length)];
      while (used.has(name)) name = names[Math.floor(r() * names.length)];
      used.add(name);
      return {look, name, seed: 1000 + i * 77};
    });
  }, [count]);
  return <>{list.map((x, i) => <Resident key={i} rt={rt} look={x.look} name={x.name} seed={x.seed} index={i} playerName={playerName} />)}</>;
}
