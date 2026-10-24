import {describe, expect, it, vi} from 'vitest';
import {BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Ray, Raycaster, Vector2, Vector3} from 'three';

// Exercise the frame callback and lifecycle without allocating a WebGL renderer on WSL.
const hooks = vi.hoisted(() => ({frame: undefined as undefined | ((state: {camera: PerspectiveCamera; clock: {elapsedTime: number}}) => void), cleanups: [] as (() => void)[]}));
vi.mock('@react-three/fiber', () => ({useFrame: (callback: typeof hooks.frame) => {hooks.frame = callback;}}));
vi.mock('@react-three/drei', () => ({useGLTF: vi.fn()}));
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  return {...actual,
    useMemo: (factory: () => unknown) => factory(),
    useRef: (current: unknown) => ({current}),
    useState: (initial: unknown) => [typeof initial === 'function' ? initial() : initial, vi.fn()],
    useLayoutEffect: (effect: () => void | (() => void)) => {const cleanup = effect(); if (cleanup) hooks.cleanups.push(cleanup);},
    useEffect: (effect: () => void | (() => void)) => {const cleanup = effect(); if (cleanup) hooks.cleanups.push(cleanup);},
  };
});
import {getBuildAsset} from '@/features/plaza/build-assets';
import {getFurniturePlacementPreview} from '@/features/habitat/furniture-placement';
import {DEFAULT_HOUSE, getHouseDoorLeaf, getHouseEdges, getHouseOpenings, replaceHouse} from '@/features/habitat/modular-house';
import {worldObjectSchema, type WorldObject} from '@/features/habitat/types';

const furniture = (patch: Partial<WorldObject> = {}): WorldObject => ({
  id: '00000000-0000-4000-8000-000000000001', assetId: 'furniture-kit/chair', name: 'Kursi',
  x: 0, y: 0, z: 6, rotation: 0, scale: 1, behavior: 'seat', target: '', ...patch,
});
const down = (x = 0, z = 6, height = 2) => new Ray(new Vector3(x, height, z), new Vector3(0, -1, 0));
const toward = (from: [number, number, number], to: [number, number, number]) => {
  const origin = new Vector3(...from);
  return new Ray(origin, new Vector3(...to).sub(origin).normalize());
};
const preview = (ray = down(), object = furniture(), objects: readonly WorldObject[] = [], states = {}) =>
  getFurniturePlacementPreview(ray, object, objects, states);
const house = () => replaceHouse([], {...DEFAULT_HOUSE, cells: [{x: 0, z: 0}]});

describe('camera-center furniture placement', () => {
  it('moves the actual target when the camera yaws, without a pointer or avatar offset', () => {
    const camera = new PerspectiveCamera(55, 1, .08, 100);
    camera.position.set(0, 2, 7);
    camera.lookAt(0, 0, 4);
    camera.updateMatrixWorld(true);
    const caster = new Raycaster();
    caster.setFromCamera(new Vector2(0, 0), camera);
    const before = preview(caster.ray);
    camera.rotateOnWorldAxis(new Vector3(0, 1, 0), Math.PI / 2);
    camera.updateMatrixWorld(true);
    caster.setFromCamera(new Vector2(0, 0), camera);
    const after = preview(caster.ray);
    expect(before).toMatchObject({valid: true, visible: true, object: {x: 0, y: 0, z: 4}});
    expect(after).toMatchObject({valid: true, visible: true, object: {x: -3, y: 0, z: 7}});
  });

  it('snaps to .25 m, grounds imported furniture, preserves identity, and never mutates inputs', () => {
    const original = Object.freeze(furniture({y: 3, rotation: .4, scale: 2}));
    const ray = down(.36, 6.13);
    const copy = ray.clone();
    const result = preview(ray, original);
    expect(result).toMatchObject({valid: true, visible: true, object: {...original, x: .25, y: 0, z: 6.25}});
    expect(original.y).toBe(3);
    expect(ray).toEqual(copy);
    expect(worldObjectSchema.safeParse(result.object).success).toBe(true);
  });

  it.each([
    new Ray(new Vector3(0, 2, 6), new Vector3(0, 1, 0)),
    new Ray(new Vector3(0, 2, 6), new Vector3(0, 0, -1)),
    new Ray(new Vector3(0, -2, 6), new Vector3(0, -1, 0)),
    new Ray(new Vector3(0, 0, 6), new Vector3(0, -1, 0)),
    new Ray(new Vector3(NaN, 2, 6), new Vector3(0, -1, 0)),
  ])('rejects sky, horizontal, behind-camera, on-ground, and non-finite rays (%#)', ray => {
    expect(preview(ray)).toMatchObject({valid: false, visible: false});
    expect(preview(ray).reason).toMatch(/lantai|kamera/i);
  });

  it('limits forward floor intersections to 25 world meters, including non-unit rays', () => {
    expect(preview(down(0, 6, 25)).valid).toBe(true);
    expect(preview(down(0, 6, 25.001))).toMatchObject({valid: false, visible: false});
    expect(preview(new Ray(new Vector3(0, 25.1, 6), new Vector3(0, -10, 0))).valid).toBe(false);
  });

  it.each([[14.25, 6], [-14.25, 6], [0, -8.25], [0, 12.25], [14.01, 6]])(
    'rejects out-of-world target (%s, %s) rather than silently clamping', (x, z) => {
      const result = preview(down(x, z));
      expect(result).toMatchObject({valid: false, visible: true});
      expect(result.reason).toMatch(/batas/i);
      if (x === 14.25) expect(result.object.x).toBe(14.25);
    },
  );

  it('allows schema boundary coordinates on unobstructed floor', () => {
    for (const [x, z] of [[14, 6], [-14, 6], [0, -8], [0, 12]]) {
      expect(preview(down(x, z)).valid).toBe(true);
    }
  });

  it.each([{scale: .24}, {scale: 4.01}, {rotation: Infinity}])('applies the same finite transform schema (%j)', patch => {
    expect(preview(down(), furniture(patch)).valid).toBe(false);
  });

  it('rejects reserved house objects as furniture placement', () => {
    expect(preview(down(), house().find(o => o.assetId === 'habitat-house')!).valid).toBe(false);
  });

  it('rejects all overlapping furniture, even decoration/non-solid assets', () => {
    const other = furniture({id: '00000000-0000-4000-8000-000000000002', behavior: 'decoration'});
    const result = preview(down(), furniture(), [other]);
    expect(result).toMatchObject({valid: false, visible: true});
    expect(result.reason).toMatch(/bertumpuk|furnitur/i);
  });

  it('excludes its own id while moving an existing object', () => {
    const object = furniture();
    expect(preview(down(), object, [object]).valid).toBe(true);
  });

  it('normalizes imported asset centers exactly like Stage (bounds centered at x/z, bottom y=0)', () => {
    expect(getBuildAsset('furniture-kit/bench')!.center).not.toEqual([0, 0, 0]);
    const bench = furniture({assetId: 'furniture-kit/bench', scale: 4});
    const other = furniture({id: '00000000-0000-4000-8000-000000000002', x: .75});
    expect(preview(down(), bench, [other]).valid).toBe(false);
    expect(preview(down(), bench, [{...other, x: 1}]).valid).toBe(true);
  });

  it('uses rotation and scale of both OBBs, not axis-aligned unrotated bounds', () => {
    const bench = furniture({assetId: 'furniture-kit/bench', scale: 4});
    const other = {...bench, id: '00000000-0000-4000-8000-000000000002', z: 7};
    expect(preview(down(), bench, [other]).valid).toBe(true);
    expect(preview(down(), bench, [{...other, rotation: Math.PI / 2}]).valid).toBe(false);
    expect(preview(down(), {...bench, rotation: Math.PI / 2}, [other]).valid).toBe(false);
  });

  it('does not reject disjoint parallel rotated OBBs just because their world AABBs overlap', () => {
    const bench = furniture({assetId: 'furniture-kit/bench', scale: 4, rotation: Math.PI / 4});
    const other = {...bench, id: '00000000-0000-4000-8000-000000000002', x: .75, z: 6.75};
    expect(preview(down(), bench, [other]).valid).toBe(true);
  });

  it('ignores furniture entirely above the candidate volume', () => {
    const above = furniture({id: '00000000-0000-4000-8000-000000000002', y: 3});
    expect(preview(down(), furniture(), [above]).valid).toBe(true);
  });

  it('allows room floor inside the house anchor and between shared module seams', () => {
    expect(preview(down(0, -3.5, 8), furniture(), house()).valid).toBe(true);
    expect(preview(down(1.5, -3.5), furniture(), replaceHouse([], DEFAULT_HOUSE)).valid).toBe(true);
  });

  it('rejects the actual shared wall footprint, not a blanket house bounding box', () => {
    const result = preview(down(1.5, -3.5, .8), furniture(), house());
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/dinding|pintu/i);
  });

  it('rejects placing through a wall from outside even when target footprint is clear', () => {
    const result = preview(toward([4, 1.6, -3.5], [0, 0, -3.5]), furniture(), house());
    expect(result).toMatchObject({valid: false, visible: true});
    expect(result.reason).toMatch(/terhalang|dinding/i);
  });

  it('uses closed/open door state both for footprint and camera line of sight', () => {
    const objects = house();
    const opening = getHouseOpenings(objects).find(o => o.kind === 'door')!;
    const states = {[opening.object!.id]: {active: true, usedAt: 0}};
    const edge = getHouseEdges({...DEFAULT_HOUSE, cells: [{x: 0, z: 0}]}).find(e => e.id === opening.edgeId)!;
    expect(preview(down(edge.x, edge.z, .8), furniture(), objects).valid).toBe(false);
    expect(preview(down(edge.x, edge.z, .8), furniture(), objects, states).valid).toBe(true);
    const ray = toward([0, 1.6, 0], [0, 0, -3.5]);
    expect(preview(ray, furniture(), objects).valid).toBe(false);
    expect(preview(ray, furniture(), objects, states).valid).toBe(true);
    const leaf = getHouseDoorLeaf(edge, true);
    expect(preview(down(leaf.x, leaf.z, .8), furniture(), objects, states).valid).toBe(false);
  });

  it('does not invent a closed door in the legacy open arch or interior walls', () => {
    expect(preview(toward([0, 1.6, 4], [0, 0, -2]), furniture()).valid).toBe(true);
  });

  it('treats the roof as build-cutaway, but keeps window sill and lintel boxes real', () => {
    const objects = house();
    expect(preview(down(0, -3.5, 8), furniture(), objects).valid).toBe(true);
    const window = getHouseOpenings(objects).find(o => o.kind === 'window')!.object!;
    expect(preview(down(window.x, window.z, .8), furniture(), objects).valid).toBe(false);
  });
});

describe('furniture placement ghost ownership and frame publication', () => {
  it('clones geometry AND array/shared materials, tints only clones, and disables raycasting', async () => {
    const {createFurnitureGhost} = await import('@/features/habitat/furniture-placement-scene');
    const source = new Group();
    const geometry = new BoxGeometry();
    const material = new MeshStandardMaterial({color: '#123456'});
    source.add(new Mesh(geometry, [material, material]), new Mesh(geometry, material));
    const ghost = createFurnitureGhost(source);
    const meshes = ghost.scene.children as Mesh[];
    const materials = meshes[0].material as MeshStandardMaterial[];
    expect(meshes[0].geometry).not.toBe(geometry);
    expect(meshes[1].geometry).toBe(meshes[0].geometry);
    expect(materials[0]).not.toBe(material);
    expect(materials[0]).toBe(materials[1]);
    expect(meshes[1].material).toBe(materials[0]);
    ghost.setValid(true);
    const green = materials[0].color.getHex();
    ghost.setValid(false);
    expect(materials[0].color.getHex()).not.toBe(green);
    expect(materials[0]).toMatchObject({transparent: true, opacity: .45, depthWrite: false});
    expect(material.color.getHexString()).toBe('123456');
    expect(material.opacity).toBe(1);
    expect(new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1)).intersectObject(ghost.scene, true)).toEqual([]);
    ghost.dispose(); geometry.dispose(); material.dispose();
  });

  it('disposes only owned geometry/materials, once per unique resource', async () => {
    const {createFurnitureGhost} = await import('@/features/habitat/furniture-placement-scene');
    const geometry = new BoxGeometry(), material = new MeshStandardMaterial();
    const source = new Group();
    source.add(new Mesh(geometry, material), new Mesh(geometry, material));
    const sourceGeometryDispose = vi.spyOn(geometry, 'dispose'), sourceMaterialDispose = vi.spyOn(material, 'dispose');
    const ghost = createFurnitureGhost(source);
    const mesh = ghost.scene.children[0] as Mesh;
    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
    const materialDispose = vi.spyOn(mesh.material as MeshStandardMaterial, 'dispose');
    ghost.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(sourceGeometryDispose).not.toHaveBeenCalled();
    expect(sourceMaterialDispose).not.toHaveBeenCalled();
    geometry.dispose(); material.dispose();
  });

  it('invalidates synchronously on mount and publishes changed center-camera previews at at most 10 Hz', async () => {
    const {default: FurniturePlacementScene} = await import('@/features/habitat/furniture-placement-scene');
    const onPreview = vi.fn();
    FurniturePlacementScene({object: furniture(), objects: [], states: {}, onPreview});
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview.mock.calls[0][0]).toMatchObject({valid: false, visible: false});
    const camera = new PerspectiveCamera();
    camera.position.set(0, 2, 7); camera.lookAt(0, 0, 4); camera.updateMatrixWorld(true);
    const frame = (elapsedTime: number) => hooks.frame!({camera, clock: {elapsedTime}});
    frame(0);
    expect(onPreview).toHaveBeenCalledTimes(2);
    expect(onPreview.mock.calls[1][0]).toMatchObject({valid: true, object: {x: 0, z: 4}});
    camera.rotateOnWorldAxis(new Vector3(0, 1, 0), Math.PI / 2); camera.updateMatrixWorld(true);
    frame(.05); frame(.09);
    expect(onPreview).toHaveBeenCalledTimes(2);
    frame(.101);
    expect(onPreview).toHaveBeenCalledTimes(3);
    expect(onPreview.mock.calls[2][0]).toMatchObject({object: {x: -3, z: 7}});
    frame(.21); frame(.32); frame(.43);
    expect(onPreview).toHaveBeenCalledTimes(3);
    camera.lookAt(-3, 5, 7); camera.updateMatrixWorld(true);
    frame(.54);
    expect(onPreview.mock.calls.at(-1)![0]).toMatchObject({valid: false, visible: false});
    hooks.cleanups.splice(0).reverse().forEach(cleanup => cleanup());
  });
});
