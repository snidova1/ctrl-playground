import {describe, expect, it} from 'vitest';
import {applyLifeAction, createLifeState, currentEnergy, hobbyLevel, normalizeLife, plotCount, townLevel, LifeError, type LifeState} from '@/game/core/life';
import {FISH, ITEMS, FURNITURE, FASHION, DISHES} from '@/game/core/items';
import {creaturesForWindow, resolveCreature} from '@/game/core/spawns';
import {spawnWindow, SPAWN_WINDOW_MS} from '@/game/core/clock';
import {FORAGE_NODES} from '@/game/core/map';
import {dailyQuests} from '@/game/core/quests';

const ctx = {profileId: 'wallet-0xtest'};
const fixed = (v: number) => () => v;
function act(s: LifeState, action: Parameters<typeof applyLifeAction>[1], now = s.updatedAt + 1000, rnd = 0.5) {
  return applyLifeAction(s, action, now, fixed(rnd), ctx);
}

describe('life reducer', () => {
  it('starts a new resident with coins, energy, seeds and starter furniture', () => {
    const s = createLifeState(1_000);
    expect(s.coins).toBe(500);
    expect(currentEnergy(s, 1_000)).toBe(100);
    expect(s.inventory['turnip-seed']).toBeGreaterThan(0);
    expect(s.inventory['bed-single']).toBe(1);
    expect(s.hobbies.foraging.unlocked).toBe(true);
    expect(s.hobbies.fishing.unlocked).toBe(false);
    expect(s.plots).toHaveLength(plotCount(s));
  });

  it('teaches fishing through the mentor, then catches a fish only after the bite', () => {
    let s = createLifeState(1_000);
    expect(() => act(s, {type: 'cast', where: 'town', water: 'sea', x: 12, z: 44})).toThrow(LifeError);
    ({state: s} = act(s, {type: 'talk', npc: 'marlo'}));
    expect(s.hobbies.fishing.unlocked).toBe(true);
    expect(() => act(s, {type: 'cast', where: 'town', water: 'pond', x: 12, z: 44})).toThrow('NO_WATER_THERE');
    ({state: s} = act(s, {type: 'cast', where: 'town', water: 'sea', x: 12, z: 44}));
    expect(s.fishing).not.toBeNull();
    const early = act(s, {type: 'reel', success: true}, s.fishing!.castAt + 100);
    expect(early.events[0]).toMatchObject({type: 'escaped', reason: 'early'});
    ({state: s} = act(early.state, {type: 'cast', where: 'town', water: 'sea', x: 12, z: 44}, early.state.updatedAt + 10));
    const caught = act(s, {type: 'reel', success: true}, s.fishing!.biteAt + 200, 0.01);
    const event = caught.events.find(e => e.type === 'caught');
    expect(event).toBeTruthy();
    const fish = FISH.find(f => f.id === (event as {item: string}).item)!;
    expect(fish.water).toContain('sea');
    expect(caught.state.collection[fish.id].count).toBe(1);
    expect(caught.state.hobbies.fishing.xp).toBeGreaterThan(0);
  });

  it('spends energy and refuses actions when too tired', () => {
    let s = createLifeState(1_000);
    s = {...s, energy: 1, energyAt: 1_000};
    const node = FORAGE_NODES[0];
    ({state: s} = act(s, {type: 'forage', nodeId: node.id}, 1_500));
    expect(currentEnergy(s, 1_500)).toBe(0);
    expect(() => act(s, {type: 'forage', nodeId: FORAGE_NODES[1].id}, 1_600)).toThrow('TOO_TIRED');
    expect(currentEnergy(s, 1_500 + 120_000)).toBe(2);
  });

  it('forages each node once per real day', () => {
    let s = createLifeState(Date.UTC(2026, 0, 1, 8));
    const node = FORAGE_NODES.find(n => n.item === 'wood')!;
    ({state: s} = act(s, {type: 'forage', nodeId: node.id}));
    expect(s.inventory.wood).toBeGreaterThanOrEqual(2);
    expect(() => act(s, {type: 'forage', nodeId: node.id})).toThrow('ALREADY_PICKED');
    const tomorrow = act(s, {type: 'forage', nodeId: node.id}, Date.UTC(2026, 0, 2, 8));
    expect(tomorrow.state.foraged.ids).toEqual([node.id]);
  });

  it('grows crops through two waterings before harvest', () => {
    let s = createLifeState(1_000);
    ({state: s} = act(s, {type: 'talk', npc: 'bea'}));
    ({state: s} = act(s, {type: 'plant', plot: 0, seed: 'turnip-seed'}));
    expect(() => act(s, {type: 'harvest', plot: 0})).toThrow('NOT_READY');
    ({state: s} = act(s, {type: 'water', plot: 0}));
    expect(() => act(s, {type: 'water', plot: 0})).toThrow('STILL_DAMP');
    ({state: s} = act(s, {type: 'water', plot: 0}, s.plots[0].readyAt! + 1));
    const ready = s.plots[0].readyAt! + 1;
    const {state, events} = act(s, {type: 'harvest', plot: 0}, ready);
    expect(events.some(e => e.type === 'gained' && e.item === 'turnip')).toBe(true);
    expect(state.plots[0].crop).toBeNull();
    expect(hobbyLevel(state, 'gardening')).toBeGreaterThanOrEqual(1);
  });

  it('buys, sells and protects placed furniture', () => {
    let s = createLifeState(1_000);
    ({state: s} = act(s, {type: 'buy', item: 'carrot-seed', quantity: 2}));
    expect(s.coins).toBe(500 - 30);
    expect(() => applyLifeAction(s, {type: 'sell', item: 'bed-single', quantity: 1}, 2_000, fixed(0.5), {...ctx, placed: {'bed-single': 1}})).toThrow('ITEM_PLACED');
    const sold = applyLifeAction(s, {type: 'sell', item: 'bed-single', quantity: 1}, 2_000, fixed(0.5), {...ctx, placed: {}});
    expect(sold.state.coins).toBeGreaterThan(s.coins);
    expect(() => act(s, {type: 'buy', item: 'statue', quantity: 1})).toThrow('NOT_ENOUGH_COINS');
  });

  it('only lets you own one of each fashion piece', () => {
    let s = {...createLifeState(1_000), coins: 10_000};
    const piece = FASHION[0];
    ({state: s} = act(s, {type: 'buy', item: piece.id, quantity: 1}));
    expect(s.inventory[piece.id]).toBe(1);
    expect(() => act(s, {type: 'buy', item: piece.id, quantity: 1})).toThrow('ALREADY_OWNED');
  });

  it('cooks with tagged ingredients after Chef Tomo teaches you', () => {
    let s = {...createLifeState(1_000), xp: 10_000};
    s.inventory = {...s.inventory, sardine: 1};
    ({state: s} = act(s, {type: 'talk', npc: 'tomo'}));
    expect(s.hobbies.cooking.unlocked).toBe(true);
    const {state} = act(s, {type: 'cook', recipe: 'grilled-fish', quality: 3});
    expect(state.inventory['grilled-fish']).toBeGreaterThanOrEqual(1);
    expect(state.inventory.sardine).toBeUndefined();
    expect(DISHES.every(d => ITEMS[d.id])).toBe(true);
  });

  it('crafts furniture from materials', () => {
    let s = createLifeState(1_000);
    s.inventory = {...s.inventory, wood: 4};
    ({state: s} = act(s, {type: 'craft', furniture: 'chair'}));
    expect(s.inventory.chair).toBe(3);
    expect(FURNITURE.filter(f => f.craft).length).toBeGreaterThan(5);
  });

  it('pays daily requests once', () => {
    let s = createLifeState(Date.UTC(2026, 0, 1, 8));
    const quest = dailyQuests(ctx.profileId, '2026-01-01', townLevel(s)).find(q => q.counter === 'talk' || q.counter === 'forage');
    if (!quest) return;
    s.daily.counters[quest.counter] = quest.target;
    ({state: s} = act(s, {type: 'claim-quest', quest: quest.id}));
    expect(() => act(s, {type: 'claim-quest', quest: quest.id})).toThrow('ALREADY_CLAIMED');
  });

  it('normalizes broken or legacy saves without crashing', () => {
    expect(normalizeLife({version: 1, inventory: {turnip: 3}}).version).toBe(2);
    const s = normalizeLife({...createLifeState(1), inventory: {bogus: 5, turnip: 2}});
    expect(s.inventory).toEqual({turnip: 2});
  });
});

describe('creature spawns', () => {
  it('are deterministic per window and resolvable for catching', () => {
    const w = spawnWindow(Date.UTC(2026, 3, 1, 12));
    const a = creaturesForWindow(w), b = creaturesForWindow(w);
    expect(a).toEqual(b);
    expect(a.some(c => c.kind === 'bug')).toBe(true);
    expect(a.some(c => c.kind === 'bird')).toBe(true);
    const now = w * SPAWN_WINDOW_MS + 10;
    expect(resolveCreature(a[0].id, now)).toEqual(a[0]);
    expect(resolveCreature(a[0].id, now + SPAWN_WINDOW_MS * 3)).toBeNull();
  });
});
