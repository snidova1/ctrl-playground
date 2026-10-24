import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {Color, Group, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry} from 'three';
import type {RootState} from '@react-three/fiber';

const hooks = vi.hoisted(() => ({frame: vi.fn(), effect: vi.fn(), store: vi.fn()}));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: hooks.effect,
  useSyncExternalStore: hooks.store,
}));
vi.mock('@react-three/fiber', () => ({useFrame: hooks.frame}));
vi.mock('@react-three/drei', () => ({RoundedBox: () => null}));
vi.mock('../../features/habitat/cozy-village', () => ({default: () => null}));
vi.mock('../../features/habitat/stylized-meadow', () => ({default: () => null}));
vi.mock('../../features/habitat/stylized-canopy', () => ({default: () => null}));
vi.mock('../../features/habitat/stylized-water', () => ({default: () => null}));

import {DecorSway, decorMotionAllowed, decorSwayAt, subscribeDecorMotion, useDecorMotion} from '../../features/habitat/room-details';
import {distantHillLayout} from '../../features/habitat/cozy-environment';
import {ATMOSPHERE_PRESETS} from '../../features/habitat/atmosphere-presets';

function browser(reduced = false, visibilityState = 'visible') {
  const preference = {matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn()};
  const document = {visibilityState, addEventListener: vi.fn(), removeEventListener: vi.fn()};
  const matchMedia = vi.fn(() => preference);
  vi.stubGlobal('window', {matchMedia});
  vi.stubGlobal('document', document);
  return {preference, document, matchMedia};
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('cozy decorative motion', () => {
  it('is safe and static without a browser or media-query support', () => {
    expect(decorMotionAllowed()).toBe(false);
    expect(subscribeDecorMotion(vi.fn())()).toBeUndefined();
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {visibilityState: 'visible'});
    expect(decorMotionAllowed()).toBe(false);
  });

  it('honors live reduced-motion and background-tab preferences', () => {
    const {preference, document, matchMedia} = browser();
    expect(decorMotionAllowed()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    preference.matches = true;
    expect(decorMotionAllowed()).toBe(false);
    preference.matches = false;
    document.visibilityState = 'hidden';
    expect(decorMotionAllowed()).toBe(false);
  });

  it('subscribes to both changes and removes the exact listeners on cleanup', () => {
    const {preference, document} = browser();
    const onChange = vi.fn();
    const cleanup = subscribeDecorMotion(onChange);
    expect(preference.addEventListener).toHaveBeenCalledWith('change', onChange);
    expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', onChange);
    // Dispatch through the callback actually registered with the media query.
    preference.addEventListener.mock.calls[0][1]();
    expect(onChange).toHaveBeenCalledOnce();
    cleanup();
    expect(preference.removeEventListener).toHaveBeenCalledWith('change', onChange);
    expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', onChange);
  });

  it('keeps the low-quality path and server snapshot still even when motion is allowed', () => {
    browser();
    hooks.store.mockImplementation((_subscribe, getSnapshot, getServerSnapshot) => {
      expect(getServerSnapshot()).toBe(false);
      return getSnapshot();
    });
    expect(useDecorMotion(false)).toBe(false);
    expect(useDecorMotion(true)).toBe(true);
  });

  it('is deterministic, bounded below one degree, and independent of frame rate', () => {
    for (let frame = 0; frame < 1800; frame++) {
      const t = frame / 30;
      expect(Math.abs(decorSwayAt(t, .4))).toBeLessThanOrEqual(.014);
      expect(decorSwayAt(t, .4)).toBe(decorSwayAt(frame * 2 / 60, .4));
    }
    expect(decorSwayAt(0)).toBe(0);
    expect(decorSwayAt(4, .4)).not.toBe(decorSwayAt(4, 1.8));
  });

  it('updates the real Three group, preserves other axes, and resets when motion stops', () => {
    const group = new Group();
    group.rotation.set(.2, .3, 0);
    expect(DecorSway({target: {current: group}, phase: 1.2, amount: .6})).toBeNull();
    const frame = hooks.frame.mock.calls[0][0] as (state: RootState) => void;
    frame({clock: {elapsedTime: 4}} as RootState);
    expect(group.rotation.z).toBeCloseTo(decorSwayAt(4, 1.2) * .6);
    expect(group.rotation.x).toBe(.2);
    expect(group.rotation.y).toBe(.3);
    const cleanup = hooks.effect.mock.calls[0][0]() as () => void;
    cleanup();
    expect(group.rotation.z).toBe(0);
  });

  it('tolerates a disappearing pendant without frame errors', () => {
    DecorSway({target: {current: null}});
    const frame = hooks.frame.mock.calls[0][0] as (state: RootState) => void;
    expect(() => frame({clock: {elapsedTime: 4}} as RootState)).not.toThrow();
    const cleanup = hooks.effect.mock.calls[0][0]() as () => void;
    expect(cleanup).not.toThrow();
  });
});

describe('cozy horizon batch', () => {
  it('preserves all fourteen authored silhouettes and their transforms outside the editable plot', () => {
    const hills = distantHillLayout('afternoon');
    expect(hills).toHaveLength(14);
    hills.forEach((hill, i) => {
      const a = i / 14 * Math.PI * 2;
      expect(hill.position).toEqual([Math.cos(a) * 36, -3, Math.sin(a) * 31]);
      expect(hill.scale).toEqual([8 + i % 3, 5 + i % 2, 7]);
      expect(Math.hypot(hill.position[0], hill.position[2])).toBeGreaterThanOrEqual(31);
    });
    expect(hills).toEqual(distantHillLayout('afternoon'));
  });

  it('changes only the atmospheric palette, never geometry or object placement', () => {
    const base = distantHillLayout('afternoon');
    for (const atmosphere of ATMOSPHERE_PRESETS) {
      const hills = distantHillLayout(atmosphere);
      expect(hills.map(({position, scale}) => ({position, scale}))).toEqual(base.map(({position, scale}) => ({position, scale})));
      expect(new Set(hills.map(hill => hill.color)).size).toBe(2);
      expect(hills.every(hill => /^#[0-9a-f]{6}$/.test(hill.color))).toBe(true);
    }
    expect(distantHillLayout('dusk')[0].color).not.toBe(base[0].color);
  });

  it('packs valid transforms and colors into a single Three instanced mesh with a correct bounding sphere', () => {
    const hills = distantHillLayout('dusk');
    const mesh = new InstancedMesh(new SphereGeometry(1, 10, 6), new MeshStandardMaterial(), hills.length);
    const transform = new Object3D();
    hills.forEach((hill, i) => {
      transform.position.set(...hill.position);
      transform.scale.set(...hill.scale);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      mesh.setColorAt(i, new Color(hill.color));
    });
    mesh.computeBoundingSphere();
    expect(mesh.count).toBe(14);
    expect(mesh.instanceColor?.count).toBe(14);
    expect(mesh.boundingSphere?.radius).toBeGreaterThan(36);
    // Three unions instance spheres incrementally; its result is conservative,
    // not the minimum sphere around this roughly circular arrangement.
    expect(Number.isFinite(mesh.boundingSphere!.radius)).toBe(true);
    for (const hill of hills) {
      transform.position.set(...hill.position);
      expect(mesh.boundingSphere!.center.distanceTo(transform.position) + Math.max(...hill.scale)).toBeLessThanOrEqual(mesh.boundingSphere!.radius + .00001);
    }
    mesh.geometry.dispose();
    (mesh.material as MeshStandardMaterial).dispose();
    mesh.dispose();
  });
});

describe('cozy polish scope guards', () => {
  it('keeps the existing empty-plot gates and does not introduce particles or shadow-casting lights', () => {
    const environment = readFileSync('features/habitat/cozy-environment.tsx', 'utf8');
    const room = readFileSync('features/habitat/room-details.tsx', 'utf8');
    const cottage = readFileSync('features/habitat/cottage-details.tsx', 'utf8');
    expect(environment).toContain('!hideHome&&trees.map');
    expect(environment).toContain('!hideHome&&quality');
    expect(environment).toContain("name='cozy-distant-hills'");
    expect(environment).toContain("quality === 'low' ? [1, 10, 6] : [1, 20, 12]");
    expect(room).toContain("useDecorMotion(quality === 'high')");
    expect(cottage).toContain("useDecorMotion(quality==='high')");
    expect(cottage).toContain("name='cottage-lantern-pendant'");
    for (const source of [environment, room, cottage]) {
      expect(source).not.toMatch(/Math\.random|<pointLight|<spotLight|<points\b|setInterval|setTimeout/);
    }
  });
});
