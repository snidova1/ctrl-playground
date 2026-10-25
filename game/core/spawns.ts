import {BIRDS, BUGS, type BirdDef, type BugDef, type Habitat} from './items';
import {SPAWNS, type Spot} from './map';
import {isNight, spawnWindow, townHour, weatherAt, SPAWN_WINDOW_MS} from './clock';
import {pickWeighted, seeded, shuffle} from './rng';

export interface CreatureSpawn {id: string; kind: 'bug' | 'bird'; species: string; x: number; z: number; habitat: Habitat}

const rarityWeight = (rarity: number) => [0, 60, 26, 10, 4, 1.4][rarity] ?? 1;
const BUG_SLOTS: Partial<Record<Habitat, number>> = {meadow: 5, flowers: 5, trees: 4, water: 3, beach: 2, forest: 4, lamps: 3};
const BIRD_SLOTS: Partial<Record<Habitat, number>> = {plaza: 3, meadow: 2, trees: 2, forest: 2, beach: 2, water: 2};

function fits(time: 'any' | 'day' | 'night', night: boolean) {
  return time === 'any' || (time === 'night') === night;
}

/** Deterministic creatures for one spawn window. Same on browser and Worker. */
export function creaturesForWindow(windowIndex: number): CreatureSpawn[] {
  const at = windowIndex * SPAWN_WINDOW_MS + SPAWN_WINDOW_MS / 2;
  const night = isNight(townHour(at));
  const rain = weatherAt(at) === 'rain';
  const out: CreatureSpawn[] = [];
  const place = <T extends BugDef | BirdDef>(kind: 'bug' | 'bird', habitat: Habitat, slots: number, pool: T[]) => {
    const candidates = pool.filter(c => c.habitat === habitat && fits(c.time, night));
    if (!candidates.length || !slots) return;
    const random = seeded(kind, habitat, windowIndex);
    const points: Spot[] = shuffle(SPAWNS[habitat as keyof typeof SPAWNS] ?? [], random);
    const count = Math.min(points.length, rain && kind === 'bug' ? Math.ceil(slots / 2) : slots);
    for (let i = 0; i < count; i++) {
      const species = pickWeighted(candidates, c => rarityWeight(c.rarity), random());
      if (!species) continue;
      const point = points[i];
      out.push({id: `${windowIndex}:${kind}:${point.id}`, kind, species: species.id, x: point.x, z: point.z, habitat});
    }
  };
  for (const [habitat, slots] of Object.entries(BUG_SLOTS) as [Habitat, number][]) place('bug', habitat, slots, BUGS);
  for (const [habitat, slots] of Object.entries(BIRD_SLOTS) as [Habitat, number][]) place('bird', habitat, slots, BIRDS);
  return out;
}

export function activeCreatures(now: number) {
  return creaturesForWindow(spawnWindow(now));
}

/** Resolve a spawn id from the current or immediately previous window. */
export function resolveCreature(id: string, now: number): CreatureSpawn | null {
  const windowIndex = Number(id.split(':')[0]);
  const current = spawnWindow(now);
  if (!Number.isSafeInteger(windowIndex) || windowIndex > current || windowIndex < current - 1) return null;
  return creaturesForWindow(windowIndex).find(c => c.id === id) ?? null;
}
