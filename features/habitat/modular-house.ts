import {z} from 'zod';
import type {WorldObject, WorldState} from './types';

export const HOUSE_ASSET_ID = 'habitat-house';
export const HOUSE_DOOR_ASSET_ID = 'habitat-house-door';
export const HOUSE_WINDOW_ASSET_ID = 'habitat-house-window';
export const HOUSE_ORIGIN = Object.freeze({x: 0, z: -3.5});
export const HOUSE_CELL_SIZE = 3;
export const HOUSE_WALL_HEIGHT = 2.8;
export const HOUSE_WALL_THICKNESS = .18;
export const HOUSE_DOOR_WIDTH = 1.5;
export const HOUSE_DOOR_HEIGHT = 2.3;
export const HOUSE_DOOR_THICKNESS = .10;
export const HOUSE_WINDOW_WIDTH = 1.4;
export const HOUSE_WINDOW_SILL = 1;
export const HOUSE_WINDOW_HEIGHT = 1.05;
export const HOUSE_AVATAR_RADIUS = .28;

const cellSchema = z.object({x: z.number().int().min(-1).max(1), z: z.number().int().min(-1).max(1)}).strict();
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color');
export const houseSchema = z.object({
  version: z.literal(1),
  cells: z.array(cellSchema).min(1).max(9),
  wallColor: colorSchema,
  roofColor: colorSchema,
  floorColor: colorSchema,
  roofStyle: z.enum(['gable', 'flat']),
  wallFinish: z.enum(['plaster', 'timber']),
  floorFinish: z.enum(['wood', 'tile']),
}).strict().superRefine((house, ctx) => {
  const keys = new Set(house.cells.map(cellKey));
  if (keys.size !== house.cells.length) ctx.addIssue({code: 'custom', path: ['cells'], message: 'House cells must be unique'});
  if (!house.cells.length) return;
  const visited = new Set<string>();
  const pending = [house.cells[0]];
  while (pending.length) {
    const cell = pending.pop()!;
    const key = cellKey(cell);
    if (visited.has(key)) continue;
    visited.add(key);
    for (const side of SIDES) {
      const next = {x: cell.x + side.dx, z: cell.z + side.dz};
      if (keys.has(cellKey(next)) && !visited.has(cellKey(next))) pending.push(next);
    }
  }
  if (visited.size !== keys.size) ctx.addIssue({code: 'custom', path: ['cells'], message: 'House cells must be orthogonally connected'});
});
export type HouseConfig = z.infer<typeof houseSchema>;
export type HouseCell = HouseConfig['cells'][number];
export type HouseSide = 'north' | 'south' | 'east' | 'west';
export type HouseOpeningKind = 'wall' | 'door' | 'window';
export interface HouseEdge {
  id: string;
  cell: HouseCell;
  side: HouseSide;
  x: number;
  z: number;
  width: number;
  /** Three.js Y rotation: local width is X, local outward normal is +Z. */
  rotation: number;
}
export interface HouseOpening {
  edgeId: string;
  kind: Exclude<HouseOpeningKind, 'wall'>;
  /** Absent only for the legacy fallback arch: do not render a use button. */
  object?: WorldObject;
}
export interface HouseBox {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotation: number;
}
const SIDES: readonly {side: HouseSide; dx: number; dz: number; rotation: number}[] = [
  {side: 'north', dx: 0, dz: -1, rotation: Math.PI},
  {side: 'south', dx: 0, dz: 1, rotation: 0},
  {side: 'east', dx: 1, dz: 0, rotation: Math.PI / 2},
  {side: 'west', dx: -1, dz: 0, rotation: -Math.PI / 2},
];
function cellKey(cell: HouseCell) { return `${cell.x},${cell.z}`; }

/** Spacious 9 x 6 m starter home; six modules share a continuous walkable floor. */
export const DEFAULT_HOUSE: HouseConfig = {
  version: 1, cells: [{x:-1,z:0},{x:0,z:0},{x:1,z:0},{x:-1,z:1},{x:0,z:1},{x:1,z:1}],
  wallColor: '#eddfc5', roofColor: '#926b59', floorColor: '#b78e68',
  roofStyle: 'gable', wallFinish: 'plaster', floorFinish: 'wood',
};
// Prevent accidental global mutation of the legacy fallback, including its nested cells.
DEFAULT_HOUSE.cells.forEach(Object.freeze);
Object.freeze(DEFAULT_HOUSE.cells);
Object.freeze(DEFAULT_HOUSE);

export function getHouseEdges(config: HouseConfig): HouseEdge[] {
  const occupied = new Set(config.cells.map(cellKey));
  return [...config.cells].sort((a, b) => a.z - b.z || a.x - b.x).flatMap(cell => SIDES
    .filter(({dx, dz}) => !occupied.has(cellKey({x: cell.x + dx, z: cell.z + dz})))
    .map(({side, dx, dz, rotation}) => ({
      id: `${cell.x},${cell.z},${side}`, cell: {...cell}, side,
      x: HOUSE_ORIGIN.x + (cell.x + dx / 2) * HOUSE_CELL_SIZE,
      z: HOUSE_ORIGIN.z + (cell.z + dz / 2) * HOUSE_CELL_SIZE,
      width: HOUSE_CELL_SIZE, rotation,
    })));
}

/** All reserved structural IDs, not just the anchor. Never resolve through the furniture catalog. */
export function isHouseObject(object: Pick<WorldObject, 'assetId'>): boolean {
  return [HOUSE_ASSET_ID, HOUSE_DOOR_ASSET_ID, HOUSE_WINDOW_ASSET_ID].includes(object.assetId);
}
export function getHouseAnchor(objects: readonly WorldObject[]): WorldObject | undefined {
  return objects.find(object => object.assetId === HOUSE_ASSET_ID);
}
export function getHouseConfig(objects: readonly WorldObject[]): HouseConfig {
  return getHouseAnchor(objects)?.house ?? DEFAULT_HOUSE;
}
function defaultOpenings(config: HouseConfig): {edgeId: string; kind: 'door' | 'window'}[] {
  const edges = getHouseEdges(config);
  // Frontmost south edge, then the edge nearest the central path.
  const front = edges.filter(edge => edge.side === 'south').sort((a, b) => b.z - a.z || Math.abs(a.x) - Math.abs(b.x) || a.x - b.x)[0]!;
  const windows = (['west', 'east'] as const).map(side => edges.find(edge => edge.side === side)!);
  return [{edgeId: front.id, kind: 'door'}, ...windows.map(edge => ({edgeId: edge.id, kind: 'window' as const}))];
}
export function getHouseOpenings(objects: readonly WorldObject[]): HouseOpening[] {
  if (!getHouseAnchor(objects)) {
    // A permanent open arch, not a fabricated interactive object.
    return defaultOpenings(DEFAULT_HOUSE).filter(opening => opening.kind === 'door');
  }
  const edges = new Set(getHouseEdges(getHouseConfig(objects)).map(edge => edge.id));
  return objects.filter(object => (object.assetId === HOUSE_DOOR_ASSET_ID || object.assetId === HOUSE_WINDOW_ASSET_ID) && edges.has(object.target))
    .map(object => ({edgeId: object.target, kind: object.assetId === HOUSE_DOOR_ASSET_ID ? 'door' : 'window', object}));
}
function makeOpening(edge: HouseEdge, kind: 'door' | 'window', previous?: WorldObject): WorldObject {
  return {id: previous?.id ?? crypto.randomUUID(), assetId: kind === 'door' ? HOUSE_DOOR_ASSET_ID : HOUSE_WINDOW_ASSET_ID,
    name: kind === 'door' ? 'House door' : 'House window', x: edge.x, y: 0, z: edge.z,
    rotation: edge.rotation, scale: 1, behavior: 'door', target: edge.id};
}
function assertBudget(objects: WorldObject[]): WorldObject[] {
  if (objects.length > 120) throw new Error('House would exceed the 120 object limit');
  return objects;
}
export function replaceHouse(objects: readonly WorldObject[], config: HouseConfig): WorldObject[] {
  const house = houseSchema.parse(config);
  const previous = getHouseAnchor(objects);
  const anchor: WorldObject = {...previous, id: previous?.id ?? crypto.randomUUID(), assetId: HOUSE_ASSET_ID,
    name: previous?.name ?? 'My house', x: HOUSE_ORIGIN.x, y: 0, z: HOUSE_ORIGIN.z,
    rotation: 0, scale: 1, behavior: 'decoration', target: '', house};
  const edges = getHouseEdges(house);
  const wanted: HouseOpening[] = previous ? getHouseOpenings(objects) : defaultOpenings(house);
  const openings = wanted.flatMap(opening => {
    const edge = edges.find(edge => edge.id === opening.edgeId);
    return edge ? [makeOpening(edge, opening.kind, 'object' in opening ? opening.object : undefined)] : [];
  });
  // Keep furniture objects verbatim (including their IDs, targets, and ordering).
  return assertBudget([...objects.filter(object => !isHouseObject(object)), anchor, ...openings]);
}
export function setHouseOpening(objects: readonly WorldObject[], edgeId: string, kind: HouseOpeningKind): WorldObject[] {
  if (!['wall', 'door', 'window'].includes(kind)) throw new Error('Invalid house opening kind');
  const edge = getHouseEdges(getHouseConfig(objects)).find(edge => edge.id === edgeId);
  if (!edge) throw new Error('Opening must target an exterior house edge');
  const upgraded = getHouseAnchor(objects) ? [...objects] : replaceHouse(objects, DEFAULT_HOUSE);
  const previous = upgraded.find(object => isHouseObject(object) && object.target === edgeId);
  const rest = upgraded.filter(object => !(isHouseObject(object) && object.target === edgeId));
  return assertBudget(kind === 'wall' ? rest : [...rest, makeOpening(edge, kind, previous)]);
}

/** Exact shared renderer/collision boxes. Floors meet at cell seams; only exterior edges have walls. */
export function getHouseWallSegments(edge: HouseEdge, kind: HouseOpeningKind = 'wall'): HouseBox[] {
  function box(offset: number, width: number, bottom: number, height: number): HouseBox {
    return {x: edge.x + Math.cos(edge.rotation) * offset, z: edge.z - Math.sin(edge.rotation) * offset,
      y: bottom + height / 2, width, height, depth: HOUSE_WALL_THICKNESS, rotation: edge.rotation};
  }
  if (kind === 'wall') return [box(0, edge.width, 0, HOUSE_WALL_HEIGHT)];
  const width = kind === 'door' ? HOUSE_DOOR_WIDTH : HOUSE_WINDOW_WIDTH;
  const sideWidth = (edge.width - width) / 2;
  const segments = [box(-(width + sideWidth) / 2, sideWidth, 0, HOUSE_WALL_HEIGHT), box((width + sideWidth) / 2, sideWidth, 0, HOUSE_WALL_HEIGHT)];
  const top = kind === 'door' ? HOUSE_DOOR_HEIGHT : HOUSE_WINDOW_SILL + HOUSE_WINDOW_HEIGHT;
  segments.push(box(0, width, top, HOUSE_WALL_HEIGHT - top));
  if (kind === 'window') segments.push(box(0, width, 0, HOUSE_WINDOW_SILL));
  return segments;
}
/** Hinge at local -X; active leaves swing outward through 90 degrees, not disappear. */
export function getHouseDoorLeaf(edge: HouseEdge, active: boolean): HouseBox {
  const rotation = edge.rotation - (active ? Math.PI / 2 : 0);
  return {
    x: edge.x - Math.cos(edge.rotation) * HOUSE_DOOR_WIDTH / 2 + Math.cos(rotation) * HOUSE_DOOR_WIDTH / 2,
    z: edge.z + Math.sin(edge.rotation) * HOUSE_DOOR_WIDTH / 2 - Math.sin(rotation) * HOUSE_DOOR_WIDTH / 2,
    y: HOUSE_DOOR_HEIGHT / 2, width: HOUSE_DOOR_WIDTH, height: HOUSE_DOOR_HEIGHT,
    depth: HOUSE_DOOR_THICKNESS, rotation,
  };
}
function boxBlocksAt(x: number, z: number, box: HouseBox): boolean {
  if (box.y - box.height / 2 >= 1.7 || box.y + box.height / 2 <= .3) return false;
  const dx = x - box.x, dz = z - box.z;
  const localX = dx * Math.cos(box.rotation) - dz * Math.sin(box.rotation);
  const localZ = dx * Math.sin(box.rotation) + dz * Math.cos(box.rotation);
  // Match the conservative radius expansion used by collideWorld.
  return Math.abs(localX) < box.width / 2 + HOUSE_AVATAR_RADIUS && Math.abs(localZ) < box.depth / 2 + HOUSE_AVATAR_RADIUS;
}
export function houseBlocksAt(x: number, z: number, objects: readonly WorldObject[], states: WorldState['states']): boolean {
  const openings = new Map(getHouseOpenings(objects).map(opening => [opening.edgeId, opening]));
  return getHouseEdges(getHouseConfig(objects)).some(edge => {
    const opening = openings.get(edge.id);
    if (getHouseWallSegments(edge, opening?.kind).some(box => boxBlocksAt(x, z, box))) return true;
    return opening?.kind === 'door' && opening.object !== undefined && boxBlocksAt(x, z, getHouseDoorLeaf(edge, !!states[opening.object.id]?.active));
  });
}

/** Cross-object invariants; imported by layoutSchema, with no runtime import of types.ts. */
export function validateHouseLayout(objects: readonly WorldObject[], ctx: z.RefinementCtx): void {
  const anchors = objects.filter(object => object.assetId === HOUSE_ASSET_ID);
  const fail = (index: number, message: string) => ctx.addIssue({code: 'custom', path: [index], message});
  if (anchors.length > 1) fail(objects.indexOf(anchors[1]), 'Only one house anchor is allowed');
  const anchor = anchors[0];
  const edges = new Map(getHouseEdges(anchor?.house ?? DEFAULT_HOUSE).map(edge => [edge.id, edge]));
  const used = new Set<string>();
  objects.forEach((object, index) => {
    if (object.house && object.assetId !== HOUSE_ASSET_ID) fail(index, 'House config belongs only on a house anchor');
    if (!isHouseObject(object)) return;
    if (object.assetId === HOUSE_ASSET_ID) {
      if (!object.house) fail(index, 'House anchor requires a house config');
      if (object.x !== HOUSE_ORIGIN.x || object.z !== HOUSE_ORIGIN.z || object.y !== 0 || object.rotation !== 0 || object.scale !== 1 || object.behavior !== 'decoration' || object.target !== '') fail(index, 'House anchor transform and behavior are fixed');
      return;
    }
    if (!anchor) fail(index, 'House opening requires a house anchor');
    const edge = edges.get(object.target);
    if (!edge) fail(index, 'House opening must target an exterior edge');
    if (used.has(object.target)) fail(index, 'Duplicate house opening edge');
    used.add(object.target);
    if (object.behavior !== 'door' || object.scale !== 1 || object.y !== 0 || (edge && (object.x !== edge.x || object.z !== edge.z || object.rotation !== edge.rotation))) fail(index, 'House opening transform and behavior must match its edge');
  });
}
