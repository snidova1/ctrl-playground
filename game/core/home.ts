import {z} from 'zod';
import {FURNITURE_BY_ID} from './items';
import {HOME_BOUNDS, HOUSE, ROOM_BOUNDS, HOME_STATIONS, plotPosition, PLOT_SIZE} from './map';

/** One placed furniture item in a Habitat. `room` items live inside the cottage. */
export const placedSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().min(1).max(60),
  x: z.number().finite().min(-20).max(20),
  z: z.number().finite().min(-20).max(20),
  rotation: z.number().int().min(0).max(3),
  room: z.boolean(),
}).strict();
export type Placed = z.infer<typeof placedSchema>;
export const MAX_PLACED = 120;

export const layoutSchema = z.array(placedSchema).max(MAX_PLACED).superRefine((items, ctx) => {
  const ids = new Set<string>();
  items.forEach((item, i) => {
    if (ids.has(item.id)) ctx.addIssue({code: 'custom', message: 'Duplicate object ID', path: [i, 'id']});
    ids.add(item.id);
    const def = FURNITURE_BY_ID[item.assetId];
    if (!def) {ctx.addIssue({code: 'custom', message: 'Unknown furniture', path: [i, 'assetId']}); return;}
    if (item.room ? def.zone === 'yard' : def.zone === 'room') ctx.addIssue({code: 'custom', message: `${def.name} cannot go there`, path: [i, 'room']});
    if (!insideArea(item)) ctx.addIssue({code: 'custom', message: 'Outside your Habitat', path: [i, 'x']});
  });
});
export type Layout = z.infer<typeof layoutSchema>;

export function footprint(item: Pick<Placed, 'assetId' | 'rotation'>) {
  const [w, d] = FURNITURE_BY_ID[item.assetId]?.footprint ?? [1, 1];
  return item.rotation % 2 ? [d, w] : [w, d];
}

export function insideArea(item: Pick<Placed, 'assetId' | 'rotation' | 'x' | 'z' | 'room'>) {
  const [w, d] = footprint(item);
  const b = item.room ? ROOM_BOUNDS : HOME_BOUNDS;
  if (item.x - w / 2 < b.minX - 0.01 || item.x + w / 2 > b.maxX + 0.01 || item.z - d / 2 < b.minZ - 0.01 || item.z + d / 2 > b.maxZ + 0.01) return false;
  if (item.room) return true;
  // Keep the cottage, its doorway, the garden and the stations clear.
  const clear = (x: number, z: number, cw: number, cd: number) => Math.abs(item.x - x) < (w + cw) / 2 - 0.05 && Math.abs(item.z - z) < (d + cd) / 2 - 0.05;
  if (clear(HOUSE.x, HOUSE.z, HOUSE.w + 0.6, HOUSE.d + 0.6)) return false;
  if (clear(HOUSE.doorX, HOUSE.doorZ + 1.4, 2, 2.2)) return false;
  const first = plotPosition(0), last = plotPosition(11);
  if (clear((first.x + last.x) / 2, (first.z + last.z) / 2, last.x - first.x + PLOT_SIZE + 0.4, last.z - first.z + PLOT_SIZE + 0.4)) return false;
  for (const s of [HOME_STATIONS.workbench, HOME_STATIONS.mailbox, HOME_STATIONS.busStop]) if (clear(s.x, s.z, 1.8, 1.8)) return false;
  const pond = HOME_STATIONS.pond;
  if (clear(pond.x, pond.z, pond.rx * 2 + 0.6, pond.rz * 2 + 0.6)) return false;
  return true;
}

/** Room furniture from the older, larger room scene is drawn in proportionally and clamped to the walk-in room. */
export function fitRoom(item: Placed): Placed {
  if (!item.room || insideArea(item)) return item;
  const [w, d] = footprint(item);
  const b = ROOM_BOUNDS;
  const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v)) * 100) / 100;
  return {...item, x: clamp(item.x * 0.8, b.minX + w / 2, b.maxX - w / 2), z: clamp(item.z * 0.75, b.minZ + d / 2, b.maxZ - d / 2)};
}

/** Tolerant read of stored layouts: anything from older builds is dropped, never thrown. */
export function readStoredLayout(json: string | null | undefined): Layout {
  let raw: unknown;
  try {raw = JSON.parse(json ?? '[]');} catch {return [];}
  if (!Array.isArray(raw)) return [];
  const out: Layout = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const parsed = placedSchema.safeParse(value);
    if (!parsed.success || seen.has(parsed.data.id) || !FURNITURE_BY_ID[parsed.data.assetId]) continue;
    const item = fitRoom(parsed.data);
    if (!insideArea(item)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= MAX_PLACED) break;
  }
  return out;
}

export function countPlaced(layout: Layout) {
  const counts: Record<string, number> = {};
  for (const item of layout) counts[item.assetId] = (counts[item.assetId] ?? 0) + 1;
  return counts;
}

/** Deterministic starter decor that matches the starter inventory. */
export function starterLayout(uuid: () => string): Layout {
  const room = (assetId: string, x: number, z: number, rotation = 0): Placed => fitRoom({id: uuid(), assetId, x, z, rotation, room: true});
  return [
    room('bed-single', -3, -1.9),
    room('rug-round', 0, 0.2),
    room('table-round', 2, -0.8),
    room('chair', 2, 0.3, 2),
    room('chair', 3.1, -0.8, 3),
    room('lamp-table', -1.4, -2.5),
    room('bookcase', 3.2, -2.6),
    room('potted-plant', -3.5, 2.5),
    {id: uuid(), assetId: 'flowers-yellow', x: -2.6, z: -1.6, rotation: 0, room: false},
    {id: uuid(), assetId: 'flowers-yellow', x: -4.4, z: -1.6, rotation: 0, room: false},
    {id: uuid(), assetId: 'log-seat', x: 6, z: 6, rotation: 1, room: false},
  ];
}
