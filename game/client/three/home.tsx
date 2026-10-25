'use client';
import {Suspense, useEffect, useMemo, useState} from 'react';
import type {ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {HOME_BOUNDS, HOME_STATIONS, HOUSE, PLOT_SIZE, ROOM_BOUNDS, ROOM_DOOR, WATER_Y, plotPosition, homeWaterAt} from '@/game/core/map';
import {CROP_BY_ID, FURNITURE_BY_ID} from '@/game/core/items';
import {footprint, insideArea, type Layout, type Placed} from '@/game/core/home';
import type {Plot} from '@/game/core/life';
import type {Building} from '@/game/core/map';
import {DEFAULT_HOUSE, DOOR_COLORS, HOUSE_SIZES, ROOF_COLORS, TRIM_COLORS, WALL_COLORS, type House} from '@/game/core/house';
import type {Runtime} from '../runtime';
import {useStore} from '../store';
import {startFishing, hobbyReady} from '../actions';
import {Cottage} from './buildings';
import {Kit} from './kit';
import {Player} from './player';
import {Bushes, FlowerField, Grass, Trees, type TreeSpec} from './foliage';
import {canvasTexture, toon} from './materials';
import {Remote} from './remote';
import {Bobber} from './bobber';
import type {RemotePlayer} from '@/game/core/api-types';

const flat = () => 0;
// Garden dressing beyond the fence: soft trees, hydrangeas and bell flowers like the town.
const HOME_TREES: TreeSpec[] = [[-21, -15, 'pine'], [21, -16, 'round'], [-23, 3, 'blossom'], [23, 5, 'round'], [-20, 17, 'fruit'], [20, 18, 'birch'], [-9, -18, 'round'], [10, -19, 'pine'], [-26, -6, 'round'], [26, -4, 'blossom'], [-14, 21, 'round'], [14, 21, 'round']].map(([x, z, kind]) => ({x: x as number, z: z as number, s: 1.1, kind: kind as TreeSpec['kind']}));
const HOME_BUSHES = [[-15.5, -12], [15.5, -12], [-15.5, 13.5], [15.5, 13.5], [-4.8, -3], [4.8, -3], [-18.5, 0], [18.5, 2], [-6, 16], [6, 16]].map(([x, z]) => ({x, z}));
const HOME_FLOWERS = [{x: -19, z: 8, r: 2.5, color: '#7fd0f5'}, {x: 19, z: -7, r: 2.4, color: '#b9a0f5'}, {x: -10, z: -16, r: 2.2, color: '#f9b8d2'}, {x: 11, z: 17, r: 2.4, color: '#fdfdfb'}];
const GRASS_BOUNDS = {minX: -30, maxX: 30, minZ: -26, maxZ: 28};
function grassAllowed(x: number, z: number) {
  if (Math.abs(x - HOUSE.x) < HOUSE.w / 2 + 0.8 && Math.abs(z - HOUSE.z) < HOUSE.d / 2 + 2.6) return false; // house + porch
  const a = plotPosition(0), b = plotPosition(11);
  if (x > a.x - 1.2 && x < b.x + 1.2 && z > a.z - 1.2 && z < b.z + 1.2) return false; // garden beds
  if (Math.abs(x) < 1.4 && z > -2 && z < 14.5) return false; // front path
  if (homeWaterAt(x, z) || Math.hypot((x - HOME_STATIONS.pond.x) / (HOME_STATIONS.pond.rx + 0.5), (z - HOME_STATIONS.pond.z) / (HOME_STATIONS.pond.rz + 0.5)) < 1) return false;
  return true;
}

const box = new THREE.BoxGeometry(1, 1, 1);
/** The cottage keeps its front door on the same line whatever its size, so the yard layout stays valid. */
function houseBuilding(house: House): Building {
  const size = HOUSE_SIZES[house.size] ?? HOUSE_SIZES[0];
  return {id: 'my-house', name: 'Home', x: HOUSE.x, z: HOUSE.doorZ - size.d / 2, w: size.w, d: size.d, facing: 'south', wall: WALL_COLORS[house.wall], roof: ROOF_COLORS[house.roof], trim: TRIM_COLORS[house.trim], kind: 'home'};
}

export interface Decor {selected: string | null; placing: string | null; rotation: number}

function FurniturePiece({item, onSelect, selected}: {item: Placed; onSelect?: (id: string) => void; selected: boolean}) {
  const def = FURNITURE_BY_ID[item.assetId];
  if (!def) return null;
  const scale = def.model.startsWith('furniture-kit/') ? 1.9 : def.model.startsWith('fantasy-town/') ? 1.1 : 1.6;
  const [w, d] = footprint(item);
  return <group position={[item.x, 0, item.z]} onClick={onSelect ? (e: ThreeEvent<MouseEvent>) => {e.stopPropagation(); onSelect(item.id);} : undefined}>
    <group rotation={[0, item.rotation * Math.PI / 2, 0]}>
      <Kit model={def.model} position={[0, 0, 0]} scale={(def.scale ?? 1) * scale} />
    </group>
    {selected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><planeGeometry args={[w, d]} /><meshBasicMaterial color="#7fd0ff" transparent opacity={0.35} depthWrite={false} /></mesh>}
    {def.light && <pointLight position={[0, 1.4, 0]} intensity={0.6} distance={5} color="#ffd59a" />}
  </group>;
}

function Ghost({assetId, rotation, at, valid}: {assetId: string; rotation: number; at: THREE.Vector3; valid: boolean}) {
  const def = FURNITURE_BY_ID[assetId];
  const [w, d] = footprint({assetId, rotation});
  if (!def) return null;
  const scale = def.model.startsWith('furniture-kit/') ? 1.9 : def.model.startsWith('fantasy-town/') ? 1.1 : 1.6;
  return <group position={[at.x, 0, at.z]}>
    <group rotation={[0, rotation * Math.PI / 2, 0]}><Kit model={def.model} position={[0, 0, 0]} scale={(def.scale ?? 1) * scale} shadows={false} /></group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}><planeGeometry args={[w, d]} /><meshBasicMaterial color={valid ? '#8fe08a' : '#ff8a8a'} transparent opacity={0.45} depthWrite={false} /></mesh>
  </group>;
}

/** Click/tap-to-place furniture editing on a snapped grid. */
function Decorator({rt, layout, room, decor, setDecor, onChange}: {rt: Runtime; layout: Layout; room: boolean; decor: Decor; setDecor: (d: Decor) => void; onChange: (layout: Layout) => void}) {
  const [hover, setHover] = useState(() => new THREE.Vector3(room ? 0 : 6, 0, room ? 0 : 6));
  const b = room ? ROOM_BOUNDS : HOME_BOUNDS;
  const snap = (v: number, size: number) => (size % 2 ? Math.floor(v) + 0.5 : Math.round(v));
  const candidate = (assetId: string, x: number, z: number, rotation: number, ignore?: string): Placed => ({id: ignore ?? crypto.randomUUID(), assetId, x, z, rotation, room});
  const overlaps = (p: Placed) => layout.some(o => o.id !== p.id && o.room === p.room && (() => {
    const [w1, d1] = footprint(p), [w2, d2] = footprint(o);
    return Math.abs(p.x - o.x) < (w1 + w2) / 2 - 0.05 && Math.abs(p.z - o.z) < (d1 + d2) / 2 - 0.05;
  })());
  const placing = decor.placing;
  const selected = decor.selected ? layout.find(o => o.id === decor.selected) : null;
  const ghostAsset = placing ?? selected?.assetId ?? null;
  const [gw, gd] = ghostAsset ? footprint({assetId: ghostAsset, rotation: decor.rotation}) : [1, 1];
  const gx = snap(hover.x, gw), gz = snap(hover.z, gd);
  const ghost = ghostAsset ? candidate(ghostAsset, gx, gz, decor.rotation, selected?.id) : null;
  const valid = !!ghost && insideArea(ghost) && !overlaps(ghost);
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(b.minX + b.maxX) / 2, 0.02, (b.minZ + b.maxZ) / 2]}
      onPointerMove={e => setHover(e.point.clone())}
      onClick={e => {
        e.stopPropagation();
        setHover(e.point.clone());
        if (!ghost) return;
        if (!valid) {rt.toast('It does not fit there.', 'bad', '🪑'); return;}
        if (selected) onChange(layout.map(o => (o.id === selected.id ? ghost : o)));
        else onChange([...layout, ghost]);
        setDecor({selected: null, placing: null, rotation: decor.rotation});
      }}>
      <planeGeometry args={[b.maxX - b.minX, b.maxZ - b.minZ, 1, 1]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <gridHelper args={[Math.max(b.maxX - b.minX, b.maxZ - b.minZ), Math.max(b.maxX - b.minX, b.maxZ - b.minZ), '#ffffff', '#ffffff']} position={[(b.minX + b.maxX) / 2, 0.035, (b.minZ + b.maxZ) / 2]} material-transparent material-opacity={0.25} />
    {ghost && <Ghost assetId={ghost.assetId} rotation={decor.rotation} at={new THREE.Vector3(gx, 0, gz)} valid={valid} />}
  </>;
}

function CropModel({plot, now}: {plot: Pick<Plot, 'crop' | 'waters' | 'readyAt'>; now: number}) {
  if (!plot.crop) return null;
  const crop = CROP_BY_ID[plot.crop];
  const ready = plot.waters >= 2 && plot.readyAt !== null && now >= plot.readyAt;
  const stage = ready ? 2 : plot.waters >= 1 && plot.readyAt !== null && now >= plot.readyAt ? 1.5 : plot.waters;
  if (ready) return <group>
    <Kit model={`nature-kit/${crop.model}`} position={[0, 0.18, 0]} scale={1.7} />
    <mesh position={[0, 1.2, 0]}><octahedronGeometry args={[0.12, 0]} /><meshBasicMaterial color="#fff6b0" /></mesh>
  </group>;
  const s = 0.25 + stage * 0.22;
  return <group position={[0, 0.2, 0]} scale={s}>
    {[-0.25, 0.25].map(x => <mesh key={x} position={[x, 0.3, 0]} rotation={[0, 0, x * 2]} material={toon('#7cc35c')}><sphereGeometry args={[0.28, 8, 6]} /></mesh>)}
    <mesh position={[0, 0.15, 0]} material={toon('#5fa847')}><cylinderGeometry args={[0.05, 0.05, 0.4, 5]} /></mesh>
  </group>;
}

function Plots({rt, garden, own}: {rt: Runtime; garden: Pick<Plot, 'crop' | 'waters' | 'readyAt'>[]; own: boolean}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {const id = setInterval(() => setNow(Date.now() + rt.ui.get().clockOffset), 1000); return () => clearInterval(id);}, [rt]);
  const soil = toon('#9a6a45'), wet = toon('#6e4a31');
  useEffect(() => {
    if (!own) return;
    const ids: string[] = [];
    garden.forEach((plot, i) => {
      const p = plotPosition(i);
      const id = `plot-${i}`;
      ids.push(id);
      const ready = plot.crop && plot.waters >= 2 && plot.readyAt !== null && now >= plot.readyAt;
      const thirsty = plot.crop && plot.waters < 2 && (plot.readyAt === null || now >= plot.readyAt);
      const remaining = plot.readyAt ? Math.max(0, plot.readyAt - now) : 0;
      const label = !plot.crop ? 'Plant seeds' : ready ? `Harvest ${CROP_BY_ID[plot.crop].name}` : thirsty ? 'Water the plot' : `Growing… ${Math.ceil(remaining / 60000)} min`;
      rt.targets.set(id, {id, label, icon: !plot.crop ? '🌱' : ready ? '🧺' : thirsty ? '💧' : '⏳', x: p.x, z: p.z, radius: 1.3, priority: 0.4, run: async () => {
        if (!hobbyReady(rt, 'gardening')) return;
        if (!plot.crop) {rt.openPanel('bag', `plant:${i}`); return;}
        if (ready) {rt.setAnim('pick', 'none', 1000, 'happy'); await rt.act({type: 'harvest', plot: i}); return;}
        if (thirsty) {rt.setAnim('water', 'can', 1300); await rt.act({type: 'water', plot: i}); return;}
        rt.toast('Still growing. Come back soon!', 'info', '⏳');
      }});
    });
    return () => ids.forEach(id => rt.targets.delete(id));
  }, [rt, garden, own, now]);
  return <>{garden.map((plot, i) => {
    const p = plotPosition(i);
    const damp = plot.crop && plot.readyAt !== null && now < plot.readyAt;
    return <group key={i} position={[p.x, 0, p.z]}>
      <mesh geometry={box} material={damp ? wet : soil} position={[0, 0.08, 0]} scale={[PLOT_SIZE, 0.18, PLOT_SIZE]} receiveShadow />
      {[-0.45, 0, 0.45].map(z => <mesh key={z} geometry={box} material={toon('#87593a')} position={[0, 0.18, z]} scale={[PLOT_SIZE * 0.92, 0.04, 0.12]} />)}
      <CropModel plot={plot} now={now} />
    </group>;
  })}</>;
}

function Mailbox() {
  return <group position={[HOME_STATIONS.mailbox.x, 0, HOME_STATIONS.mailbox.z]}>
    <mesh geometry={box} material={toon('#8a5f3e')} position={[0, 0.5, 0]} scale={[0.12, 1, 0.12]} />
    <mesh geometry={box} material={toon('#6fb7c9')} position={[0, 1.1, 0]} scale={[0.5, 0.36, 0.7]} castShadow />
    <mesh geometry={box} material={toon('#e8473d')} position={[0.28, 1.25, 0.1]} scale={[0.04, 0.3, 0.06]} />
  </group>;
}

function HomeGround({quality}: {quality: 'high' | 'low'}) {
  const light = useMemo(() => new THREE.Color('#ffffff'), []);
  const fences = useMemo(() => {
    const list: {x: number; z: number; r: number}[] = [];
    for (let x = HOME_BOUNDS.minX + 0.5; x < HOME_BOUNDS.maxX; x += 1) {list.push({x, z: HOME_BOUNDS.minZ - 0.3, r: 0}); if (Math.abs(x) > 1.6) list.push({x, z: HOME_BOUNDS.maxZ + 0.3, r: 0});}
    for (let z = HOME_BOUNDS.minZ + 0.5; z < HOME_BOUNDS.maxZ; z += 1) {list.push({x: HOME_BOUNDS.minX - 0.3, z, r: Math.PI / 2}); list.push({x: HOME_BOUNDS.maxX + 0.3, z, r: Math.PI / 2});}
    return list;
  }, []);
  const pond = HOME_STATIONS.pond;
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[160, 160]} /><meshToonMaterial color="#93cf68" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 6]} receiveShadow><planeGeometry args={[2.4, 16]} /><meshToonMaterial color="#e8cf9c" /></mesh>
    <mesh position={[pond.x, WATER_Y + 0.2, pond.z]} scale={[pond.rx, 1, pond.rz]}><cylinderGeometry args={[1, 1, 0.05, 32]} /><meshToonMaterial color="#6cc7e6" transparent opacity={0.9} /></mesh>
    <mesh position={[pond.x, 0.02, pond.z]} scale={[pond.rx + 0.4, 1, pond.rz + 0.4]}><cylinderGeometry args={[1, 1, 0.06, 32]} /><meshToonMaterial color="#d8c8a0" /></mesh>
    {fences.map((f, i) => <Kit key={i} model="nature-kit/fence_simple" position={[f.x, 0, f.z]} rotation={f.r} scale={1.1} shadows={false} />)}
    <Trees trees={HOME_TREES} density={quality === 'high' ? 1 : 0.55} height={flat} />
    <Bushes spots={HOME_BUSHES} height={flat} />
    <FlowerField patches={HOME_FLOWERS} count={quality === 'high' ? 700 : 350} height={flat} />
    <Grass count={quality === 'high' ? 7000 : 3000} light={light} bounds={GRASS_BOUNDS} town={false} allow={grassAllowed} />
  </>;
}

function wallpaperTexture(kind: number) {
  return canvasTexture(256, 256, ctx => {
    const bg = ['#fbe9d4', '#e6f5ec', '#ece4f8', '#d8b48a', '#e4f0fb', '#fff1f4'][kind] ?? '#fbe9d4';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 256);
    if (kind === 0) {ctx.fillStyle = '#f2b8a8'; for (let y = 16; y < 256; y += 32) for (let x = 16 + (y % 64 ? 16 : 0); x < 256; x += 32) {ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();}}
    if (kind === 1) {ctx.fillStyle = '#c9ead6'; for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 14, 256);}
    if (kind === 2) {ctx.fillStyle = '#dccdf2'; for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {ctx.beginPath(); ctx.moveTo(x + 32, y + 8); ctx.lineTo(x + 56, y + 32); ctx.lineTo(x + 32, y + 56); ctx.lineTo(x + 8, y + 32); ctx.fill();}}
    if (kind === 3) for (let x = 0; x < 256; x += 32) {ctx.fillStyle = x % 64 ? '#cfa77c' : '#c79d70'; ctx.fillRect(x, 0, 32, 256); ctx.fillStyle = '#a9805a'; ctx.fillRect(x, 0, 2, 256);}
    if (kind === 4) {ctx.fillStyle = 'rgba(140,180,230,0.35)'; for (let i = 0; i < 256; i += 32) {ctx.fillRect(i, 0, 12, 256); ctx.fillRect(0, i, 256, 12);}}
    if (kind === 5) {for (let y = 20; y < 256; y += 48) for (let x = 20 + (y % 96 ? 24 : 0); x < 256; x += 48) {ctx.fillStyle = '#f4a3bf'; for (let k = 0; k < 5; k++) {const a = (k / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 0, Math.PI * 2); ctx.fill();} ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();}}
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 220, 256, 36);
  });
}
function floorTexture(kind: number) {
  return canvasTexture(256, 256, ctx => {
    if (kind <= 1) for (let i = 0; i < 8; i++) {ctx.fillStyle = kind === 0 ? (i % 2 ? '#d9a877' : '#cf9c6b') : (i % 2 ? '#8a5f42' : '#7d543a'); ctx.fillRect(0, i * 32, 256, 32); ctx.fillStyle = kind === 0 ? '#b98557' : '#5f3f2b'; ctx.fillRect(((i * 97) % 256), i * 32, 3, 32); ctx.fillRect(0, i * 32, 256, 2);}
    if (kind === 2) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {ctx.fillStyle = (x + y) % 2 ? '#f5efe4' : '#e46a5c'; ctx.fillRect(x * 32, y * 32, 32, 32);}
    if (kind === 3) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {ctx.fillStyle = '#f2ebdc'; ctx.fillRect(x * 64, y * 64, 64, 64); ctx.strokeStyle = '#d9cdb5'; ctx.lineWidth = 3; ctx.strokeRect(x * 64, y * 64, 64, 64);}
    if (kind === 4) {ctx.fillStyle = '#c9b8e6'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 300; i++) ctx.fillRect((i * 53) % 256, (i * 97) % 256, 2, 2);}
  });
}

function Room({night, wallpaperKind = 0, floorKind = 0}: {night: number; wallpaperKind?: number; floorKind?: number}) {
  const wallpaper = useMemo(() => wallpaperTexture(wallpaperKind), [wallpaperKind]);
  wallpaper.wrapS = wallpaper.wrapT = THREE.RepeatWrapping; wallpaper.repeat.set(4, 1.5);
  const floor = useMemo(() => floorTexture(floorKind), [floorKind]);
  floor.wrapS = floor.wrapT = THREE.RepeatWrapping; floor.repeat.set(3, 3);
  const w = ROOM_BOUNDS.maxX - ROOM_BOUNDS.minX, d = ROOM_BOUNDS.maxZ - ROOM_BOUNDS.minZ;
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[w + 1, d + 1]} /><meshToonMaterial map={floor} /></mesh>
    <mesh position={[0, 1.7, ROOM_BOUNDS.minZ - 0.5]}><boxGeometry args={[w + 1, 3.4, 0.2]} /><meshToonMaterial map={wallpaper} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 + 0.5), 1.7, 0]}><boxGeometry args={[0.2, 3.4, d + 1]} /><meshToonMaterial map={wallpaper} /></mesh>)}
    <mesh position={[0, 0.1, ROOM_BOUNDS.minZ - 0.38]}><boxGeometry args={[w + 1, 0.2, 0.06]} /><meshToonMaterial color="#ffffff" /></mesh>
    {[-2.5, 2.5].map(x => <group key={x} position={[x, 1.9, ROOM_BOUNDS.minZ - 0.38]}>
      <mesh><boxGeometry args={[1.5, 1.3, 0.05]} /><meshToonMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0, 0.03]}><boxGeometry args={[1.3, 1.1, 0.02]} /><meshBasicMaterial color={night > 0.5 ? '#33406e' : '#bfe6ff'} /></mesh>
    </group>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROOM_DOOR.x, 0.02, ROOM_DOOR.z + 0.2]}><planeGeometry args={[1.4, 0.9]} /><meshToonMaterial color="#c9a36b" /></mesh>
    <pointLight position={[0, 3, 0]} intensity={night > 0.3 ? 2.4 : 1.2} distance={12} color="#ffe2b8" />
  </>;
}

export function HomeWorld({rt, layout, garden, ownGarden, canEdit, inside, decorating, decor, setDecor, onLayout, players, quality, playerName, night, house = DEFAULT_HOUSE}: {
  rt: Runtime; layout: Layout; garden: Pick<Plot, 'crop' | 'waters' | 'readyAt'>[]; ownGarden: boolean; canEdit: boolean; inside: boolean;
  decorating: boolean; decor: Decor; setDecor: (d: Decor) => void; onLayout: (l: Layout) => void; players: RemotePlayer[]; quality: 'high' | 'low'; playerName?: string; night: number; house?: House;
}) {
  const items = layout.filter(o => o.room === inside);
  // Interaction stations.
  useEffect(() => {
    const ids: string[] = [];
    const add = (id: string, label: string, icon: string, x: number, z: number, run: () => void, radius = 2) => {ids.push(id); rt.targets.set(id, {id, label, icon, x, z, radius, priority: 0.2, run});};
    if (inside) {
      add('room-door', 'Go outside', '🚪', ROOM_DOOR.x, ROOM_DOOR.z, () => rt.goto('home'));
      for (const o of items) {
        const def = FURNITURE_BY_ID[o.assetId];
        if (def?.stove) add(`stove-${o.id}`, 'Cook at the stove', '🍳', o.x, o.z, () => rt.openPanel('cook'), 1.8);
        if (o.assetId === 'coat-rack' || o.assetId === 'bookcase') add(`wardrobe-${o.id}`, 'Change outfit', '👗', o.x, o.z, () => rt.openPanel('wardrobe'), 1.8);
        if (def?.seat) add(`seat-${o.id}`, `Sit on ${def.name}`, '🪑', o.x, o.z, () => {rt.player.pos.set(o.x, 0, o.z); rt.player.angle = o.rotation * Math.PI / 2 + Math.PI; rt.setAnim('sit', 'none', 0, 'relaxed');}, 1.4);
      }
      add('room-mirror', 'Change outfit', '👗', 0, ROOM_BOUNDS.minZ + 0.6, () => rt.openPanel('wardrobe'), 1.6);
    } else {
      add('house-door', 'Go inside', '🏠', HOUSE.doorX, HOUSE.doorZ + 1.2, () => rt.goto('room'));
      add('bus', 'Take the bus to town', '🚌', HOME_STATIONS.busStop.x, HOME_STATIONS.busStop.z, () => rt.goto('town'));
      add('workbench', 'Craft furniture', '🔨', HOME_STATIONS.workbench.x, HOME_STATIONS.workbench.z, () => rt.openPanel('craft'));
      add('mailbox', 'Check the mailbox', '📮', HOME_STATIONS.mailbox.x, HOME_STATIONS.mailbox.z, () => rt.openPanel('mail'));
      const pond = HOME_STATIONS.pond;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const x = pond.x + Math.cos(a) * (pond.rx + 1), z = pond.z + Math.sin(a) * (pond.rz + 1);
        add(`pond-${k}`, 'Fish in your pond', '🎣', x, z, () => void startFishing(rt, 'home', 'pond', {x: pond.x + Math.cos(a) * pond.rx * 0.45, z: pond.z + Math.sin(a) * pond.rz * 0.45}), 1.4);
      }
      for (const o of items) {
        const def = FURNITURE_BY_ID[o.assetId];
        if (def?.seat) add(`seat-${o.id}`, `Sit on ${def.name}`, '🪑', o.x, o.z, () => {rt.player.pos.set(o.x, 0, o.z); rt.player.angle = o.rotation * Math.PI / 2 + Math.PI; rt.setAnim('sit', 'none', 0, 'relaxed');}, 1.4);
      }
    }
    return () => ids.forEach(id => rt.targets.delete(id));
  }, [rt, inside, items]);
  return <>
    {inside ? <Room night={night} wallpaperKind={house.wallpaper} floorKind={house.floor} /> : <Suspense fallback={null}><HomeGround quality={quality} /></Suspense>}
    {!inside && <>
      <Cottage b={houseBuilding(house)} night={night} style={{siding: house.siding, roofStyle: house.roofStyle, windows: house.windows, door: DOOR_COLORS[house.door], porch: house.porch, chimney: house.chimney, flowerBoxes: house.flowerBoxes}} />
      <Plots rt={rt} garden={garden} own={ownGarden} />
      <Mailbox />
      <group position={[HOME_STATIONS.workbench.x, 0, HOME_STATIONS.workbench.z]}>
        <Suspense fallback={null}><Kit model="furniture-kit/table" position={[0, 0, 0]} scale={1.6} /><Kit model="food-kit/cutting-board" position={[0.2, 1.22, 0]} scale={1.4} /></Suspense>
      </group>
      <group position={[HOME_STATIONS.busStop.x, 0, HOME_STATIONS.busStop.z]}>
        <mesh geometry={box} material={toon('#f2c14e')} position={[1.3, 1.3, 0]} scale={[0.12, 2.6, 0.12]} castShadow />
        <mesh position={[1.3, 2.7, 0]} rotation={[Math.PI / 2, 0, 0]} material={toon('#6fb7c9')}><cylinderGeometry args={[0.45, 0.45, 0.08, 18]} /></mesh>
      </group>
    </>}
    <Suspense fallback={null}>
      {items.map(o => <FurniturePiece key={o.id} item={o} selected={decor.selected === o.id} onSelect={decorating && canEdit ? id => setDecor({...decor, selected: id, placing: null, rotation: layout.find(x => x.id === id)?.rotation ?? 0}) : undefined} />)}
      {decorating && canEdit && <Decorator rt={rt} layout={layout} room={inside} decor={decor} setDecor={setDecor} onChange={onLayout} />}
    </Suspense>
    {players.filter(p => !!p.inside === inside).map(p => <Remote key={p.id} p={p} height={flat} />)}
    {!inside && <Bobber rt={rt} waterY={WATER_Y + 0.2} />}
    <Player rt={rt} name={playerName} />
  </>;
}

export function homeWalkable(layout: Layout, inside: boolean) {
  const solid = layout.filter(o => o.room === inside && !['rug-round', 'rug-rect', 'stone-path', 'flowers-yellow', 'flowers-red'].includes(o.assetId));
  return (x: number, z: number) => {
    const b = inside ? ROOM_BOUNDS : HOME_BOUNDS;
    if (x < b.minX + 0.3 || x > b.maxX - 0.3 || z < b.minZ + 0.3 || z > b.maxZ - 0.1) return false;
    if (!inside) {
      if (Math.abs(x - HOUSE.x) < HOUSE.w / 2 + 0.3 && Math.abs(z - HOUSE.z) < HOUSE.d / 2 + 0.3) return false;
      if (homeWaterAt(x, z)) return false;
      if (Math.hypot(x - HOME_STATIONS.mailbox.x, z - HOME_STATIONS.mailbox.z) < 0.5) return false;
      if (Math.abs(x - HOME_STATIONS.workbench.x) < 1.6 && Math.abs(z - HOME_STATIONS.workbench.z) < 0.9) return false;
    }
    for (const o of solid) {
      const [w, d] = footprint(o);
      if (Math.abs(x - o.x) < w / 2 + 0.2 && Math.abs(z - o.z) < d / 2 + 0.2) return false;
    }
    return true;
  };
}
