import {mulberry32} from './rng';
import type {Water} from './items';

/**
 * Willow Common town layout. Pure data + geometry so the browser renders it and
 * the Worker validates positions (fishing water, presence bounds) identically.
 * Axes: +x east, +z south, y up. One unit is roughly one metre.
 */
export interface Vec2 {x: number; z: number}
export interface Building {
  id: string; name: string; x: number; z: number; w: number; d: number;
  /** Facing of the front door. */
  facing: 'north' | 'south' | 'east' | 'west';
  wall: string; roof: string; trim: string; sign?: string; npc?: string; kind: 'shop' | 'cafe' | 'florist' | 'home' | 'hall' | 'cabin';
}
export interface Spot extends Vec2 {id: string}

export const TOWN_BOUNDS = {minX: -46, maxX: 46, minZ: -44, maxZ: 46};
export const PLAZA = {x: 0, z: 0, r: 10};
export const FOUNTAIN = {x: 0, z: 0, r: 2.6};
export const POND = {x: 25, z: 7, rx: 8.5, rz: 6};
export const SEA_Z = 35.5;
export const BEACH_Z = 28;
export const RIVER_WIDTH = 5.2;
export const WATER_Y = -0.25;
export const RIVER: Vec2[] = [
  {x: -40, z: -46}, {x: -33, z: -30}, {x: -27, z: -14}, {x: -29, z: 0}, {x: -31, z: 12}, {x: -24, z: 24}, {x: -16, z: 33}, {x: -12, z: 40},
];
export const BRIDGES = [
  {id: 'north-bridge', x: -27.6, z: -10, rot: 0.1, length: 8, width: 3},
  {id: 'south-bridge', x: -27, z: 19, rot: -0.55, length: 8, width: 3},
];
export const PIER = {x: 12, z0: SEA_Z - 1.5, z1: 46, w: 3.2};

export const BUILDINGS: Building[] = [
  {id: 'store', name: 'General Store', x: -12, z: -14, w: 9, d: 6.5, facing: 'south', wall: '#b9473d', roof: '#3e5d4e', trim: '#ffffff', sign: 'General Store', npc: 'juno', kind: 'shop'},
  {id: 'cafe', name: 'Seaside Café', x: 12.5, z: -14, w: 8.5, d: 6.5, facing: 'south', wall: '#f4efe4', roof: '#4f7f9e', trim: '#ffffff', sign: 'Café Tomo', npc: 'tomo', kind: 'cafe'},
  {id: 'florist', name: 'Petal Florist', x: -16, z: 9, w: 6.5, d: 6, facing: 'east', wall: '#f6c9d4', roof: '#5a8a5e', trim: '#ffffff', sign: 'Petal Florist', npc: 'bea', kind: 'florist'},
  {id: 'hall', name: 'Town Hall', x: 0, z: -24, w: 11, d: 7, facing: 'south', wall: '#efe6d2', roof: '#c4613f', trim: '#ffffff', sign: 'Town Hall', npc: 'odette', kind: 'hall'},
  {id: 'marlo-house', name: "Marlo's Boathouse", x: 22, z: 23, w: 6.5, d: 5.5, facing: 'west', wall: '#b9473d', roof: '#34574a', trim: '#ffffff', kind: 'home'},
  {id: 'pip-house', name: "Pip's Cottage", x: -19, z: -3, w: 5.5, d: 5, facing: 'east', wall: '#f3d58a', roof: '#3e5d4e', trim: '#ffffff', kind: 'home'},
  {id: 'wren-cabin', name: "Wren's Cabin", x: 14, z: -33, w: 6, d: 5, facing: 'south', wall: '#a0704a', roof: '#3e5d4e', trim: '#f6ead3', kind: 'cabin'},
  {id: 'cottage-a', name: 'Cottage', x: 22, z: -5, w: 5.5, d: 5, facing: 'west', wall: '#b9473d', roof: '#3e5d4e', trim: '#ffffff', kind: 'home'},
  {id: 'cottage-b', name: 'Cottage', x: 6, z: 18, w: 5.5, d: 5, facing: 'north', wall: '#cfe3ef', roof: '#c4613f', trim: '#ffffff', kind: 'home'},
];

/** Walkable dirt/stone paths, rendered as ribbons. */
export const PATHS: Vec2[][] = [
  [{x: 0, z: 9}, {x: 0, z: 20}, {x: 4, z: 28}, {x: 12, z: 33}],
  [{x: -9, z: 0}, {x: -18, z: -2}, {x: -24, z: -8}, {x: -32, z: -10}, {x: -40, z: -8}],
  [{x: 9, z: 0}, {x: 18, z: 2}, {x: 18, z: 9}],
  [{x: -6, z: -8}, {x: -12, z: -10.5}],
  [{x: 6, z: -8}, {x: 12.5, z: -10.5}],
  [{x: 0, z: -9}, {x: 0, z: -20}],
  [{x: 0, z: -27}, {x: 6, z: -30}, {x: 14, z: -30}],
  [{x: -6, z: 7}, {x: -12.5, z: 9}],
  [{x: -4, z: 18}, {x: -14, z: 18}, {x: -24, z: 20}, {x: -36, z: 18}],
  [{x: 14, z: 16}, {x: 19, z: 23}],
];

export const HOME_STOP = {x: -7, z: 15};
export const COMMON_GATE = {x: 7, z: 9.5};
export const SPAWN_POINT = {x: 0, z: 12};
export const LAMPS: Vec2[] = [
  {x: 7.5, z: 7.5}, {x: -7.5, z: 7.5}, {x: 7.5, z: -7.5}, {x: -7.5, z: -7.5}, {x: 2, z: 22}, {x: -14, z: 17}, {x: 17, z: 1.5}, {x: -22, z: -6},
];

export const ZONES = {
  meadow: {minX: -46, maxX: -34, minZ: -24, maxZ: 30},
  forest: {minX: -22, maxX: 46, minZ: -44, maxZ: -27},
  beach: {minX: -12, maxX: 46, minZ: BEACH_Z, maxZ: SEA_Z},
};

export function zoneName(x: number, z: number): string {
  if (z > SEA_Z - 0.5) return 'Pier';
  if (z > BEACH_Z) return 'Sunny Beach';
  if (x < -33) return 'Breezy Meadow';
  if (z < -27) return 'Whisper Woods';
  if (Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz) < 1.7) return 'Lily Pond';
  if (Math.hypot(x, z) < 14) return 'Fountain Plaza';
  return 'Willow Common';
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len));
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}
export function distToPolyline(p: Vec2, line: Vec2[]) {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) best = Math.min(best, distToSegment(p, line[i], line[i + 1]));
  return best;
}

/** Top of the arched bridge deck under a point, or null when not on a bridge (matches the Bridge mesh in town.tsx). */
export function bridgeDeckAt(x: number, z: number): number | null {
  for (const b of BRIDGES) {
    // The mesh is rotated by -rot around y, so undo that to get bridge-local coordinates.
    const c = Math.cos(b.rot), s = Math.sin(b.rot);
    const lx = (x - b.x) * c + (z - b.z) * s, lz = -(x - b.x) * s + (z - b.z) * c;
    if (Math.abs(lx) < b.length / 2 && Math.abs(lz) < b.width / 2 - 0.15) {
      const t = Math.min(1, Math.max(0, (lx + b.length / 2 - 0.35) / (b.length - 0.7)));
      return 0.2 + 0.18 + Math.sin(t * Math.PI) * 0.25;
    }
  }
  return null;
}
function onBridge(x: number, z: number) {
  return bridgeDeckAt(x, z) !== null;
}
function onPier(x: number, z: number) {
  return Math.abs(x - PIER.x) < PIER.w / 2 && z > PIER.z0 && z < PIER.z1;
}

export function pondValue(x: number, z: number) {
  return Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz);
}

/** Which water body covers a point, ignoring bridges and the pier deck. */
export function waterAt(x: number, z: number): Water | null {
  if (z > SEA_Z) return 'sea';
  if (pondValue(x, z) < 1) return 'pond';
  if (distToPolyline({x, z}, RIVER) < RIVER_WIDTH / 2) return 'river';
  return null;
}

export function isPathAt(x: number, z: number, width = 1.4) {
  if (Math.hypot(x, z) < PLAZA.r) return true;
  return PATHS.some(path => distToPolyline({x, z}, path) < width);
}

// --- terrain height --------------------------------------------------------
function valueNoise(x: number, z: number) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const h = (a: number, b: number) => {const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s);};
  const fx = x - xi, fz = z - zi;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}
const smooth = (edge0: number, edge1: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Height is sampled from a cached grid (bilinear) — exact evaluation is far too slow per frame.
const GRID = 0.5;
const GX0 = TOWN_BOUNDS.minX - 4, GZ0 = TOWN_BOUNDS.minZ - 4;
const GW = Math.ceil((TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX + 8) / GRID) + 1;
const GD = Math.ceil((TOWN_BOUNDS.maxZ - TOWN_BOUNDS.minZ + 40) / GRID) + 1;
let grid: Float32Array | null = null;
function buildGrid() {
  const g = new Float32Array(GW * GD);
  for (let j = 0; j < GD; j++) for (let i = 0; i < GW; i++) g[j * GW + i] = exactHeight(GX0 + i * GRID, GZ0 + j * GRID);
  return g;
}
/** Gentle rolling hills away from town, banks sloping into water. */
export function heightAt(x: number, z: number): number {
  const deck = bridgeDeckAt(x, z);
  if (deck !== null) return deck;
  if (onPier(x, z)) return 0.55;
  grid ??= buildGrid();
  const fx = (x - GX0) / GRID, fz = (z - GZ0) / GRID;
  const i = Math.floor(fx), j = Math.floor(fz);
  if (i < 0 || j < 0 || i >= GW - 1 || j >= GD - 1) return exactHeight(x, z);
  const tx = fx - i, tz = fz - j;
  const a = grid[j * GW + i], b = grid[j * GW + i + 1], c = grid[(j + 1) * GW + i], d = grid[(j + 1) * GW + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}
function exactHeight(x: number, z: number): number {
  const townCalm = smooth(14, 30, Math.hypot(x * 0.9, z));
  let h = (valueNoise(x * 0.07, z * 0.07) - 0.45) * 2.4 * townCalm;
  h += smooth(-26, -40, z) * 1.6; // forest rises to the north
  h = Math.max(h, 0.04); // dry land never dips under the water line (no stray puddles)
  // Water basins.
  const pond = pondValue(x, z);
  const river = distToPolyline({x, z}, RIVER) / (RIVER_WIDTH / 2);
  const shore = Math.min(pond, river);
  const bank = smooth(1.0, 1.9, shore);
  h = h * bank + (-0.9) * (1 - smooth(0.55, 1.0, shore)) * 1;
  if (shore < 1.0) h = Math.min(h, -0.9 + shore * 0.55);
  // Beach slopes down into the sea.
  if (z > BEACH_Z - 4) {
    const t = smooth(BEACH_Z - 4, BEACH_Z + 1, z);
    h = h * (1 - t) + 0.08 * t;
    const s = smooth(SEA_Z - 1.2, SEA_Z + 2.5, z);
    h = h * (1 - s) - 1.2 * s;
  }
  if (isPathAt(x, z, 1.2)) h *= 0.6;
  return Math.max(-1.4, h);
}

// --- static colliders ------------------------------------------------------
export interface Collider {x: number; z: number; r?: number; w?: number; d?: number}

function scatterTrees(): {x: number; z: number; s: number; kind: 'round' | 'pine' | 'blossom' | 'fruit'}[] {
  const random = mulberry32(73);
  const out: {x: number; z: number; s: number; kind: 'round' | 'pine' | 'blossom' | 'fruit'}[] = [];
  const blocked = (x: number, z: number) =>
    waterAt(x, z) !== null || distToPolyline({x, z}, RIVER) < RIVER_WIDTH / 2 + 1.6 || pondValue(x, z) < 1.25 ||
    isPathAt(x, z, 2.6) || z > BEACH_Z - 1 || Math.hypot(x, z) < PLAZA.r + 3 ||
    BUILDINGS.some(b => Math.abs(x - b.x) < b.w / 2 + 2.5 && Math.abs(z - b.z) < b.d / 2 + 3.2) ||
    Math.hypot(x - HOME_STOP.x, z - HOME_STOP.z) < 3 || Math.hypot(x - COMMON_GATE.x, z - COMMON_GATE.z) < 3;
  let attempts = 0;
  while (out.length < 230 && attempts < 9000) {
    attempts++;
    const x = TOWN_BOUNDS.minX + 2 + random() * (TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX - 4);
    const z = TOWN_BOUNDS.minZ + 2 + random() * (TOWN_BOUNDS.maxZ - TOWN_BOUNDS.minZ - 4);
    const inForest = z < -26;
    const inMeadow = x < -34;
    const density = inForest ? 1 : inMeadow ? 0.18 : 0.35;
    if (random() > density) continue;
    if (blocked(x, z)) continue;
    if (out.some(t => Math.hypot(t.x - x, t.z - z) < (inForest ? 3.4 : 5))) continue;
    const roll = random();
    const kind = inForest ? (roll < 0.45 ? 'pine' : 'round') : roll < 0.22 ? 'blossom' : roll < 0.42 ? 'fruit' : 'round';
    out.push({x, z, s: 0.85 + random() * 0.55, kind});
  }
  return out;
}
export const TREES = scatterTrees();

export const STATIC_COLLIDERS: Collider[] = [
  ...BUILDINGS.map(b => ({x: b.x, z: b.z, w: b.w + 0.4, d: b.d + 0.4})),
  ...TREES.map(t => ({x: t.x, z: t.z, r: 0.55 * t.s})),
  {x: FOUNTAIN.x, z: FOUNTAIN.z, r: FOUNTAIN.r + 0.3},
  ...LAMPS.map(l => ({x: l.x, z: l.z, r: 0.3})),
];

export function blockedByCollider(x: number, z: number, colliders: Collider[], radius = 0.35) {
  for (const c of colliders) {
    if (c.r !== undefined) {
      if (Math.hypot(x - c.x, z - c.z) < c.r + radius) return true;
    } else if (c.w !== undefined && c.d !== undefined) {
      if (Math.abs(x - c.x) < c.w / 2 + radius && Math.abs(z - c.z) < c.d / 2 + radius) return true;
    }
  }
  return false;
}

export function townWalkable(x: number, z: number) {
  if (x < TOWN_BOUNDS.minX || x > TOWN_BOUNDS.maxX || z < TOWN_BOUNDS.minZ || z > TOWN_BOUNDS.maxZ) return false;
  if (onBridge(x, z) || onPier(x, z)) return true;
  if (waterAt(x, z)) return false;
  if (pondValue(x, z) < 1.04) return false;
  if (distToPolyline({x, z}, RIVER) < RIVER_WIDTH / 2 + 0.15) return false;
  return !blockedByCollider(x, z, STATIC_COLLIDERS);
}

/** Point the bobber lands on when casting from a position and facing angle. */
export function castTarget(x: number, z: number, angle: number, distance = 3.4): Vec2 {
  return {x: x + Math.sin(angle) * distance, z: z + Math.cos(angle) * distance};
}

/** Water the player can fish from where they stand, if any. */
export function fishableFrom(x: number, z: number, angle: number): {water: Water; target: Vec2} | null {
  for (const d of [3.4, 2.6, 4.2]) {
    const target = castTarget(x, z, angle, d);
    const water = waterAt(target.x, target.z);
    if (water) return {water, target};
  }
  return null;
}

// --- spawn points ----------------------------------------------------------
function rectPoints(seed: number, rect: {minX: number; maxX: number; minZ: number; maxZ: number}, n: number, accept: (x: number, z: number) => boolean) {
  const random = mulberry32(seed);
  const points: Vec2[] = [];
  let tries = 0;
  while (points.length < n && tries < n * 60) {
    tries++;
    const x = rect.minX + random() * (rect.maxX - rect.minX);
    const z = rect.minZ + random() * (rect.maxZ - rect.minZ);
    if (accept(x, z) && !points.some(p => Math.hypot(p.x - x, p.z - z) < 2.2)) points.push({x, z});
  }
  return points;
}
const dry = (x: number, z: number) => townWalkable(x, z);

export const FLOWER_BEDS: Vec2[] = [
  {x: -11, z: 6}, {x: -11, z: 12}, {x: -20, z: 13}, {x: 5, z: 5}, {x: -5, z: -5}, {x: 5, z: -5}, {x: -5, z: 5},
  ...rectPoints(11, ZONES.meadow, 14, dry),
];

export const SPAWNS: Record<'meadow' | 'flowers' | 'trees' | 'water' | 'beach' | 'forest' | 'plaza' | 'lamps', Spot[]> = {
  meadow: rectPoints(21, ZONES.meadow, 22, dry).map((p, i) => ({...p, id: `meadow-${i}`})),
  flowers: FLOWER_BEDS.map((p, i) => ({x: p.x + 0.6, z: p.z + 0.4, id: `flowers-${i}`})),
  trees: TREES.filter(t => t.z > -26).slice(0, 40).map((t, i) => ({x: t.x, z: t.z + 0.75, id: `trees-${i}`})),
  water: [
    ...Array.from({length: 10}, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return {x: POND.x + Math.cos(a) * (POND.rx + 1.4), z: POND.z + Math.sin(a) * (POND.rz + 1.4), id: `pond-${i}`};
    }),
    ...RIVER.slice(1, -1).map((p, i) => ({x: p.x + 3.8, z: p.z, id: `river-${i}`})),
  ].filter(p => dry(p.x, p.z)),
  beach: rectPoints(31, {minX: -8, maxX: 44, minZ: BEACH_Z + 0.5, maxZ: SEA_Z - 1}, 18, dry).map((p, i) => ({...p, id: `beach-${i}`})),
  forest: rectPoints(41, ZONES.forest, 26, dry).map((p, i) => ({...p, id: `forest-${i}`})),
  plaza: Array.from({length: 10}, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    return {x: Math.cos(a) * 5.5, z: Math.sin(a) * 5.5, id: `plaza-${i}`};
  }),
  lamps: LAMPS.map((l, i) => ({x: l.x, z: l.z, id: `lamps-${i}`})),
};

export const FORAGE_NODES: (Spot & {item: string})[] = [
  ...rectPoints(51, ZONES.forest, 16, dry).map((p, i) => ({...p, id: `forage-mushroom-${i}`, item: 'mushroom'})),
  ...rectPoints(52, {minX: -46, maxX: -20, minZ: -26, maxZ: 26}, 12, dry).map((p, i) => ({...p, id: `forage-berry-${i}`, item: 'wild-berry'})),
  ...TREES.filter(t => t.kind === 'fruit').slice(0, 14).map((t, i) => ({x: t.x + 0.9, z: t.z + 0.9, id: `forage-apple-${i}`, item: 'apple'})),
  ...rectPoints(53, ZONES.meadow, 12, dry).map((p, i) => ({...p, id: `forage-flower-${i}`, item: 'wildflower'})),
  ...rectPoints(54, {minX: -8, maxX: 44, minZ: BEACH_Z + 0.5, maxZ: SEA_Z - 0.8}, 14, dry).map((p, i) => ({...p, id: `forage-shell-${i}`, item: 'seashell'})),
  ...rectPoints(55, {minX: -40, maxX: 40, minZ: -40, maxZ: 26}, 18, (x, z) => dry(x, z) && !isPathAt(x, z, 2)).map((p, i) => ({...p, id: `forage-wood-${i}`, item: 'wood'})),
  ...rectPoints(56, {minX: -40, maxX: 40, minZ: -40, maxZ: 26}, 14, (x, z) => dry(x, z) && (distToPolyline({x, z}, RIVER) < 8 || pondValue(x, z) < 2)).map((p, i) => ({...p, id: `forage-stone-${i}`, item: 'stone'})),
];
export const FORAGE_BY_ID = Object.fromEntries(FORAGE_NODES.map(n => [n.id, n]));

// --- Habitat (personal home) -------------------------------------------------
export const HOME_BOUNDS = {minX: -17, maxX: 17, minZ: -13, maxZ: 15};
/** Reserved cottage area (the largest size). The front door always sits on doorZ. */
export const HOUSE = {x: 0, z: -6.85, w: 11, d: 8.2, doorX: 0, doorZ: -2.75};
/** Furniture area inside the cottage, in room-local coordinates (centre of the cottage = 0,0). */
export const ROOM_BOUNDS = {minX: -4, maxX: 4, minZ: -3, maxZ: 3};
export const PLOT_SIZE = 1.7;
export function plotPosition(index: number): Vec2 {
  const col = index % 4, row = Math.floor(index / 4);
  return {x: -12.2 + col * (PLOT_SIZE + 0.35), z: 2.8 + row * (PLOT_SIZE + 0.35)};
}
export const HOME_STATIONS = {
  workbench: {x: 9, z: 2.5},
  mailbox: {x: 3.2, z: -1.2},
  busStop: {x: 0, z: 13},
  pond: {x: 11.5, z: 9.5, rx: 3.6, rz: 2.6},
};
export function homeWaterAt(x: number, z: number): Water | null {
  const p = HOME_STATIONS.pond;
  return Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz) < 1 ? 'pond' : null;
}
