import {describe, expect, it} from 'vitest';
import {handleApi} from '@/server/api';
import {HABITAT_MAX_BODY_BYTES} from '@/server/habitat/read-json';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {actor, api, error, object, origin, world} from './habitat-fixtures';

describe('security: Habitat asset allowlist and strict writes', () => {
  it('resolves reviewed local metadata only, rejecting hostile/unknown IDs atomically', async () => {
    const owner = await actor('Asset Owner');
    const resolved = await api('habitat/assets/resolve', {ids: ['building-kit/column', 'ctrl-door', 'building-kit/column']}, owner.cookie);
    expect(resolved.status).toBe(200);
    const {assets} = await resolved.json() as {assets: Record<string, unknown>[]};
    expect(assets.map(a => a.id)).toEqual(['building-kit/column', 'ctrl-door']);
    expect(assets[0]).toMatchObject({kind: 'model', url: getBuildAsset('building-kit/column')!.url});
    expect(assets[1]).toMatchObject({kind: 'primitive', url: null});
    expect(String(assets[0].url).startsWith('/plaza/build-kit/')).toBe(true);
    for (const id of ['https://evil.invalid/model.glb', '../../private', 'javascript:alert(1)', '__proto__', 'ctrl-unknown', '/plaza/build-kit/building-kit/column.glb']) {
      const result = await api('habitat/assets/resolve', {ids: ['ctrl-door', id]}, owner.cookie);
      await error(result, 422, 'UNKNOWN_ASSET');
      await error(await api('habitat/save', {worldId: owner.worldId, revision: 0, objects: [{...object(), assetId: id}]}, owner.cookie), 422, 'UNKNOWN_ASSET');
    }
    await error(await api('habitat/assets/resolve', {ids: ['ctrl-door'], url: 'https://evil.invalid'}, owner.cookie), 422);
    await error(await api('habitat/assets/resolve', {ids: Array(121).fill('ctrl-door')}, owner.cookie), 422);
    expect((await world(owner.worldId, owner.cookie)).world).toMatchObject({revision: 0, objects: []});
    const allowed = {...object(), assetId: 'building-kit/column'};
    expect((await api('habitat/save', {worldId: owner.worldId, revision: 0, objects: [allowed]}, owner.cookie)).status).toBe(200);
  });

  it('rejects scripts, duplicate IDs, over-cap layouts, invalid transforms and private portal targets', async () => {
    const owner = await actor('Input Owner'), other = await actor('Portal Owner');
    const block = object();
    const save = (objects: unknown) => api('habitat/save', {worldId: owner.worldId, revision: 0, objects}, owner.cookie);
    for (const objects of [
      [{...block, script: 'alert(1)'}], [{...block, url: 'https://evil.invalid/model.glb'}],
      [block, block], Array.from({length: 121}, () => object()),
      [{...block, scale: 1e15}], [{...block, x: 1e15}],
      [{...block, behavior: 'switch', target: crypto.randomUUID()}],
    ]) await error(await save(objects), 422);
    // A syntactically valid UUID must not reveal a foreign private portal target.
    await error(await save([{...block, assetId: 'ctrl-portal', behavior: 'portal', target: other.worldId}]), 404);
    await error(await api('habitat/profile', {name: '<img onerror=alert(1)>', character: 'female'}, owner.cookie), 422);
    expect((await world(owner.worldId, owner.cookie)).world).toMatchObject({revision: 0, objects: []});
    expect((await save(Array.from({length: 120}, () => object()))).status).toBe(200);
  });

  it('denies cross-site, missing-origin, non-JSON and caller-supplied owner identities', async () => {
    const owner = await actor('Origin Owner');
    const payload = {worldId: owner.worldId, revision: 0, objects: []};
    for (const Origin of ['https://evil.invalid', '']) await error(await api('habitat/save', payload, owner.cookie, 'POST', {Origin}), 403);
    await error(await api('habitat/save', payload, owner.cookie, 'POST', {'Content-Type': 'text/plain'}), 415);
    await error(await api('habitat/save', {...payload, ownerId: owner.id}, owner.cookie), 422);
    expect((await world(owner.worldId, owner.cookie)).world?.revision).toBe(0);
  });
});

describe('security: streamed Habitat input budget at the authenticated API', () => {
  for (const declared of [undefined, '1']) {
    it(`cancels oversized UTF-8 streams with ${declared ? 'lying' : 'absent'} Content-Length and leaves state unchanged`, async () => {
      const owner = await actor('Stream Owner');
      const before = (await world(owner.worldId, owner.cookie)).world;
      const bytes = new TextEncoder().encode(JSON.stringify({worldId: owner.worldId, revision: 0, objects: [], padding: '界'.repeat(28_000)}));
      expect(bytes.byteLength).toBeGreaterThan(HABITAT_MAX_BODY_BYTES);
      const parts = [bytes.slice(0, 60_000), bytes.slice(60_000), new Uint8Array(40_000), new Uint8Array(40_000)];
      let read = 0, cancelled = false;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {if (read < parts.length) controller.enqueue(parts[read++]); else controller.close();},
        cancel() {cancelled = true;},
      }, {highWaterMark: 0});
      const request = new Request(`${origin}/api/habitat/save`, {
        method: 'POST', body: stream, duplex: 'half', headers: {
          Origin: origin, 'Content-Type': 'application/json', Cookie: owner.cookie,
          ...(declared ? {'Content-Length': declared} : {}),
        },
      } as RequestInit & {duplex: 'half'});
      await error(await handleApi(request, ['habitat', 'save']), 413, 'INPUT_TOO_LARGE');
      expect(cancelled).toBe(true);
      expect(read).toBe(2);
      expect((await world(owner.worldId, owner.cookie)).world).toEqual(before);
    });
  }

  it('rejects declared excess without consuming bytes and accepts valid JSON at exactly 80,000 bytes', async () => {
    const owner = await actor('Boundary Owner');
    const path = `${origin}/api/habitat/save`;
    const headers = {Origin: origin, 'Content-Type': 'application/json', Cookie: owner.cookie};
    const oversized = new Request(path, {method: 'POST', body: '{}', headers: {...headers, 'Content-Length': String(HABITAT_MAX_BODY_BYTES + 1)}});
    await error(await handleApi(oversized, ['habitat', 'save']), 413, 'INPUT_TOO_LARGE');
    expect(oversized.bodyUsed).toBe(false);
    const json = JSON.stringify({worldId: owner.worldId, revision: 0, objects: []});
    const exact = json + ' '.repeat(HABITAT_MAX_BODY_BYTES - new TextEncoder().encode(json).byteLength);
    expect(new TextEncoder().encode(exact).byteLength).toBe(HABITAT_MAX_BODY_BYTES);
    expect((await handleApi(new Request(path, {method: 'POST', body: exact, headers}), ['habitat', 'save'])).status).toBe(200);
    expect((await world(owner.worldId, owner.cookie)).world?.revision).toBe(1);
  });
});
