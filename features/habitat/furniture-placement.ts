import {Box3, Ray, Vector3} from 'three';
import {findDecorSurface} from './decor-surfaces';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {
  getHouseConfig, getHouseDoorLeaf, getHouseEdges, getHouseOpenings,
  getHouseWallSegments, isHouseObject, type HouseBox,
} from './modular-house';
import {worldObjectSchema, type WorldObject, type WorldState} from './types';

export type PlacementPreview = {object: WorldObject; valid: boolean; reason: string; visible: boolean};

/** Local dimensions after Stage.Imported's center/bottom normalization, before object.scale. */
export function getFurniturePlacementBounds(object: WorldObject): [number, number, number] {
  const asset = getBuildAsset(object.assetId);
  if (asset) return [...asset.bounds];
  // Match Stage's built-in proxy meshes when no imported asset is available.
  if (object.behavior === 'door') return [1, 2, .16];
  if (object.behavior === 'seat') return [1, .55, .7];
  if (object.behavior === 'portal') return [1.76, 1.76, .16];
  return [1, .6, 1];
}

function furnitureBox(object: WorldObject, states: WorldState['states']): HouseBox {
  const [width, height, depth] = getFurniturePlacementBounds(object).map(value => value * object.scale);
  return {x: object.x, y: object.y + height / 2, z: object.z, width, height, depth,
    rotation: object.rotation + (object.behavior === 'door' && states[object.id]?.active ? Math.PI / 2 : 0)};
}

/** SAT on the four horizontal OBB axes, plus the vertical interval. No avatar padding. */
function boxesOverlap(a: HouseBox, b: HouseBox): boolean {
  const epsilon = 1e-7;
  if (Math.abs(a.y - b.y) >= (a.height + b.height) / 2 - epsilon) return false;
  const axes = (box: HouseBox) => [
    [Math.cos(box.rotation), -Math.sin(box.rotation)],
    [Math.sin(box.rotation), Math.cos(box.rotation)],
  ];
  const [ax, az] = axes(a), [bx, bz] = axes(b);
  const dot = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1];
  const delta = [b.x - a.x, b.z - a.z];
  return [ax, az, bx, bz].every(axis => {
    const radiusA = a.width / 2 * Math.abs(dot(ax, axis)) + a.depth / 2 * Math.abs(dot(az, axis));
    const radiusB = b.width / 2 * Math.abs(dot(bx, axis)) + b.depth / 2 * Math.abs(dot(bz, axis));
    return Math.abs(dot(delta, axis)) < radiusA + radiusB - epsilon;
  });
}

/** All and only shared renderer wall segments and physical door leaves. Roof/floor are not blockers. */
function houseBoxes(objects: readonly WorldObject[], states: WorldState['states']): HouseBox[] {
  const openings = new Map(getHouseOpenings(objects).map(opening => [opening.edgeId, opening]));
  return getHouseEdges(getHouseConfig(objects)).flatMap(edge => {
    const opening = openings.get(edge.id);
    const boxes = getHouseWallSegments(edge, opening?.kind);
    if (opening?.kind === 'door' && opening.object) {
      boxes.push(getHouseDoorLeaf(edge, !!states[opening.object.id]?.active));
    }
    return boxes;
  });
}

function rayBlocked(ray: Ray, distance: number, box: HouseBox): boolean {
  const c = Math.cos(box.rotation), s = Math.sin(box.rotation);
  const toLocal = (v: Vector3) => new Vector3(v.x * c - v.z * s, v.y, v.x * s + v.z * c);
  const origin = toLocal(ray.origin.clone().sub(new Vector3(box.x, box.y, box.z)));
  const localRay = new Ray(origin, toLocal(ray.direction));
  const half = new Vector3(box.width / 2, box.height / 2, box.depth / 2);
  const bounds = new Box3(half.clone().negate(), half);
  // Ray.intersectBox returns the exit when the camera starts inside a wall. Block that too.
  if (bounds.containsPoint(origin)) return true;
  const hit = localRay.intersectBox(bounds, new Vector3());
  return hit !== null && hit.distanceTo(origin) < distance - 1e-7;
}

const insideWorld = (x: number, z: number) => x >= -14 && x <= 14 && z >= -8 && z <= 12;
const snap = (value: number) => Math.round(value * 4) / 4 || 0;

/**
 * Pure world-space camera-center ray → ground placement. Never clamps an invalid target.
 * visible=false means no usable finite floor hit (hide stale geometry, keep invalid UI).
 * Coordinates follow worldObjectSchema's center bounds; the footprint follows catalog bounds.
 */
export function getFurniturePlacementPreview(
  ray: Ray, object: WorldObject, objects: readonly WorldObject[], states: WorldState['states'],
): PlacementPreview {
  const invalid = (reason: string, target = object, visible = false): PlacementPreview =>
    ({object: {...target}, valid: false, reason, visible});
  if (![...ray.origin.toArray(), ...ray.direction.toArray()].every(Number.isFinite)
    || ray.origin.y <= 0 || ray.direction.lengthSq() === 0) {
    return invalid('Arahkan kamera ke lantai di depan Anda.');
  }
  const normalized = new Ray(ray.origin.clone(), ray.direction.clone().normalize());
  if (normalized.direction.y >= -1e-8) return invalid('Arahkan kamera ke lantai, bukan ke langit.');
  const surface = findDecorSurface(normalized, object, objects);
  const distance = surface?.distance ?? -normalized.origin.y / normalized.direction.y;
  if (!Number.isFinite(distance) || distance <= 0 || distance > 25) {
    return invalid('Lantai terlalu jauh. Dekatkan kamera (maksimal 25 meter).');
  }
  const hit = normalized.at(distance, new Vector3());
  const target = {...object, x: surface?.x ?? snap(hit.x), y: surface?.y ?? 0, z: surface?.z ?? snap(hit.z)};
  // Check the unsnapped hit as well: rounding 14.01 down to 14 must not accept an outside aim.
  if (!insideWorld(hit.x, hit.z) || !insideWorld(target.x, target.z)) {
    return invalid('Posisi berada di luar batas area bangun.', target, true);
  }
  if (isHouseObject(target)) return invalid('Pilih furnitur; rumah diatur melalui editor rumah.', target);
  if (!worldObjectSchema.safeParse(target).success) {
    return invalid('Ukuran atau rotasi furnitur tidak valid. Gunakan skala 0,25–4.', target);
  }
  const footprint = furnitureBox(target, states);
  const walls = houseBoxes(objects, states);
  if (walls.some(box => boxesOverlap(footprint, box))) {
    return invalid('Furnitur bertabrakan dengan dinding atau pintu rumah.', target, true);
  }
  if (walls.some(box => rayBlocked(normalized, distance, box))) {
    return invalid('Pandangan kamera terhalang dinding atau pintu. Dekati lantai dari sisi yang sama.', target, true);
  }
  if (objects.some(other => other.id !== target.id && !isHouseObject(other)
    && boxesOverlap(footprint, furnitureBox(other, states)))) {
    return invalid('Furnitur bertumpuk dengan benda lain. Geser ke tempat kosong.', target, true);
  }
  return {object: target, valid: true, reason: surface ? 'Di atas meja. Konfirmasi untuk menata dekorasi.' : 'Posisi siap. Konfirmasi untuk meletakkan furnitur.', visible: true};
}
