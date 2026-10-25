import {HOUSE} from './map';
import {HOUSE_SIZES} from './house';

/** The walk-in cottage: one continuous space with the yard, no separate room scene. */
export const FLOOR_Y = 0.36;
export const WALL_T = 0.2;
export const DOOR_W = 1.3;

/** World rectangle of the cottage for a house size (front door fixed on HOUSE.doorZ). */
export function cottageRect(size = 0) {
  const s = HOUSE_SIZES[size] ?? HOUSE_SIZES[0];
  return {x: HOUSE.x, z: HOUSE.doorZ - s.d / 2, w: s.w, d: s.d};
}

/** Room-local furniture coordinates are centred on the cottage. */
export function roomOrigin(size = 0) {
  const r = cottageRect(size);
  return {x: r.x, z: r.z};
}

/** Inside the walls (the doorway counts as inside once past the threshold). */
export function insideCottage(x: number, z: number, size = 0, margin = 0) {
  const r = cottageRect(size);
  return Math.abs(x - r.x) < r.w / 2 - WALL_T - margin && Math.abs(z - r.z) < r.d / 2 - WALL_T - margin;
}

/** Walkable test for the cottage shell: interior and doorway are open, the walls are solid. */
export function cottageWalkable(x: number, z: number, size = 0) {
  const r = cottageRect(size);
  const dx = Math.abs(x - r.x), dz = z - r.z;
  if (dx > r.w / 2 + 0.3 || Math.abs(dz) > r.d / 2 + 0.3) return true; // outside the footprint
  if (dx < r.w / 2 - WALL_T - 0.25 && Math.abs(dz) < r.d / 2 - WALL_T - 0.25) return true; // living room
  return dx < DOOR_W / 2 - 0.22 && dz > r.d / 2 - WALL_T - 0.4; // through the front door
}

/** Ground height: the cottage floor and porch are raised, with a short step down to the path. */
export function homeHeight(x: number, z: number, size = 0, porch = true) {
  const r = cottageRect(size);
  const dx = Math.abs(x - r.x), front = z - (r.z + r.d / 2);
  if (dx < r.w / 2 + 0.15 && front < 0.15 && front > -r.d - 0.15) return FLOOR_Y;
  const deck = porch ? 2.0 : 0.15, width = porch ? 1.75 : 0.85;
  if (dx < width && front >= 0 && front < deck) return FLOOR_Y;
  if (dx < width && front >= deck && front < deck + 0.8) return FLOOR_Y * (1 - (front - deck) / 0.8);
  return 0;
}
