import {describe, expect, it} from 'vitest';
import {ASSET_MANIFEST} from '@/game/client/asset-manifest';
import {collectAssets} from '../../scripts/gen-asset-manifest.mjs';

describe('start-screen asset manifest', () => {
  it('lists every model, motion and icon the game loads (run scripts/gen-asset-manifest.mjs if this fails)', async () => {
    const current = (await collectAssets()) as {url: string; bytes: number}[];
    expect(ASSET_MANIFEST).toEqual(current);
  });
  it('includes the character bodies and their motions', () => {
    const urls = ASSET_MANIFEST.map(f => f.url);
    for (const body of ['female', 'female-b', 'male', 'male-b']) expect(urls).toContain(`/characters/${body}.vrm`);
    expect(urls).toContain('/characters/humanoid-motions.glb');
  });
});
