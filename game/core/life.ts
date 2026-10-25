import {z} from 'zod';
import {
  BIRDS, BUGS, CROP_BY_ID, CROP_BY_SEED, DISH_BY_ID, FASHION_BY_ID, FISH, FURNITURE_BY_ID, ITEMS, SHOP_STOCK,
  matchesIngredient, isItem, type Water,
} from './items';
import {FORAGE_BY_ID, homeWaterAt, waterAt} from './map';
import {isNight, realDay, spawnWindow, townHour, weatherAt} from './clock';
import {resolveCreature} from './spawns';
import {HOBBIES, NPC_BY_ID, type Hobby} from './npcs';
import {QUEST_BY_ID, dailyQuests, type Counter} from './quests';
import {pickWeighted} from './rng';
import {HOUSE_SIZES} from './house';

export interface Plot {crop: string | null; plantedAt: number | null; waters: 0 | 1 | 2; readyAt: number | null}
export interface LifeState {
  version: 2;
  revision: number;
  createdAt: number;
  updatedAt: number;
  coins: number;
  xp: number;
  energy: number;
  energyAt: number;
  hobbies: Record<Hobby, {xp: number; unlocked: boolean}>;
  inventory: Record<string, number>;
  collection: Record<string, {count: number; best?: number; first: number}>;
  plots: Plot[];
  fishing: null | {water: Water; x: number; z: number; castAt: number; biteAt: number; expiresAt: number};
  caught: string[];
  foraged: {day: string; ids: string[]};
  daily: {day: string; counters: Partial<Record<Counter, number>>; claimed: string[]; talked: string[]; gifted: string[]};
  npcs: Record<string, number>;
  stats: {fish: number; bugs: number; birds: number; harvests: number; dishes: number; crafted: number; coinsEarned: number};
  /** Highest cottage size bought (index into HOUSE_SIZES). */
  houseLevel: number;
}

export type LifeEvent =
  | {type: 'caught'; item: string; size?: number; first: boolean; xp: number}
  | {type: 'escaped'; reason: 'early' | 'late' | 'snapped' | 'flew'}
  | {type: 'photo'; item: string; first: boolean; quality: number; coins: number}
  | {type: 'gained'; item: string; count: number}
  | {type: 'coins'; amount: number}
  | {type: 'level'; level: number}
  | {type: 'hobby-level'; hobby: Hobby; level: number}
  | {type: 'unlock'; hobby: Hobby; npc: string}
  | {type: 'dialog'; npc: string; line: string; hearts: number}
  | {type: 'energy'; amount: number}
  | {type: 'quest'; quest: string; coins: number};

export class LifeError extends Error {
  constructor(public code: string, public detail = code.replaceAll('_', ' ').toLowerCase()) {super(code); this.name = 'LifeError';}
}

// --- progression -----------------------------------------------------------
export const MAX_LEVEL = 30;
export const MAX_HOBBY_LEVEL = 10;
export function levelFromXp(xp: number, base = 150, cap = MAX_LEVEL) {
  let level = 1;
  while (level < cap && xp >= xpForLevel(level + 1, base)) level++;
  return level;
}
export function xpForLevel(level: number, base = 150) {
  return Math.round(base * Math.pow(level - 1, 1.55));
}
export const townLevel = (state: LifeState) => levelFromXp(state.xp);
export const hobbyLevel = (state: LifeState, hobby: Hobby) => levelFromXp(state.hobbies[hobby]?.xp ?? 0, 90, MAX_HOBBY_LEVEL);
export const maxEnergy = (state: LifeState) => 100 + (townLevel(state) - 1) * 5;
export const ENERGY_REGEN_MS = 60_000;
export function currentEnergy(state: LifeState, now: number) {
  const max = maxEnergy(state);
  if (state.energy >= max) return state.energy;
  return Math.min(max, state.energy + Math.floor(Math.max(0, now - state.energyAt) / ENERGY_REGEN_MS));
}
export const plotCount = (state: LifeState) => Math.min(12, 6 + 2 * Math.floor((hobbyLevel(state, 'gardening') - 1) / 2));

export function createLifeState(now = Date.now()): LifeState {
  const hobbies = Object.fromEntries(HOBBIES.map(h => [h.id, {xp: 0, unlocked: h.id === 'foraging'}])) as LifeState['hobbies'];
  const state: LifeState = {
    version: 2, revision: 0, createdAt: now, updatedAt: now, coins: 500, xp: 0, energy: 100, energyAt: now, hobbies,
    inventory: {
      'turnip-seed': 6, 'carrot-seed': 4,
      'bed-single': 1, 'table-round': 1, chair: 2, 'rug-round': 1, 'lamp-table': 1, 'potted-plant': 1, bookcase: 1,
      'flowers-yellow': 2, fence: 6, 'log-seat': 1, 'picket-fence': 4, boardwalk: 6, 'wood-wall': 2,
    },
    collection: {}, plots: [], fishing: null, caught: [], foraged: {day: realDay(now), ids: []},
    daily: {day: realDay(now), counters: {}, claimed: [], talked: [], gifted: []}, npcs: {},
    stats: {fish: 0, bugs: 0, birds: 0, harvests: 0, dishes: 0, crafted: 0, coinsEarned: 0}, houseLevel: 0,
  };
  state.plots = Array.from({length: plotCount(state)}, emptyPlot);
  return state;
}
const emptyPlot = (): Plot => ({crop: null, plantedAt: null, waters: 0, readyAt: null});

/** Repairs older or partial saves without discarding progress. */
export function normalizeLife(input: unknown, now = Date.now()): LifeState {
  const fresh = createLifeState(now);
  if (!input || typeof input !== 'object' || (input as {version?: number}).version !== 2) return fresh;
  const s = input as LifeState;
  const hobbies = {...fresh.hobbies};
  for (const h of HOBBIES) if (s.hobbies?.[h.id]) hobbies[h.id] = {xp: Math.max(0, Number(s.hobbies[h.id].xp) || 0), unlocked: !!s.hobbies[h.id].unlocked || h.id === 'foraging'};
  const inventory: Record<string, number> = {};
  for (const [id, n] of Object.entries(s.inventory ?? {})) if (isItem(id) && Number.isSafeInteger(n) && n > 0) inventory[id] = n;
  const next: LifeState = {
    ...fresh, ...s, hobbies, inventory,
    collection: s.collection ?? {}, caught: Array.isArray(s.caught) ? s.caught.slice(-200) : [],
    npcs: s.npcs ?? {}, stats: {...fresh.stats, ...(s.stats ?? {})},
    foraged: s.foraged?.day ? s.foraged : fresh.foraged,
    daily: s.daily?.day ? {...fresh.daily, ...s.daily} : fresh.daily,
    plots: Array.isArray(s.plots) ? s.plots.slice(0, 12) : [],
    houseLevel: Number.isSafeInteger(s.houseLevel) ? Math.max(0, Math.min(HOUSE_SIZES.length - 1, s.houseLevel)) : 0,
  };
  while (next.plots.length < plotCount(next)) next.plots.push(emptyPlot());
  return next;
}

// --- actions ---------------------------------------------------------------
const id = z.string().min(1).max(80);
const qty = z.number().int().min(1).max(99);
export const lifeActionSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('cast'), where: z.enum(['town', 'home']), water: z.enum(['pond', 'river', 'sea']), x: z.number().finite(), z: z.number().finite()}).strict(),
  z.object({type: z.literal('reel'), success: z.boolean()}).strict(),
  z.object({type: z.literal('catch-bug'), spawnId: id}).strict(),
  z.object({type: z.literal('photo-bird'), spawnId: id, framing: z.number().min(0).max(1)}).strict(),
  z.object({type: z.literal('forage'), nodeId: id}).strict(),
  z.object({type: z.literal('plant'), plot: z.number().int().min(0).max(11), seed: id}).strict(),
  z.object({type: z.literal('water'), plot: z.number().int().min(0).max(11)}).strict(),
  z.object({type: z.literal('harvest'), plot: z.number().int().min(0).max(11)}).strict(),
  z.object({type: z.literal('cook'), recipe: id, quality: z.number().int().min(1).max(3)}).strict(),
  z.object({type: z.literal('craft'), furniture: id}).strict(),
  z.object({type: z.literal('buy'), item: id, quantity: qty}).strict(),
  z.object({type: z.literal('sell'), item: id, quantity: qty}).strict(),
  z.object({type: z.literal('eat'), item: id}).strict(),
  z.object({type: z.literal('talk'), npc: id}).strict(),
  z.object({type: z.literal('gift'), npc: id, item: id}).strict(),
  z.object({type: z.literal('claim-quest'), quest: id}).strict(),
  z.object({type: z.literal('upgrade-house'), size: z.number().int().min(1).max(HOUSE_SIZES.length - 1)}).strict(),
]);
export type LifeAction = z.infer<typeof lifeActionSchema>;

export interface LifeContext {
  profileId: string;
  /** Furniture currently placed in the owner's Habitat (cannot be sold). */
  placed?: Record<string, number>;
}

const XP = {forage: 4, talk: 2, gift: 6, craft: 22, plant: 2};

/**
 * Pure reducer. The Worker supplies `now` and `random`; the browser preview
 * uses the same function against localStorage, so rules never diverge.
 */
export function applyLifeAction(input: LifeState, raw: LifeAction, now: number, random: () => number, ctx: LifeContext): {state: LifeState; events: LifeEvent[]} {
  const action = lifeActionSchema.parse(raw);
  if (!Number.isSafeInteger(now)) throw new LifeError('INVALID_TIME');
  const at = Math.max(now, input.updatedAt);
  const s: LifeState = structuredClone(input);
  const events: LifeEvent[] = [];
  const levelBefore = townLevel(s);
  const hobbyBefore = Object.fromEntries(HOBBIES.map(h => [h.id, hobbyLevel(s, h.id)])) as Record<Hobby, number>;

  // Daily rollover.
  const day = realDay(at);
  if (s.daily.day !== day) s.daily = {day, counters: {}, claimed: [], talked: [], gifted: []};
  if (s.foraged.day !== day) s.foraged = {day, ids: []};
  const window = spawnWindow(at);
  s.caught = s.caught.filter(c => Number(c.split(':')[0]) >= window - 1);

  const count = (item: string) => s.inventory[item] ?? 0;
  const take = (item: string, n: number) => {
    if (count(item) < n) throw new LifeError('NOT_ENOUGH_ITEMS', `You need ${n} × ${ITEMS[item]?.name ?? item}.`);
    const left = count(item) - n;
    if (left) s.inventory[item] = left; else delete s.inventory[item];
  };
  const give = (item: string, n: number) => {
    if (!isItem(item)) throw new LifeError('UNKNOWN_ITEM');
    const total = count(item) + n;
    if (total > 9999) throw new LifeError('BAG_FULL', 'Your bag cannot hold more of that.');
    s.inventory[item] = total;
    events.push({type: 'gained', item, count: n});
  };
  const spend = (amount: number) => {
    const energy = currentEnergy(s, at);
    if (energy < amount) throw new LifeError('TOO_TIRED', 'You are too tired. Eat something or rest a little.');
    const max = maxEnergy(s);
    const regenRemainder = energy >= max ? 0 : Math.max(0, at - s.energyAt) % ENERGY_REGEN_MS;
    s.energy = energy - amount;
    s.energyAt = at - regenRemainder;
  };
  const earn = (amount: number) => {
    s.coins += amount; s.stats.coinsEarned += amount;
    events.push({type: 'coins', amount});
  };
  const xp = (hobby: Hobby | null, amount: number) => {
    s.xp += amount;
    if (hobby) s.hobbies[hobby].xp += amount;
  };
  const bump = (counter: Counter, n = 1) => {s.daily.counters[counter] = (s.daily.counters[counter] ?? 0) + n;};
  const record = (item: string, size?: number) => {
    const entry = s.collection[item];
    const first = !entry;
    s.collection[item] = {count: (entry?.count ?? 0) + 1, first: entry?.first ?? at, best: size !== undefined ? Math.max(size, entry?.best ?? 0) : entry?.best};
    return first;
  };
  const requireHobby = (hobby: Hobby) => {
    if (!s.hobbies[hobby].unlocked) {
      const mentor = Object.values(NPC_BY_ID).find(n => n.hobby === hobby);
      throw new LifeError('HOBBY_LOCKED', mentor ? `Talk to ${mentor.name} to learn ${HOBBIES.find(h => h.id === hobby)?.name}.` : 'Hobby locked.');
    }
  };
  const night = isNight(townHour(at));

  switch (action.type) {
    case 'cast': {
      requireHobby('fishing');
      if (s.fishing && at <= s.fishing.expiresAt) throw new LifeError('ALREADY_FISHING');
      const water = action.where === 'home' ? homeWaterAt(action.x, action.z) : waterAt(action.x, action.z);
      if (water !== action.water) throw new LifeError('NO_WATER_THERE', 'Cast into the water.');
      spend(2);
      const wait = 1800 + Math.floor(random() * 4200);
      s.fishing = {water, x: action.x, z: action.z, castAt: at, biteAt: at + wait, expiresAt: at + wait + 15_000};
      break;
    }
    case 'reel': {
      const f = s.fishing;
      if (!f) throw new LifeError('NOT_FISHING');
      s.fishing = null;
      if (at < f.biteAt - 250) {events.push({type: 'escaped', reason: 'early'}); break;}
      if (at > f.expiresAt) {events.push({type: 'escaped', reason: 'late'}); break;}
      if (!action.success) {events.push({type: 'escaped', reason: 'snapped'}); break;}
      const level = hobbyLevel(s, 'fishing');
      const rain = weatherAt(at) === 'rain';
      const pool = FISH.filter(fish => fish.water.includes(f.water) && (fish.time === 'any' || (fish.time === 'night') === night) && (!fish.weather || rain));
      const fish = pickWeighted(pool, fish => [0, 60, 28, 11, 4.5, 1.6][fish.rarity] * (1 + 0.14 * (level - 1) * (fish.rarity - 1)), random());
      if (!fish) {events.push({type: 'escaped', reason: 'snapped'}); break;}
      const size = Math.round((fish.size[0] + (fish.size[1] - fish.size[0]) * Math.pow(random(), 1.6)) * 10) / 10;
      give(fish.id, 1);
      const first = record(fish.id, size);
      const gained = 10 * fish.rarity + (first ? 20 : 0);
      xp('fishing', gained); bump('fish'); s.stats.fish++;
      events.push({type: 'caught', item: fish.id, size, first, xp: gained});
      break;
    }
    case 'catch-bug': {
      requireHobby('bugs');
      const spawn = resolveCreature(action.spawnId, at);
      if (!spawn || spawn.kind !== 'bug') throw new LifeError('BUG_GONE', 'It already flew away.');
      if (s.caught.includes(spawn.id)) throw new LifeError('BUG_GONE', 'It already flew away.');
      spend(2);
      s.caught.push(spawn.id);
      const bug = BUGS.find(b => b.id === spawn.species)!;
      const chance = Math.min(0.97, 0.9 - 0.07 * (bug.rarity - 1) + 0.025 * hobbyLevel(s, 'bugs'));
      if (random() > chance) {events.push({type: 'escaped', reason: 'flew'}); break;}
      give(bug.id, 1);
      const first = record(bug.id);
      const gained = 9 * bug.rarity + (first ? 20 : 0);
      xp('bugs', gained); bump('bug'); s.stats.bugs++;
      events.push({type: 'caught', item: bug.id, first, xp: gained});
      break;
    }
    case 'photo-bird': {
      requireHobby('birds');
      const spawn = resolveCreature(action.spawnId, at);
      if (!spawn || spawn.kind !== 'bird' || s.caught.includes(spawn.id)) throw new LifeError('BIRD_GONE', 'The bird flew off.');
      if (action.framing < 0.3) throw new LifeError('BLURRY', 'Get the bird inside the frame first.');
      spend(1);
      s.caught.push(spawn.id);
      const bird = BIRDS.find(b => b.id === spawn.species)!;
      const first = record(bird.id);
      const quality = Math.round(action.framing * 100) / 100;
      const coins = Math.round((first ? 120 : 30) * bird.rarity * (0.6 + quality * 0.6));
      earn(coins);
      if (random() < 0.12) give('feather', 1);
      xp('birds', Math.round(12 * bird.rarity * (0.5 + quality) + (first ? 25 : 0)));
      bump('bird'); s.stats.birds++;
      events.push({type: 'photo', item: bird.id, first, quality, coins});
      break;
    }
    case 'forage': {
      const node = FORAGE_BY_ID[action.nodeId];
      if (!node) throw new LifeError('NOTHING_HERE');
      if (s.foraged.ids.includes(node.id)) throw new LifeError('ALREADY_PICKED', 'Already picked today. It will grow back tomorrow.');
      spend(1);
      s.foraged.ids.push(node.id);
      const level = hobbyLevel(s, 'foraging');
      const base = node.item === 'wood' ? 2 : node.item === 'stone' ? 2 : 1;
      give(node.item, base + (random() < 0.2 + level * 0.05 ? 1 : 0));
      if (node.item === 'seashell' && random() < 0.03 + level * 0.004) give('pearl', 1);
      record(node.item);
      xp('foraging', XP.forage); bump('forage');
      break;
    }
    case 'plant': {
      requireHobby('gardening');
      const plot = s.plots[action.plot];
      if (!plot) throw new LifeError('PLOT_LOCKED', 'Level up gardening to unlock more plots.');
      if (plot.crop) throw new LifeError('PLOT_BUSY');
      const crop = CROP_BY_SEED[action.seed];
      if (!crop) throw new LifeError('NOT_A_SEED');
      take(action.seed, 1); spend(1);
      s.plots[action.plot] = {crop: crop.id, plantedAt: at, waters: 0, readyAt: null};
      xp('gardening', XP.plant); bump('plant');
      break;
    }
    case 'water': {
      requireHobby('gardening');
      const plot = s.plots[action.plot];
      if (!plot?.crop) throw new LifeError('PLOT_EMPTY');
      if (plot.waters >= 2) throw new LifeError('ALREADY_WATERED', 'Fully watered — wait for it to ripen.');
      if (plot.readyAt !== null && at < plot.readyAt) throw new LifeError('STILL_DAMP', 'The soil is still damp.');
      spend(1);
      const half = CROP_BY_ID[plot.crop].growMinutes * 30_000;
      plot.waters = (plot.waters + 1) as 1 | 2;
      plot.readyAt = at + half;
      xp('gardening', 2);
      break;
    }
    case 'harvest': {
      requireHobby('gardening');
      const plot = s.plots[action.plot];
      if (!plot?.crop) throw new LifeError('PLOT_EMPTY');
      if (plot.waters < 2 || plot.readyAt === null || at < plot.readyAt) throw new LifeError('NOT_READY', 'Not ready yet.');
      const crop = CROP_BY_ID[plot.crop];
      const level = hobbyLevel(s, 'gardening');
      const n = crop.yield[0] + Math.floor(random() * (crop.yield[1] - crop.yield[0] + 1)) + (random() < level * 0.06 ? 1 : 0);
      give(crop.id, n);
      record(crop.id);
      s.plots[action.plot] = emptyPlot();
      xp('gardening', 6 * n); bump('harvest', 1); s.stats.harvests++;
      break;
    }
    case 'cook': {
      requireHobby('cooking');
      const dish = DISH_BY_ID[action.recipe];
      if (!dish) throw new LifeError('UNKNOWN_RECIPE');
      if (dish.cookingLevel > hobbyLevel(s, 'cooking')) throw new LifeError('RECIPE_LOCKED', `Reach cooking level ${dish.cookingLevel} first.`);
      // Resolve tagged ingredients to the cheapest matching items in the bag.
      const plan: Record<string, number> = {};
      for (const ingredient of dish.ingredients) {
        let needed = ingredient.count;
        const options = Object.keys(s.inventory).filter(item => matchesIngredient(item, ingredient)).sort((a, b) => ITEMS[a].price - ITEMS[b].price);
        for (const option of options) {
          const free = count(option) - (plan[option] ?? 0);
          const use = Math.min(free, needed);
          if (use > 0) {plan[option] = (plan[option] ?? 0) + use; needed -= use;}
          if (!needed) break;
        }
        if (needed) throw new LifeError('MISSING_INGREDIENTS', `Missing ingredients for ${dish.name}.`);
      }
      spend(3);
      for (const [item, n] of Object.entries(plan)) take(item, n);
      give(dish.id, action.quality === 3 && random() < 0.35 ? 2 : 1);
      record(dish.id);
      xp('cooking', 12 * dish.rarity * action.quality);
      bump('cook'); s.stats.dishes++;
      break;
    }
    case 'craft': {
      const furniture = FURNITURE_BY_ID[action.furniture];
      if (!furniture?.craft) throw new LifeError('NOT_CRAFTABLE');
      for (const part of furniture.craft) if (count(part.id) < part.count) throw new LifeError('MISSING_MATERIALS', `Need ${part.count} × ${ITEMS[part.id].name}.`);
      spend(4);
      for (const part of furniture.craft) take(part.id, part.count);
      give(furniture.id, 1);
      xp(null, XP.craft); bump('craft'); s.stats.crafted++;
      break;
    }
    case 'buy': {
      const furniture = FURNITURE_BY_ID[action.item];
      const fashion = FASHION_BY_ID[action.item];
      const stock = SHOP_STOCK.find(entry => entry.id === action.item);
      if (fashion && count(fashion.id) + action.quantity > 1) throw new LifeError('ALREADY_OWNED', 'You already own that.');
      const price = furniture ? furniture.buy : fashion ? fashion.buy : stock?.price;
      if (!price) throw new LifeError('NOT_FOR_SALE');
      if (stock && stock.level > townLevel(s)) throw new LifeError('LEVEL_LOCKED', `Available from town level ${stock.level}.`);
      const total = price * action.quantity;
      if (s.coins < total) throw new LifeError('NOT_ENOUGH_COINS', 'Not enough coins.');
      s.coins -= total;
      give(action.item, action.quantity);
      events.push({type: 'coins', amount: -total});
      break;
    }
    case 'sell': {
      const item = ITEMS[action.item];
      if (!item || item.price <= 0) throw new LifeError('CANNOT_SELL', 'The shop does not buy that.');
      const placed = ctx.placed?.[action.item] ?? 0;
      if (count(action.item) - action.quantity < placed) throw new LifeError('ITEM_PLACED', 'Store the placed furniture first.');
      take(action.item, action.quantity);
      const total = item.price * action.quantity;
      earn(total); bump('sell', total);
      break;
    }
    case 'eat': {
      const dish = DISH_BY_ID[action.item];
      const energy = dish?.energy ?? (ITEMS[action.item]?.kind === 'crop' || ITEMS[action.item]?.kind === 'forage' ? 4 : 0);
      if (!energy) throw new LifeError('NOT_EDIBLE');
      take(action.item, 1);
      const now = currentEnergy(s, at);
      s.energy = Math.min(maxEnergy(s), now + energy);
      s.energyAt = at;
      events.push({type: 'energy', amount: energy});
      break;
    }
    case 'talk': {
      const npc = NPC_BY_ID[action.npc];
      if (!npc) throw new LifeError('UNKNOWN_NEIGHBOUR');
      if (!s.daily.talked.includes(npc.id)) {
        s.daily.talked.push(npc.id);
        s.npcs[npc.id] = (s.npcs[npc.id] ?? 0) + 1;
        xp(null, XP.talk); bump('talk');
      }
      const hobby = npc.hobby;
      const required = HOBBIES.find(h => h.id === hobby)?.level ?? 1;
      if (hobby && !s.hobbies[hobby].unlocked && townLevel(s) >= required) {
        s.hobbies[hobby].unlocked = true;
        if (hobby === 'cooking') give('stove', 1);
        if (hobby === 'gardening') give('tomato-seed', 3);
        events.push({type: 'unlock', hobby, npc: npc.id});
      }
      const pending = hobby && !s.hobbies[hobby].unlocked ? `Come back when you reach town level ${required} and I'll teach you ${HOBBIES.find(h => h.id === hobby)?.name.toLowerCase()}.` : null;
      const line = pending ?? npc.lines[Math.floor(random() * npc.lines.length)];
      events.push({type: 'dialog', npc: npc.id, line, hearts: s.npcs[npc.id] ?? 0});
      break;
    }
    case 'gift': {
      const npc = NPC_BY_ID[action.npc];
      if (!npc) throw new LifeError('UNKNOWN_NEIGHBOUR');
      if (s.daily.gifted.includes(npc.id)) throw new LifeError('ALREADY_GIFTED', `${npc.name} already got a gift today.`);
      if (ITEMS[action.item]?.kind === 'furniture') throw new LifeError('TOO_BIG', 'That will not fit in a gift box.');
      take(action.item, 1);
      s.daily.gifted.push(npc.id);
      const loved = npc.likes.includes(action.item);
      s.npcs[npc.id] = (s.npcs[npc.id] ?? 0) + (loved ? 6 : 2);
      xp(null, XP.gift); bump('gift');
      events.push({type: 'dialog', npc: npc.id, line: loved ? `Oh! I love ${ITEMS[action.item].name}! Thank you so much!` : 'How thoughtful, thank you!', hearts: s.npcs[npc.id]});
      break;
    }
    case 'upgrade-house': {
      if (action.size <= s.houseLevel) throw new LifeError('ALREADY_UPGRADED', 'Your home is already that size.');
      if (action.size !== s.houseLevel + 1) throw new LifeError('UPGRADE_IN_ORDER', 'Upgrade one size at a time.');
      const price = HOUSE_SIZES[action.size].price;
      if (s.coins < price) throw new LifeError('NOT_ENOUGH_COINS', 'Not enough coins.');
      s.coins -= price; s.houseLevel = action.size;
      events.push({type: 'coins', amount: -price});
      xp(null, 120);
      break;
    }
    case 'claim-quest': {
      const quest = QUEST_BY_ID[action.quest];
      if (!quest || !dailyQuests(ctx.profileId, day, townLevel(s)).some(q => q.id === quest.id)) throw new LifeError('UNKNOWN_QUEST');
      if (s.daily.claimed.includes(quest.id)) throw new LifeError('ALREADY_CLAIMED');
      if ((s.daily.counters[quest.counter] ?? 0) < quest.target) throw new LifeError('QUEST_INCOMPLETE', 'Not finished yet.');
      s.daily.claimed.push(quest.id);
      earn(quest.coins); xp(null, quest.xp);
      events.push({type: 'quest', quest: quest.id, coins: quest.coins});
      break;
    }
  }

  const levelAfter = townLevel(s);
  if (levelAfter > levelBefore) {
    events.push({type: 'level', level: levelAfter});
    s.energy = maxEnergy(s); s.energyAt = at;
  }
  for (const h of HOBBIES) {
    const level = hobbyLevel(s, h.id);
    if (level > hobbyBefore[h.id]) events.push({type: 'hobby-level', hobby: h.id, level});
  }
  while (s.plots.length < plotCount(s)) s.plots.push(emptyPlot());
  s.revision++;
  s.updatedAt = at;
  return {state: s, events};
}

/** Public, non-sensitive slice of a player's life shown to visitors. */
export function publicLife(state: LifeState) {
  return {
    level: townLevel(state),
    plots: state.plots.map(p => ({crop: p.crop, waters: p.waters, readyAt: p.readyAt})),
    collection: Object.keys(state.collection).length,
  };
}

export function furnitureOwned(state: LifeState) {
  const owned: Record<string, number> = {};
  for (const [item, n] of Object.entries(state.inventory)) if (FURNITURE_BY_ID[item]) owned[item] = n;
  return owned;
}
