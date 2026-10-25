import {describe, expect, it} from 'vitest';
import {BUILDINGS, FORAGE_NODES, PIER, SPAWNS, TREES, fishableFrom, heightAt, townWalkable, waterAt, WATER_Y, HOME_STOP, SPAWN_POINT} from '@/game/core/map';
import {insideArea, layoutSchema, readStoredLayout, starterLayout} from '@/game/core/home';
import {appearanceSchema, normalizeAppearance, randomAppearance} from '@/game/core/appearance';
import {fashionNeeded, TOPS} from '@/game/core/wardrobe';
import {NPCS, npcPosition} from '@/game/core/npcs';

describe('town map', () => {
  it('spawns players on dry, walkable ground', () => {
    expect(townWalkable(SPAWN_POINT.x, SPAWN_POINT.z)).toBe(true);
    expect(townWalkable(HOME_STOP.x, HOME_STOP.z + 1.2)).toBe(true);
    expect(heightAt(SPAWN_POINT.x, SPAWN_POINT.z)).toBeGreaterThan(WATER_Y);
  });
  it('blocks water but allows the pier', () => {
    expect(waterAt(25, 7)).toBe('pond');
    expect(townWalkable(25, 7)).toBe(false);
    expect(townWalkable(PIER.x, 42)).toBe(true);
    expect(fishableFrom(PIER.x, 42, 0)?.water).toBe('sea');
  });
  it('keeps buildings, trees and forage on dry land', () => {
    for (const b of BUILDINGS) expect(waterAt(b.x, b.z)).toBeNull();
    expect(TREES.length).toBeGreaterThan(80);
    for (const n of FORAGE_NODES) expect(townWalkable(n.x, n.z)).toBe(true);
    for (const list of Object.values(SPAWNS)) expect(list.length).toBeGreaterThan(0);
  });
  it('moves NPCs along their routes', () => {
    for (const npc of NPCS) {
      const p = npcPosition(npc, 123_456);
      expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
    }
  });
});

describe('home layouts', () => {
  it('starter decor is valid and inside the home', () => {
    const layout = starterLayout(() => crypto.randomUUID());
    expect(layoutSchema.safeParse(layout).success).toBe(true);
    expect(layout.every(insideArea)).toBe(true);
  });
  it('drops legacy or invalid stored objects instead of throwing', () => {
    const legacy = JSON.stringify([{id: crypto.randomUUID(), assetId: 'nature-kit/tree_oak', name: 'Tree', x: 0, y: 0, z: 0, rotation: 0, scale: 1, behavior: 'decoration', target: ''}, {id: crypto.randomUUID(), assetId: 'chair', x: 0, z: 0, rotation: 0, room: true}]);
    const parsed = readStoredLayout(legacy);
    expect(parsed).toHaveLength(1);
    expect(readStoredLayout('not json')).toEqual([]);
  });
  it('rejects room-only furniture in the yard and blocking the house', () => {
    expect(layoutSchema.safeParse([{id: crypto.randomUUID(), assetId: 'bed-single', x: 8, z: 8, rotation: 0, room: false}]).success).toBe(false);
    expect(layoutSchema.safeParse([{id: crypto.randomUUID(), assetId: 'fence', x: 0, z: -6, rotation: 0, room: false}]).success).toBe(false);
  });
});

describe('appearance', () => {
  it('random looks validate and only use starter fashion by default', () => {
    for (let i = 0; i < 40; i++) {
      const look = randomAppearance(`seed-${i}`);
      expect(appearanceSchema.safeParse(look).success).toBe(true);
      expect(fashionNeeded(look)).toEqual([]);
    }
  });
  it('replaces old VRoid-era looks with a stable random look', () => {
    const a = normalizeAppearance({version: 1, gender: 'female'}, 'x');
    expect(a).toEqual(normalizeAppearance({version: 1}, 'x'));
  });
  it('requires owning paid outfits', () => {
    const paid = TOPS.findIndex(t => !t.starter);
    expect(fashionNeeded({top: paid, bottom: 0, hat: 0, accessory: 0})).toHaveLength(1);
  });
});
