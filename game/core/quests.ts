import {seeded, shuffle} from './rng';

export type Counter = 'fish' | 'bug' | 'bird' | 'harvest' | 'cook' | 'forage' | 'sell' | 'gift' | 'craft' | 'plant' | 'talk';
export interface QuestDef {id: string; counter: Counter; target: number; coins: number; xp: number; text: string; minLevel: number}

const TEMPLATES: QuestDef[] = [
  {id: 'fish-3', counter: 'fish', target: 3, coins: 180, xp: 60, text: 'Catch 3 fish', minLevel: 1},
  {id: 'fish-6', counter: 'fish', target: 6, coins: 360, xp: 110, text: 'Catch 6 fish', minLevel: 3},
  {id: 'forage-5', counter: 'forage', target: 5, coins: 120, xp: 40, text: 'Forage 5 things around town', minLevel: 1},
  {id: 'talk-3', counter: 'talk', target: 3, coins: 90, xp: 30, text: 'Chat with 3 neighbours', minLevel: 1},
  {id: 'plant-4', counter: 'plant', target: 4, coins: 120, xp: 50, text: 'Plant 4 seeds at home', minLevel: 1},
  {id: 'harvest-4', counter: 'harvest', target: 4, coins: 200, xp: 70, text: 'Harvest 4 crops', minLevel: 1},
  {id: 'sell-500', counter: 'sell', target: 500, coins: 150, xp: 50, text: 'Sell items worth 500 coins', minLevel: 1},
  {id: 'cook-2', counter: 'cook', target: 2, coins: 240, xp: 80, text: 'Cook 2 dishes', minLevel: 2},
  {id: 'craft-1', counter: 'craft', target: 1, coins: 160, xp: 60, text: 'Craft a piece of furniture', minLevel: 1},
  {id: 'gift-2', counter: 'gift', target: 2, coins: 140, xp: 60, text: 'Give gifts to 2 neighbours', minLevel: 1},
  {id: 'bug-3', counter: 'bug', target: 3, coins: 220, xp: 80, text: 'Catch 3 bugs', minLevel: 3},
  {id: 'bird-2', counter: 'bird', target: 2, coins: 220, xp: 80, text: 'Photograph 2 birds', minLevel: 4},
];
export const QUEST_BY_ID = Object.fromEntries(TEMPLATES.map(q => [q.id, q]));

/** Four requests per real day, deterministic per player so they can't be rerolled. */
export function dailyQuests(profileId: string, day: string, level: number): QuestDef[] {
  const pool = TEMPLATES.filter(q => q.minLevel <= level);
  // Keep one counter per day so requests feel varied.
  const picked: QuestDef[] = [];
  for (const q of shuffle(pool, seeded('quests', profileId, day))) {
    if (picked.some(p => p.counter === q.counter)) continue;
    picked.push(q);
    if (picked.length === 4) break;
  }
  return picked;
}
