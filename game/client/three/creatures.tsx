'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {creaturesForWindow, type CreatureSpawn} from '@/game/core/spawns';
import {spawnWindow} from '@/game/core/clock';
import {BIRDS, BUGS} from '@/game/core/items';
import {POND, RIVER, SEA_Z, WATER_Y, heightAt, waterAt} from '@/game/core/map';
import {mulberry32} from '@/game/core/rng';
import type {Runtime} from '../runtime';
import {catchBug, creatureName, snapBird} from '../actions';
import {toon} from './materials';

const wing = new THREE.CircleGeometry(0.11, 10);
const ball = new THREE.SphereGeometry(1, 10, 8);
const cone = new THREE.ConeGeometry(1, 1, 6);

function Bug({spawn, rt, gone, onGone}: {spawn: CreatureSpawn; rt: Runtime; gone: boolean; onGone: (id: string) => void}) {
  const def = BUGS.find(b => b.id === spawn.species)!;
  const group = useRef<THREE.Group>(null), l = useRef<THREE.Mesh>(null), r = useRef<THREE.Mesh>(null);
  const home = useMemo(() => new THREE.Vector3(spawn.x, heightAt(spawn.x, spawn.z), spawn.z), [spawn]);
  const flee = useRef(0);
  const seed = useMemo(() => mulberry32(spawn.id.length * 97 + spawn.x * 13)() * 10, [spawn]);
  const glow = def.id === 'firefly';
  useFrame(({clock}) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime + seed;
    const p = rt.player;
    const dist = Math.hypot(p.pos.x - home.x, p.pos.z - home.z);
    // Running nearby startles bugs, like the real hobby: sneak up slowly.
    if (dist < 3.2 && p.speed > 4) flee.current = Math.min(1, flee.current + 0.05);
    else flee.current = Math.max(0, flee.current - 0.004);
    const away = flee.current * 6;
    if (def.flying) {
      g.position.set(home.x + Math.sin(t * 0.7) * 0.9 + (home.x - p.pos.x) / Math.max(dist, 0.1) * away, home.y + 0.8 + Math.sin(t * 2.1) * 0.25 + away * 0.4, home.z + Math.cos(t * 0.6) * 0.9 + (home.z - p.pos.z) / Math.max(dist, 0.1) * away);
      g.rotation.y = t * 0.7;
      const flap = Math.sin(t * (def.glyph === 'butterfly' ? 14 : 40)) * 0.9;
      if (l.current) l.current.rotation.y = flap;
      if (r.current) r.current.rotation.y = -flap;
    } else {
      const onTree = def.habitat === 'trees';
      g.position.set(home.x + Math.sin(t * 0.3) * 0.15, home.y + (onTree ? 1.1 : 0.05) + (def.id === 'grasshopper' ? Math.max(0, Math.sin(t * 2.5)) * 0.3 : 0), home.z - (onTree ? 0.25 : 0));
    }
    g.visible = !gone && flee.current < 0.95;
    const target = rt.targets.get(spawn.id);
    if (target) {target.x = g.position.x; target.z = g.position.z;}
  });
  useEffect(() => {
    if (gone) return;
    rt.targets.set(spawn.id, {id: spawn.id, label: `Catch ${creatureName(spawn)}`, icon: '🦋', x: spawn.x, z: spawn.z, radius: 1.9, priority: 0.3,
      run: () => {if (flee.current > 0.4) {rt.toast('It is too skittish — walk slowly!', 'info', '🦋'); return;} void catchBug(rt, spawn, onGone);}});
    return () => {rt.targets.delete(spawn.id);};
  }, [spawn, rt, gone, onGone]);
  const body = toon(def.color, glow ? {emissive: '#e9f27a', emissiveIntensity: 2} : {});
  return <group ref={group}>
    {def.flying ? <>
      <mesh ref={l} geometry={wing} material={toon(def.color, {side: THREE.DoubleSide, ...(glow ? {emissive: '#e9f27a', emissiveIntensity: 1.5} : {})})} position={[-0.06, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={def.glyph === 'butterfly' ? 1 : [0.5, 1.4, 1]} />
      <mesh ref={r} geometry={wing} material={toon(def.color, {side: THREE.DoubleSide})} position={[0.06, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={def.glyph === 'butterfly' ? 1 : [0.5, 1.4, 1]} />
      <mesh geometry={ball} material={toon('#3a2f2a')} scale={[0.02, 0.02, 0.09]} />
      {glow && <pointLight color="#eaff8a" intensity={0.6} distance={3} />}
    </> : <mesh geometry={ball} material={body} scale={[0.06, 0.045, 0.08]} castShadow />}
  </group>;
}

function Bird({spawn, rt, gone, onGone, register}: {spawn: CreatureSpawn; rt: Runtime; gone: boolean; onGone: (id: string) => void; register: (id: string, o: THREE.Object3D | null) => void}) {
  const def = BIRDS.find(b => b.id === spawn.species)!;
  const group = useRef<THREE.Group>(null), head = useRef<THREE.Group>(null);
  const home = useMemo(() => new THREE.Vector3(spawn.x, heightAt(spawn.x, spawn.z), spawn.z), [spawn]);
  const fly = useRef(0);
  const big = def.id === 'swan' || def.id === 'heron' ? 1.8 : def.id === 'owl' ? 1.4 : 1;
  useFrame(({clock}) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime + spawn.x;
    const p = rt.player;
    const dist = Math.hypot(p.pos.x - home.x, p.pos.z - home.z);
    if ((dist < 2.6 && p.speed > 2) || dist < 1.2) fly.current = Math.min(1, fly.current + 0.02);
    const f = fly.current;
    const water = def.id === 'swan' && waterAt(home.x, home.z);
    g.position.set(home.x + f * 8, (water ? WATER_Y : home.y) + f * 9 + (def.habitat === 'trees' || def.habitat === 'forest' ? 0 : 0), home.z - f * 6);
    if (head.current) {head.current.rotation.x = f > 0 ? 0 : Math.max(0, Math.sin(t * 3)) * 0.5; head.current.rotation.y = Math.sin(t * 0.8) * 0.6;}
    g.visible = !gone && f < 0.99;
    if (f >= 0.99 && !gone) onGone(spawn.id);
  });
  useEffect(() => {register(spawn.id, gone ? null : group.current); return () => register(spawn.id, null);}, [spawn, gone, register]);
  const m = toon(def.color), beak = toon('#f2a33a');
  return <group ref={group} scale={big}>
    <mesh geometry={ball} material={m} position={[0, 0.12, 0]} scale={[0.09, 0.08, 0.13]} castShadow />
    <mesh geometry={ball} material={m} position={[0, 0.17, -0.08]} rotation={[0.5, 0, 0]} scale={[0.04, 0.02, 0.08]} />
    <group ref={head} position={[0, 0.22, 0.08]}>
      <mesh geometry={ball} material={m} scale={0.06} castShadow />
      <mesh geometry={cone} material={beak} position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]} scale={[0.02, 0.05, 0.02]} />
      {[-0.03, 0.03].map(x => <mesh key={x} geometry={ball} material={toon('#1d1d22')} position={[x, 0.015, 0.045]} scale={0.011} />)}
    </group>
    {[-0.03, 0.03].map(x => <mesh key={x} geometry={ball} material={beak} position={[x, 0.03, 0]} scale={[0.008, 0.04, 0.008]} />)}
  </group>;
}

/** Fish shadows gliding near the shore: decorative hints of where to cast. */
function FishShadows() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const fish = useMemo(() => {
    const random = mulberry32(81);
    const list: {x: number; z: number; r: number; s: number; v: number}[] = [];
    for (let i = 0; i < 8; i++) {const a = random() * Math.PI * 2; list.push({x: POND.x + Math.cos(a) * POND.rx * 0.5, z: POND.z + Math.sin(a) * POND.rz * 0.5, r: 1.5 + random() * 2, s: 0.6 + random() * 0.8, v: 0.2 + random() * 0.3});}
    for (let i = 1; i < RIVER.length - 1; i++) list.push({x: RIVER[i].x, z: RIVER[i].z, r: 1.2, s: 0.7 + random() * 0.5, v: 0.35});
    for (let i = 0; i < 10; i++) list.push({x: -6 + random() * 48, z: SEA_Z + 3 + random() * 6, r: 2 + random() * 3, s: 0.8 + random() * 1.4, v: 0.15 + random() * 0.2});
    return list;
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({clock}) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    fish.forEach((f, i) => {
      const a = t * f.v + i;
      const x = f.x + Math.cos(a) * f.r, z = f.z + Math.sin(a) * f.r;
      m.makeRotationY(-a); m.scale(new THREE.Vector3(f.s * 0.25, 1, f.s * 0.55)); m.setPosition(x, WATER_Y - 0.12, z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[ball, undefined, fish.length]} renderOrder={1}>
    <meshBasicMaterial color="#1d3f58" transparent opacity={0.35} depthWrite={false} />
  </instancedMesh>;
}

/** Bugs, birds and fish shadows for the current spawn window, plus photo-mode framing. */
export function Creatures({rt}: {rt: Runtime}) {
  const [win, setWin] = useState(() => spawnWindow(Date.now()));
  const [gone, setGone] = useState<Set<string>>(new Set());
  const birds = useRef(new Map<string, THREE.Object3D>());
  const {camera} = useThree();
  useEffect(() => {const id = setInterval(() => setWin(spawnWindow(Date.now() + rt.ui.get().clockOffset)), 5000); return () => clearInterval(id);}, [rt]);
  const spawns = useMemo(() => creaturesForWindow(win), [win]);
  const caught = rt.ui.get().life?.caught;
  const isGone = (id: string) => gone.has(id) || !!caught?.includes(id);
  const onGone = useMemo(() => (id: string) => setGone(s => new Set(s).add(id)), []);
  const register = useMemo(() => (id: string, o: THREE.Object3D | null) => {if (o) birds.current.set(id, o); else birds.current.delete(id);}, []);
  // Photo mode target: the bird nearest the centre of the viewfinder.
  useFrame(() => {
    if (!rt.ui.get().photo) return;
    let best: {spawn: CreatureSpawn; framing: number} | null = null;
    const v = new THREE.Vector3();
    for (const s of spawns) {
      const o = birds.current.get(s.id);
      if (!o || !o.visible) continue;
      o.getWorldPosition(v);
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
      const centred = 1 - Math.min(1, Math.hypot(v.x, v.y) / 0.7);
      const near = THREE.MathUtils.clamp(1.25 - dist / 14, 0, 1);
      const framing = centred * 0.7 + near * 0.3;
      if (!best || framing > best.framing) best = {spawn: s, framing};
    }
    rt.photoTarget = best;
  });
  rt.snap = () => {
    const target = rt.photoTarget;
    if (!target) {rt.toast('No bird in the frame.', 'info', '📷'); rt.ui.set({flash: performance.now()}); return;}
    void snapBird(rt, target.spawn, target.framing, onGone);
  };
  return <>
    {spawns.filter(s => s.kind === 'bug').map(s => <Bug key={s.id} spawn={s} rt={rt} gone={isGone(s.id)} onGone={onGone} />)}
    {spawns.filter(s => s.kind === 'bird').map(s => <Bird key={s.id} spawn={s} rt={rt} gone={isGone(s.id)} onGone={onGone} register={register} />)}
    <FishShadows />
  </>;
}
