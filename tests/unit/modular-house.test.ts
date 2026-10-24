import {describe, expect, it} from 'vitest';
import {
  DEFAULT_HOUSE, HOUSE_ASSET_ID, HOUSE_DOOR_ASSET_ID, HOUSE_WINDOW_ASSET_ID,
  HOUSE_ORIGIN, HOUSE_CELL_SIZE, HOUSE_WALL_HEIGHT, HOUSE_AVATAR_RADIUS,
  HOUSE_DOOR_WIDTH, HOUSE_WINDOW_WIDTH, HOUSE_WINDOW_SILL, HOUSE_WINDOW_HEIGHT,
  getHouseEdges, getHouseConfig, getHouseAnchor, isHouseObject, replaceHouse,
  setHouseOpening, getHouseOpenings, getHouseWallSegments, getHouseDoorLeaf,
  houseBlocksAt, houseSchema, type HouseConfig, type HouseEdge,
} from '@/features/habitat/modular-house';
import {layoutSchema, worldObjectSchema, type WorldObject} from '@/features/habitat/types';

const single: HouseConfig = {...DEFAULT_HOUSE, cells: [{x: 0, z: 0}]};
function furniture(overrides: Partial<WorldObject> = {}): WorldObject {
  return {id: crypto.randomUUID(), assetId: 'furniture-chair', name: 'Chair', x: 7, y: 0, z: 5,
    rotation: .4, scale: 1, behavior: 'seat', target: '', ...overrides};
}
function point(edge: HouseEdge, width = 0, outward = 0) {
  return {x: edge.x + Math.cos(edge.rotation) * width + Math.sin(edge.rotation) * outward,
    z: edge.z - Math.sin(edge.rotation) * width + Math.cos(edge.rotation) * outward};
}
function blocked(point: {x: number; z: number}, objects: WorldObject[], states = {}) {
  return houseBlocksAt(point.x, point.z, objects, states);
}
function opening(objects: WorldObject[], assetId = HOUSE_DOOR_ASSET_ID) {
  return objects.find(object => object.assetId === assetId)!;
}

describe('typed modular house config and deterministic geometry', () => {
  it('validates the bounded, connected, strict, versioned config', () => {
    expect(houseSchema.parse(DEFAULT_HOUSE)).toEqual(DEFAULT_HOUSE);
    const invalid = [
      {...single, version: 2}, {...single, cells: []},
      {...single, cells: [{x: 0, z: 0}, {x: 0, z: 0}]},
      {...single, cells: [{x: -1, z: -1}, {x: 0, z: 0}]},
      {...single, cells: [{x: 2, z: 0}]}, {...single, cells: [{x: .5, z: 0}]},
      {...single, cells: Array.from({length: 10}, () => ({x: 0, z: 0}))},
      {...single, wallColor: 'red'}, {...single, roofColor: '#abc'},
      {...single, floorColor: '#12345z'}, {...single, wallFinish: 'glass'},
      {...single, floorFinish: 'lava'}, {...single, roofStyle: 'remote'},
      {...single, x: 4}, {...single, cells: [{x: 0, z: 0, y: 1}]},
    ];
    invalid.forEach(config => expect(houseSchema.safeParse(config).success).toBe(false));
    expect(houseSchema.safeParse({...single, wallColor: '#A0bbF4', roofStyle: 'flat', wallFinish: 'timber', floorFinish: 'tile'}).success).toBe(true);
  });

  it('uses canonical exterior IDs and midpoint/orientation independent of cell order', () => {
    const edges = getHouseEdges(single);
    expect(edges.map(edge => edge.id)).toEqual(['0,0,north', '0,0,south', '0,0,east', '0,0,west']);
    expect(edges.map(({x, z}) => [x, z])).toEqual([[0, -5], [0, -2], [1.5, -3.5], [-1.5, -3.5]]);
    expect(edges.map(edge => edge.rotation)).toEqual([Math.PI, 0, Math.PI / 2, -Math.PI / 2]);
    expect(edges.every(edge => edge.width === 3)).toBe(true);
    expect(getHouseEdges({...DEFAULT_HOUSE, cells: [...DEFAULT_HOUSE.cells].reverse()})).toEqual(getHouseEdges(DEFAULT_HOUSE));
    expect(getHouseEdges(DEFAULT_HOUSE).some(edge => edge.id === '0,0,south' || edge.id === '0,1,north')).toBe(false);
  });

  it('matches expected exposed perimeter for every valid 3x3 connected shape', () => {
    const grid = Array.from({length: 9}, (_, i) => ({x: i % 3 - 1, z: Math.floor(i / 3) - 1}));
    for (let mask = 1; mask < 512; mask++) {
      const cells = grid.filter((_, i) => mask & (1 << i));
      const parsed = houseSchema.safeParse({...single, cells});
      if (!parsed.success) continue;
      const adjacent = cells.reduce((sum, cell) => sum + cells.filter(other => Math.abs(other.x - cell.x) + Math.abs(other.z - cell.z) === 1).length, 0);
      const edges = getHouseEdges(parsed.data);
      expect(edges.length).toBe(cells.length * 4 - adjacent);
      expect(new Set(edges.map(edge => edge.id)).size).toBe(edges.length);
      expect(layoutSchema.safeParse(replaceHouse([], parsed.data)).success).toBe(true);
    }
  });

  it('shares exact dimensional constants and seamless wall segments', () => {
    expect([HOUSE_CELL_SIZE, HOUSE_WALL_HEIGHT, HOUSE_DOOR_WIDTH, HOUSE_WINDOW_WIDTH, HOUSE_WINDOW_SILL, HOUSE_WINDOW_HEIGHT, HOUSE_AVATAR_RADIUS])
      .toEqual([3, 2.8, 1.5, 1.4, 1, 1.05, .28]);
    for (const edge of getHouseEdges(single)) {
      const door = getHouseWallSegments(edge, 'door');
      const window = getHouseWallSegments(edge, 'window');
      expect(door).toHaveLength(3);
      expect(window).toHaveLength(4);
      expect(door[0].width + door[1].width + HOUSE_DOOR_WIDTH).toBe(3);
      expect(window[0].width + window[1].width + HOUSE_WINDOW_WIDTH).toBe(3);
      expect(door[2].y - door[2].height / 2).toBeCloseTo(2.3);
      expect(window[3].height).toBe(1);
      expect(window.every(box => box.rotation === edge.rotation)).toBe(true);
    }
  });
});

describe('persistent structural objects and reconciliation', () => {
  it('leaves legacy worlds untouched and supplies only a noninteractive fallback arch', () => {
    const objects = [furniture()];
    expect(getHouseAnchor(objects)).toBeUndefined();
    expect(getHouseConfig(objects)).toBe(DEFAULT_HOUSE);
    expect(getHouseOpenings(objects)).toEqual([{edgeId: '0,1,south', kind: 'door'}]);
    expect(objects).toHaveLength(1);
    expect(layoutSchema.parse(objects)).toEqual(objects);
    expect(blocked({x: 0, z: 1}, objects)).toBe(false);
    expect(blocked({x: 1.1, z: 1}, objects)).toBe(true);
  });

  it('materializes one fixed anchor, front door and two windows without changing furniture', () => {
    const chair = furniture(), lamp = furniture({assetId: 'lamp', behavior: 'light'});
    const objects = replaceHouse([chair, lamp], DEFAULT_HOUSE);
    expect(objects).toHaveLength(6);
    expect(objects[0]).toBe(chair);
    expect(objects[1]).toBe(lamp);
    expect(getHouseAnchor(objects)).toMatchObject({assetId: HOUSE_ASSET_ID, x: HOUSE_ORIGIN.x, z: HOUSE_ORIGIN.z, y: 0, rotation: 0, scale: 1, behavior: 'decoration', house: DEFAULT_HOUSE});
    expect(objects.filter(object => object.assetId === HOUSE_DOOR_ASSET_ID)).toHaveLength(1);
    expect(objects.filter(object => object.assetId === HOUSE_WINDOW_ASSET_ID)).toHaveLength(2);
    expect(objects.filter(isHouseObject)).toHaveLength(4);
    expect(layoutSchema.safeParse(objects).success).toBe(true);
    expect(getHouseConfig(objects)).not.toBe(DEFAULT_HOUSE); // schema parse owns a config copy
    expect(getHouseConfig(objects)).toEqual(DEFAULT_HOUSE);
  });

  it('retains IDs through style edits, idempotent replacement, and opening-kind changes', () => {
    const objects = replaceHouse([furniture()], DEFAULT_HOUSE);
    const styled = replaceHouse(objects, {...DEFAULT_HOUSE, wallColor: '#112233', roofStyle: 'flat'});
    expect(styled.map(object => object.id)).toEqual(objects.map(object => object.id));
    expect(replaceHouse(styled, getHouseConfig(styled))).toEqual(styled);
    const oldDoor = opening(styled);
    const switched = setHouseOpening(styled, oldDoor.target, 'window');
    expect(switched.find(object => object.id === oldDoor.id)).toMatchObject({assetId: HOUSE_WINDOW_ASSET_ID, target: oldDoor.target});
    expect(layoutSchema.safeParse(switched).success).toBe(true);
    const walled = setHouseOpening(switched, oldDoor.target, 'wall');
    expect(walled.some(object => object.id === oldDoor.id)).toBe(false);
    expect(layoutSchema.safeParse(walled).success).toBe(true);
  });

  it('reconciles removed/interior opening edges on connected room addition and removal', () => {
    const original = replaceHouse([], single);
    const withExtraDoor = setHouseOpening(original, '0,0,east', 'door');
    const expanded = replaceHouse(withExtraDoor, {...single, cells: [{x: 0, z: 0}, {x: 1, z: 0}]});
    expect(expanded.some(object => object.target === '0,0,east')).toBe(false);
    expect(getHouseAnchor(expanded)!.id).toBe(getHouseAnchor(original)!.id);
    expect(opening(expanded).id).toBe(opening(original).id);
    expect(layoutSchema.safeParse(expanded).success).toBe(true);
    const shrunk = replaceHouse(expanded, single);
    expect(layoutSchema.safeParse(shrunk).success).toBe(true);
    expect(getHouseConfig(shrunk).cells).toEqual(single.cells);
    expect(() => replaceHouse(original, {...single, cells: [{x: -1, z: 0}, {x: 1, z: 0}]})).toThrow();
  });

  it('upgrades fallback when editing an opening, rejects interior/unknown edges atomically', () => {
    const old = [furniture()];
    const objects = setHouseOpening(old, '0,1,south', 'window');
    expect(getHouseAnchor(objects)).toBeDefined();
    expect(objects.find(object => object.target === '0,1,south')!.assetId).toBe(HOUSE_WINDOW_ASSET_ID);
    expect(old).toHaveLength(1);
    expect(() => setHouseOpening(old, '0,0,south', 'door')).toThrow(/exterior/);
    expect(() => setHouseOpening(objects, '999,999,south', 'door')).toThrow(/exterior/);
    expect(() => setHouseOpening(objects, '0,1,south', 'evil' as 'door')).toThrow();
  });

  it('never silently truncates or mutates furniture at the 120-object budget', () => {
    const furniture116 = Array.from({length: 116}, () => furniture());
    const full = replaceHouse(furniture116, DEFAULT_HOUSE);
    expect(full).toHaveLength(120);
    expect(layoutSchema.safeParse(full).success).toBe(true);
    expect(() => replaceHouse([...furniture116, furniture()], DEFAULT_HOUSE)).toThrow(/120/);
    const untouched = JSON.stringify(full);
    expect(() => setHouseOpening(full, '0,0,north', 'door')).toThrow(/120/);
    expect(JSON.stringify(full)).toBe(untouched);
    expect(furniture116).toHaveLength(116);
    expect(setHouseOpening(full, opening(full).target, 'window')).toHaveLength(120);
  });
});

describe('structural layout validation without breaking legacy furniture', () => {
  it('adds optional house data while retaining strict object schemas', () => {
    expect(worldObjectSchema.safeParse(furniture()).success).toBe(true);
    expect(worldObjectSchema.safeParse({...furniture(), arbitrary: true}).success).toBe(false);
    expect(layoutSchema.safeParse([furniture({house: single})]).success).toBe(false);
    expect(layoutSchema.safeParse([]).success).toBe(true);
  });

  it('rejects duplicate anchors and anchorless config/transform bypasses', () => {
    const objects = replaceHouse([], single);
    const anchor = getHouseAnchor(objects)!;
    expect(layoutSchema.safeParse([...objects, {...anchor, id: crypto.randomUUID()}]).success).toBe(false);
    const invalid: Partial<WorldObject>[] = [
      {house: undefined}, {x: 1}, {z: -2}, {y: 1}, {scale: 2}, {rotation: .1},
      {behavior: 'solid'}, {target: 'arbitrary'},
    ];
    invalid.forEach(change => expect(layoutSchema.safeParse(objects.map(object => object.id === anchor.id ? {...object, ...change} : object)).success).toBe(false));
  });

  it('rejects orphan, duplicate and interior openings plus all free transforms', () => {
    const objects = replaceHouse([], DEFAULT_HOUSE);
    const door = opening(objects);
    expect(layoutSchema.safeParse(objects.filter(object => object.assetId !== HOUSE_ASSET_ID)).success).toBe(false);
    expect(layoutSchema.safeParse([...objects, {...door, id: crypto.randomUUID()}]).success).toBe(false);
    const invalid: Partial<WorldObject>[] = [
      {target: '0,0,south'}, {target: 'bogus'}, {x: door.x + .01}, {z: door.z + .01},
      {y: .1}, {scale: 1.01}, {rotation: door.rotation + Math.PI}, {behavior: 'decoration'}, {house: single},
    ];
    invalid.forEach(change => expect(layoutSchema.safeParse(objects.map(object => object.id === door.id ? {...object, ...change} : object)).success).toBe(false));
  });

  it('keeps existing duplicate-ID and dangling-switch validation', () => {
    const object = furniture();
    expect(layoutSchema.safeParse([object, object]).success).toBe(false);
    expect(layoutSchema.safeParse([furniture({behavior: 'switch', target: crypto.randomUUID()})]).success).toBe(false);
    expect(layoutSchema.safeParse([object, furniture({behavior: 'switch', target: object.id})]).success).toBe(true);
  });
});

describe('continuous world-space wall, door and window collision', () => {
  it('keeps legacy arch traversable from outside through internal floor seams', () => {
    for (let z = 2; z >= -4.5; z -= .1) expect(houseBlocksAt(0, z, [], {})).toBe(false);
    for (const edge of getHouseEdges(DEFAULT_HOUSE).filter(edge => edge.id !== '0,1,south')) {
      expect(houseBlocksAt(edge.x, edge.z, [], {})).toBe(true);
    }
  });

  it('blocks the closed entrance and clears the open entrance without teleportation', () => {
    const objects = replaceHouse([], DEFAULT_HOUSE), door = opening(objects);
    expect(houseBlocksAt(door.x, door.z, objects, {})).toBe(true);
    const states = {[door.id]: {active: true, usedAt: 1}};
    expect(houseBlocksAt(door.x, door.z, objects, states)).toBe(false);
    for (let z = 2; z >= -4.5; z -= .1) expect(houseBlocksAt(0, z, objects, states)).toBe(false);
    expect(houseBlocksAt(door.x, door.z, objects, {[door.id]: {active: false, usedAt: 2}})).toBe(true);
  });

  it('models the swung-open door leaf and radius at every exterior orientation', () => {
    for (const edge of getHouseEdges(single)) {
      const objects = setHouseOpening(replaceHouse([], single), edge.id, 'door');
      const door = objects.find(object => object.target === edge.id)!;
      const active = {[door.id]: {active: true, usedAt: 1}};
      expect(blocked(point(edge), objects)).toBe(true);
      expect(blocked(point(edge), objects, active)).toBe(false);
      const leaf = getHouseDoorLeaf(edge, true);
      expect(leaf.x).toBeCloseTo(point(edge, -.75, .75).x);
      expect(leaf.z).toBeCloseTo(point(edge, -.75, .75).z);
      expect(blocked({x: leaf.x, z: leaf.z}, objects, active)).toBe(true);
      expect(blocked(point(edge, -.75, .75), objects)).toBe(false);
      expect(blocked(point(edge, 0, .32), objects)).toBe(true);
      expect(blocked(point(edge, 0, .34), objects)).toBe(false);
      expect(blocked(point(edge, .48, 0), objects, active)).toBe(true); // .28 radius hits jamb
      expect(blocked(point(edge, .46, 0), objects, active)).toBe(false);
    }
  });

  it('windows remain avatar-blocking even when their interaction state is active', () => {
    for (const edge of getHouseEdges(single)) {
      const objects = setHouseOpening(replaceHouse([], single), edge.id, 'window');
      const window = objects.find(object => object.target === edge.id)!;
      expect(blocked(point(edge), objects)).toBe(true);
      expect(blocked(point(edge), objects, {[window.id]: {active: true, usedAt: 1}})).toBe(true);
    }
  });

  it('room additions remove internal walls and room removal restores the exact boundary', () => {
    const old = setHouseOpening(replaceHouse([], single), '0,0,east', 'wall');
    expect(houseBlocksAt(1.5, HOUSE_ORIGIN.z, old, {})).toBe(true);
    const bigger = replaceHouse(old, {...single, cells: [{x: 0, z: 0}, {x: 1, z: 0}]});
    for (let x = 0; x <= 3; x += .1) expect(houseBlocksAt(x, HOUSE_ORIGIN.z, bigger, {})).toBe(false);
    expect(houseBlocksAt(1.5, HOUSE_ORIGIN.z, replaceHouse(bigger, single), {})).toBe(true);
    expect(houseBlocksAt(4.5, HOUSE_ORIGIN.z, bigger, {})).toBe(true);
  });

  it('seals outer corners, materialized wall seams and radius boundaries', () => {
    let objects = replaceHouse([], single);
    for (const edge of getHouseEdges(single)) objects = setHouseOpening(objects, edge.id, 'wall');
    expect(houseBlocksAt(1.5, -2, objects, {})).toBe(true);
    expect(houseBlocksAt(1.5, -5, objects, {})).toBe(true);
    expect(houseBlocksAt(-1.5, -2, objects, {})).toBe(true);
    expect(houseBlocksAt(-1.5, -5, objects, {})).toBe(true);
    expect(houseBlocksAt(0, -1.64, objects, {})).toBe(true);
    expect(houseBlocksAt(0, -1.62, objects, {})).toBe(false);
    expect(houseBlocksAt(0, -3.5, objects, {})).toBe(false);
  });
});
