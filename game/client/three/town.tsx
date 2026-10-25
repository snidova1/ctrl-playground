'use client';
import {Suspense, useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {
  BRIDGES, BUILDINGS, COMMON_GATE, FLOWER_BEDS, FORAGE_NODES, HOME_STOP, LAMPS, PIER, TREES, PLAZA, RIVER, RIVER_WIDTH, BEACH_Z, TOWN_BOUNDS,
  fishableFrom, heightAt, WATER_Y, townWalkable, isPathAt,
} from '@/game/core/map';
import {NPCS, npcPosition} from '@/game/core/npcs';
import {ITEMS} from '@/game/core/items';
import type {RemotePlayer} from '@/game/core/api-types';
import type {Runtime} from '../runtime';
import {useStore} from '../store';
import {forage, startFishing, talk} from '../actions';
import {Avatar, type AvatarMotion} from './avatar';
import {TownTerrain, Water} from './terrain';
import {Boulders, Bushes, FlowerField, Grass, Trees} from './foliage';
import {Cottage} from './buildings';
import {Kit} from './kit';
import {Creatures} from './creatures';
import {Player} from './player';
import {Remote} from './remote';
import {Bobber} from './bobber';
import {toon} from './materials';
import {mulberry32} from '@/game/core/rng';

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);

function Bridge({b}: {b: typeof BRIDGES[number]}) {
  const wood = toon('#c08a5a'), dark = toon('#8f6040');
  return <group position={[b.x, 0.2, b.z]} rotation={[0, -b.rot, 0]}>
    {Array.from({length: 11}, (_, i) => <mesh key={i} geometry={box} material={i % 2 ? wood : toon('#b57f50')} position={[-b.length / 2 + 0.35 + i * (b.length - 0.7) / 10, 0.12 + Math.sin((i / 10) * Math.PI) * 0.25, 0]} scale={[0.66, 0.12, b.width]} castShadow receiveShadow />)}
    {[-1, 1].map(s => <group key={s}>
      {Array.from({length: 5}, (_, i) => <mesh key={i} geometry={cyl} material={dark} position={[-b.length / 2 + 0.4 + i * (b.length - 0.8) / 4, 0.55 + Math.sin((i / 4) * Math.PI) * 0.25, s * (b.width / 2 - 0.1)]} scale={[0.07, 0.8, 0.07]} castShadow />)}
      <mesh geometry={box} material={wood} position={[0, 0.95 + 0.18, s * (b.width / 2 - 0.1)]} scale={[b.length - 0.6, 0.09, 0.12]} castShadow />
    </group>)}
  </group>;
}

function Pier() {
  const wood = toon('#c79764'), post = toon('#8a5f3e');
  const planks = Math.round((PIER.z1 - PIER.z0) / 0.55);
  return <group position={[PIER.x, 0, 0]}>
    {Array.from({length: planks}, (_, i) => <mesh key={i} geometry={box} material={i % 3 ? wood : toon('#b98856')} position={[0, 0.5, PIER.z0 + 0.28 + i * 0.55]} scale={[PIER.w, 0.1, 0.5]} castShadow receiveShadow />)}
    {Array.from({length: Math.floor((PIER.z1 - PIER.z0) / 3)}, (_, i) => [-1, 1].map(s => <mesh key={`${i}${s}`} geometry={cyl} material={post} position={[s * (PIER.w / 2 - 0.1), -0.2, PIER.z0 + 1 + i * 3]} scale={[0.12, 1.6, 0.12]} />))}
  </group>;
}

function Lamps({night}: {night: number}) {
  const glow = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffd889', transparent: true, opacity: 0, depthWrite: false}), []);
  glow.opacity = night * 0.55;
  return <>{LAMPS.map((l, i) => <group key={i} position={[l.x, heightAt(l.x, l.z), l.z]}>
    <Kit model="fantasy-town/lantern" position={[0, 0, 0]} scale={1.1} />
    <mesh material={glow} position={[0, 1.55, 0]}><sphereGeometry args={[0.55, 12, 10]} /></mesh>
  </group>)}</>;
}

function TownProps() {
  return <>
    <Kit model="fantasy-town/fountain-round" position={[0, 0.02, 0]} scale={1.7} />
    <Kit model="fantasy-town/stall-red" position={[-5.5, 0.02, 8.2]} rotation={0.4} scale={1.1} />
    <Kit model="fantasy-town/stall-green" position={[5.8, 0.02, 8.4]} rotation={-0.5} scale={1.1} />
    <Kit model="fantasy-town/cart" position={[-8.6, 0.02, -3]} rotation={1.2} />
    {FLOWER_BEDS.slice(0, 7).map((f, i) => <group key={i} position={[f.x, heightAt(f.x, f.z), f.z]}>
      {[[-0.4, -0.3], [0.35, -0.2], [0, 0.35], [-0.6, 0.4], [0.6, 0.45]].map(([dx, dz], k) => <Kit key={k} model={`nature-kit/flower_${['red', 'yellow', 'purple'][(i + k) % 3]}${'ABC'[k % 3]}`} position={[dx, 0, dz]} scale={1.6} shadows={false} />)}
    </group>)}
    {FLOWER_BEDS.slice(7).map((f, i) => <Kit key={i} model={`nature-kit/flower_${['purple', 'yellow', 'red'][i % 3]}${'ABC'[i % 3]}`} position={[f.x, heightAt(f.x, f.z), f.z]} scale={1.8} shadows={false} />)}
    {[[-9.5, 3, 1.57], [9.5, 3, -1.57], [-9.5, -3, 1.57], [9.5, -3, -1.57]].map(([x, z, r], i) => <Kit key={i} model="furniture-kit/benchCushion" position={[x, 0.02, z]} rotation={r} scale={1.6} />)}
    {[[-30, 30], [-24, 26], [26, 27], [36, 29], [-4, 31]].map(([x, z], i) => <Kit key={i} model={`nature-kit/rock_large${'ABCDE'[i]}`} position={[x, heightAt(x, z), z]} scale={1.2} />)}
    {[[20, 31], [30, 32.5]].map(([x, z], i) => <Kit key={i} model="nature-kit/canoe" position={[x, heightAt(x, z) + 0.05, z]} rotation={0.6 + i} scale={1.6} />)}
    {[[16, 31.5], [-2, 30]].map(([x, z], i) => <Kit key={i} model="nature-kit/tree_palmBend" position={[x, heightAt(x, z), z]} rotation={i * 2} scale={2.2} />)}
    <Kit model="nature-kit/campfire_logs" position={[3, heightAt(3, -32), -32]} scale={1.4} />
    <Kit model="nature-kit/tent_detailedOpen" position={[6, heightAt(6, -34), -34]} rotation={0.4} scale={2} />
    <Kit model="nature-kit/sign" position={[HOME_STOP.x + 1.2, 0.05, HOME_STOP.z]} scale={1.6} />
    <Kit model="nature-kit/sign" position={[COMMON_GATE.x, 0.05, COMMON_GATE.z]} rotation={0.6} scale={1.6} />
    <mesh geometry={box} material={toon('#f2c14e')} position={[HOME_STOP.x, 1.3, HOME_STOP.z]} scale={[0.12, 2.6, 0.12]} castShadow />
    <mesh geometry={cyl} material={toon('#6fb7c9')} position={[HOME_STOP.x, 2.7, HOME_STOP.z]} rotation={[Math.PI / 2, 0, 0]} scale={[0.45, 0.08, 0.45]} castShadow />
  </>;
}

function Npc({npc, rt}: {npc: typeof NPCS[number]; rt: Runtime}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<AvatarMotion>({anim: 'idle', speed: 2.4, tool: npc.id === 'marlo' ? 'rod' : 'none', actionAt: 0});
  useEffect(() => {
    rt.targets.set(`npc-${npc.id}`, {id: `npc-${npc.id}`, label: `Talk to ${npc.name}`, icon: '💬', x: 0, z: 0, radius: 2.4, priority: 0.5, run: () => void talk(rt, npc.id)});
    return () => {rt.targets.delete(`npc-${npc.id}`);};
  }, [npc, rt]);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const p = npcPosition(npc, Date.now() + rt.ui.get().clockOffset);
    const player = rt.player.pos;
    const near = Math.hypot(player.x - p.x, player.z - p.z) < 3.2;
    g.position.set(p.x, heightAt(p.x, p.z), p.z);
    // Turn to face the player when they come close, like a friendly neighbour.
    const face = near ? Math.atan2(player.x - p.x, player.z - p.z) : p.angle;
    let diff = face - g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.rotation.y += diff * 0.1;
    const m = motion.current;
    const dialog = rt.ui.get().dialog?.npc === npc.id;
    m.anim = p.moving && !near ? 'walk' : dialog ? 'talk' : npc.id === 'marlo' && !near ? 'fish' : near ? 'wave' : 'idle';
    m.mood = dialog || near ? 'happy' : null;
    const t = rt.targets.get(`npc-${npc.id}`);
    if (t) {t.x = p.x; t.z = p.z;}
  });
  return <group ref={group}><Avatar look={npc.look} motion={motion} name={npc.name} nameColor="#ffe9a8" /></group>;
}

function ForageNodes({rt}: {rt: Runtime}) {
  const picked = useStore(rt.ui, s => s.life?.foraged.ids.join(',') ?? '');
  const set = useMemo(() => new Set(picked.split(',')), [picked]);
  useEffect(() => {
    const ids: string[] = [];
    for (const n of FORAGE_NODES) {
      if (set.has(n.id)) continue;
      ids.push(n.id);
      rt.targets.set(n.id, {id: n.id, label: `Pick up ${ITEMS[n.item]?.name ?? n.item}`, icon: '🍄', x: n.x, z: n.z, radius: 1.6, priority: 0.2, run: () => void forage(rt, n.id)});
    }
    return () => ids.forEach(id => rt.targets.delete(id));
  }, [rt, set]);
  const model: Record<string, string> = {mushroom: 'nature-kit/mushroom_redGroup', 'wild-berry': 'nature-kit/plant_bushSmall', apple: 'food-kit/apple', wildflower: 'nature-kit/flower_purpleB', seashell: '', wood: 'nature-kit/log', stone: 'nature-kit/stone_smallA'};
  const scale: Record<string, number> = {mushroom: 1.6, 'wild-berry': 1.3, apple: 1.4, wildflower: 1.8, wood: 0.6, stone: 1.6};
  return <>{FORAGE_NODES.filter(n => !set.has(n.id)).map(n => {
    const y = heightAt(n.x, n.z);
    if (n.item === 'seashell') return <mesh key={n.id} position={[n.x, y + 0.05, n.z]} rotation={[-0.4, n.x, 0]} scale={[0.16, 0.06, 0.13]} material={toon('#f6dccd')} geometry={new THREE.SphereGeometry(1, 8, 6)} castShadow />;
    return <group key={n.id}>
      <Kit model={model[n.item]} position={[n.x, y, n.z]} rotation={n.x} scale={scale[n.item]} />
      {n.item === 'wild-berry' && [0, 1, 2].map(k => <mesh key={k} position={[n.x + Math.cos(k * 2) * 0.22, y + 0.3, n.z + Math.sin(k * 2) * 0.22]} scale={0.07} material={toon('#c0304f')} geometry={new THREE.SphereGeometry(1, 8, 6)} />)}
      <Sparkle x={n.x} y={y} z={n.z} />
    </group>;
  })}</>;
}

/** A soft twinkle so pickable things read clearly, as in cozy life sims. */
function Sparkle({x, y, z}: {x: number; y: number; z: number}) {
  const ref = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * 6, []);
  useFrame(({clock}) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime + phase;
    const s = Math.max(0, Math.sin(t * 2)) * 0.18;
    m.scale.setScalar(s);
    m.rotation.z = t;
  });
  return <mesh ref={ref} position={[x, y + 0.75, z]}>
    <octahedronGeometry args={[1, 0]} />
    <meshBasicMaterial color="#fff6b0" transparent opacity={0.9} depthWrite={false} />
  </mesh>;
}

/** Fishing spot detection: offer "Fish" whenever the player faces water. */
function WaterEdge({rt, where}: {rt: Runtime; where: 'town' | 'home'}) {
  const tick = useRef(0);
  useFrame((_, dt) => {
    tick.current -= dt;
    if (tick.current > 0) return;
    tick.current = 0.2;
    const p = rt.player;
    const spot = where === 'town' ? fishableFrom(p.pos.x, p.pos.z, p.angle) : null;
    if (spot) rt.targets.set('water', {id: 'water', label: spot.water === 'sea' ? 'Fish in the sea' : spot.water === 'river' ? 'Fish in the river' : 'Fish in the pond', icon: '🎣', x: p.pos.x, z: p.pos.z, radius: 1, priority: -0.4, run: () => void startFishing(rt, where, spot.water, spot.target)});
    else rt.targets.delete('water');
  });
  return null;
}

function Stations({rt, variant}: {rt: Runtime; variant: 'common-ground' | 'public' | 'preview'}) {
  useEffect(() => {
    const door = (b: typeof BUILDINGS[number]) => {
      const off = {south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0]}[b.facing];
      const d = b.facing === 'east' || b.facing === 'west' ? b.w : b.d;
      return {x: b.x + off[0] * (d / 2 + 1.4), z: b.z + off[1] * (d / 2 + 1.4)};
    };
    const add = (id: string, label: string, icon: string, x: number, z: number, run: () => void) => rt.targets.set(id, {id, label, icon, x, z, radius: 2.4, priority: 0.1, run});
    const store = BUILDINGS.find(b => b.id === 'store')!, cafe = BUILDINGS.find(b => b.id === 'cafe')!, florist = BUILDINGS.find(b => b.id === 'florist')!, hall = BUILDINGS.find(b => b.id === 'hall')!;
    if (variant !== 'common-ground') {
      const s = door(store), c = door(cafe), f = door(florist), h = door(hall);
      add('station-store', 'Shop at the General Store', '🛍️', s.x, s.z, () => rt.openPanel('shop', 'goods'));
      add('station-cafe', 'Cook at Café Tomo', '🍳', c.x, c.z, () => rt.openPanel('cook'));
      add('station-florist', 'Browse seeds & fashion', '🌷', f.x, f.z, () => rt.openPanel('shop', 'fashion'));
      add('station-hall', 'Read the request board', '📜', h.x, h.z, () => rt.openPanel('quests'));
      add('station-home', 'Take the bus home', '🏡', HOME_STOP.x, HOME_STOP.z, () => rt.goto('home'));
      add('station-gate', 'Back to Common Ground', '🚪', COMMON_GATE.x, COMMON_GATE.z, () => rt.goto('common-ground'));
    } else {
      add('station-gate', 'Enter Willow Common', '✨', COMMON_GATE.x, COMMON_GATE.z, () => rt.goto('town'));
    }
    return () => {for (const id of ['station-store', 'station-cafe', 'station-florist', 'station-hall', 'station-home', 'station-gate']) rt.targets.delete(id);};
  }, [rt, variant]);
  return null;
}

/** Fence ring keeping guests inside the open-air Common Ground plaza. */
function CommonFence() {
  const posts = 44, r = 17.5;
  return <>{Array.from({length: posts}, (_, i) => {
    const a = (i / posts) * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - COMMON_GATE.x, z - COMMON_GATE.z) < 2) return null;
    return <Kit key={i} model="nature-kit/fence_simple" position={[x, heightAt(x, z), z]} rotation={-a + Math.PI / 2} scale={1.4} shadows={false} />;
  })}</>;
}

/** Deterministic garden dressing: bushes, flower drifts and boulders placed on dry, open ground. */
function useDressing() {
  return useMemo(() => {
    const random = mulberry32(2026);
    const open = (x: number, z: number, pad = 1.6) => townWalkable(x, z) && !isPathAt(x, z, pad) && Math.hypot(x, z) > PLAZA.r + 1 &&
      !BUILDINGS.some(b => Math.abs(x - b.x) < b.w / 2 + 0.9 && Math.abs(z - b.z) < b.d / 2 + 0.9) && TREES.every(t => Math.hypot(t.x - x, t.z - z) > 1.6);
    const bushes: {x: number; z: number}[] = [];
    // Hedges hugging every cottage and the plaza rim, then scattered clumps.
    for (const b of BUILDINGS) for (let i = 0; i < 7; i++) {
      const side = i % 4, t = random() - 0.5;
      const x = b.x + (side < 2 ? t * b.w : (side === 2 ? -1 : 1) * (b.w / 2 + 1.1));
      const z = b.z + (side < 2 ? (side === 0 ? -1 : 1) * (b.d / 2 + 1.1) : t * b.d);
      if (open(x, z, 1.3)) bushes.push({x, z});
    }
    for (let i = 0; i < 26; i++) {const a = (i / 26) * Math.PI * 2; const x = Math.cos(a) * (PLAZA.r + 1.6), z = Math.sin(a) * (PLAZA.r + 1.6); if (open(x, z, 1.4) && random() < 0.7) bushes.push({x, z});}
    for (let i = 0; i < 260 && bushes.length < 150; i++) {
      const x = TOWN_BOUNDS.minX + random() * (TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX), z = TOWN_BOUNDS.minZ + random() * (BEACH_Z - 2 - TOWN_BOUNDS.minZ);
      if (open(x, z)) bushes.push({x, z});
    }
    const patches: {x: number; z: number; r: number; color: string}[] = [];
    const tones = ['#7fd0f5', '#8fb4ff', '#b9a0f5', '#fdfdfb', '#f9b8d2', '#ffe27a'];
    for (let i = 0; i < 40; i++) {
      const meadow = i < 18;
      const x = meadow ? -45 + random() * 11 : TOWN_BOUNDS.minX + random() * (TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX);
      const z = meadow ? -22 + random() * 48 : TOWN_BOUNDS.minZ + random() * (BEACH_Z - 4 - TOWN_BOUNDS.minZ);
      if (open(x, z, 1.2)) patches.push({x, z, r: 1.6 + random() * 2.6, color: meadow ? tones[i % 3] : tones[Math.floor(random() * tones.length)]});
    }
    const rocks: {x: number; z: number; s: number; r: number}[] = [];
    for (let i = 0; i < 160 && rocks.length < 34; i++) {
      const along = i % 3 === 0 ? RIVER[1 + Math.floor(random() * (RIVER.length - 2))] : null;
      const x = along ? along.x + (random() < 0.5 ? -1 : 1) * (RIVER_WIDTH / 2 + 1.3) : TOWN_BOUNDS.minX + random() * (TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX);
      const z = along ? along.z + (random() - 0.5) * 6 : random() < 0.5 ? BEACH_Z + random() * 6 : TOWN_BOUNDS.minZ + random() * 14;
      if (townWalkable(x, z) && !isPathAt(x, z, 2)) rocks.push({x, z, s: 0.7 + random() * 1.3, r: random() * 6});
    }
    return {bushes, patches, rocks};
  }, []);
}

export function TownWorld({rt, variant, players, quality, playerName}: {rt: Runtime; variant: 'common-ground' | 'public' | 'preview'; players: RemotePlayer[]; quality: 'high' | 'low'; playerName?: string}) {
  const night = useRef(0);
  const lampNight = useStore(rt.ui, () => Math.round(rt.env.current.night * 4) / 4);
  useFrame(() => {night.current = rt.env.current.night;});
  const dressing = useDressing();
  const light = useMemo(() => new THREE.Color(), []);
  light.copy(rt.env.current.sky.sun).multiplyScalar(0.35 + rt.env.current.sky.sunIntensity * 0.28).lerp(new THREE.Color('#ffffff'), 0.25);
  return <>
    <TownTerrain />
    <Water night={lampNight} />
    <Trees trees={TREES} density={quality === 'high' ? 1 : 0.55} />
    <Grass count={quality === 'high' ? 26000 : 11000} light={light} />
    <Bushes spots={dressing.bushes} />
    <FlowerField patches={dressing.patches} count={quality === 'high' ? 2600 : 1200} />
    <Boulders rocks={dressing.rocks} />
    {BUILDINGS.map(b => <Cottage key={b.id} b={b} night={lampNight} />)}
    {BRIDGES.map(b => <Bridge key={b.id} b={b} />)}
    <Pier />
    <Suspense fallback={null}>
      <TownProps />
      <Lamps night={lampNight} />
      {variant === 'common-ground' ? <CommonFence /> : <ForageNodes rt={rt} />}
      {NPCS.filter(n => variant !== 'common-ground' || n.id === 'odette').map(n => <Npc key={n.id} npc={n} rt={rt} />)}
    </Suspense>
    {variant !== 'common-ground' && <Creatures rt={rt} />}
    {variant !== 'common-ground' && <WaterEdge rt={rt} where="town" />}
    <Stations rt={rt} variant={variant} />
    <Bobber rt={rt} waterY={WATER_Y} />
    {players.map(p => <Remote key={p.id} p={p} height={heightAt} />)}
    <Player rt={rt} name={playerName} />
  </>;
}
