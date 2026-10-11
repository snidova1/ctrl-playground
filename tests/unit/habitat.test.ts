import {describe, expect, it} from 'vitest';
import {generatePrivateKey, privateKeyToAccount} from 'viem/accounts';
import {handleApi} from '@/server/api';
import {exec, one} from '@/db';
import {BUILD_ASSETS} from '@/features/plaza/build-assets';
import {motionSchema, type HabitatState, type WorldObject} from '@/domain/habitat';
import {eyeVariants,hairVariants,outfitVariants,skinVariants} from '@/features/plaza/characters/catalog';

const origin = 'http://localhost:3000';
function call(path: string, cookie = '', data?: unknown, method = data === undefined ? 'GET' : 'POST', extra: Record<string, string> = {}) {
  return handleApi(new Request(`${origin}/api/${path}`, {method,
    headers: {Cookie: cookie, ...(data === undefined ? {} : {'Content-Type': 'application/json', Origin: origin}), ...extra},
    ...(data === undefined ? {} : {body: JSON.stringify(data)}),
  }), path.split('/'));
}
async function player(name = 'Player') {
  const account = privateKeyToAccount(generatePrivateKey());
  const ip = crypto.randomUUID();
  const nonce = await (await call('auth/nonce', '', {address: account.address}, 'POST', {'cf-connecting-ip': ip})).json() as {nonce: string; message: string};
  const auth = await call('auth/verify', '', {address: account.address, nonce: nonce.nonce, signature: await account.signMessage({message: nonce.message})}, 'POST', {'cf-connecting-ip': ip});
  expect(auth.status).toBe(200);
  const cookie = auth.headers.get('set-cookie')!.split(';')[0];
  const res = await call('habitat/profile', cookie, {name, character: 'female'});
  expect(res.status).toBe(200);
  const state = await res.json() as HabitatState;
  return {cookie, wallet: account.address, id: state.profile!.id, world: state.world!, profile: state.profile!};
}
function object(overrides: Partial<WorldObject> = {}): WorldObject {
  return {id: crypto.randomUUID(), assetId: BUILD_ASSETS[0].id, name: 'Object', x: 0, y: 0, z: 6, rotation: 0, scale: 1, behavior: 'decoration', target: '', ...overrides};
}
async function load(cookie: string, id: string) {
  const res = await call(`habitat/worlds/${id}`, cookie);
  expect(res.status).toBe(200);
  return res.json() as Promise<HabitatState>;
}

describe('persistent wallet worlds through real API and SQLite', () => {
  it('requires wallet signatures, rejects demo writes and CSRF', async () => {
    expect((await call('habitat/profile', '', {name: 'Guest', character: 'male'})).status).toBe(401);
    const demo = await call('auth/demo', '', {}, 'POST', {'cf-connecting-ip': crypto.randomUUID()});
    expect((await call('habitat/profile', demo.headers.get('set-cookie')!, {name: 'Demo', character: 'male'})).status).toBe(401);
    const p = await player();
    expect((await call('habitat/profile', p.cookie, {name: 'CSRF', character: 'male'}, 'POST', {Origin: 'https://evil.invalid'})).status).toBe(403);
  });
  it('persists one home and compatible server-generated loadout across onboarding updates', async () => {
    const p = await player();
    expect(['original', 'sage', 'clay', 'slate']).toContain(p.profile.variant);
    const updated = await call('habitat/profile', p.cookie, {name: 'Updated', character: 'male'});
    const state = await updated.json() as HabitatState;
    expect(state.homeId).toBe(p.world.id);
    expect(outfitVariants.map(v=>v.id)).toContain(state.profile?.appearance?.variantId);
    expect(hairVariants.map(v=>v.id)).toContain(state.profile?.appearance?.hairId);
    expect(eyeVariants.map(v=>v.id)).toContain(state.profile?.appearance?.eyeId);
    expect(skinVariants.map(v=>v.id)).toContain(state.profile?.appearance?.skinId);
    expect(state.profile?.appearance?.gender).toBe('male');
    expect(state.profile?.loadout.characterId).toBe('vroid-fumiriya');
    expect(state.profile?.loadout.appearance).toEqual(state.profile?.appearance);
    expect((await load(p.cookie, p.world.id)).profile).toEqual(state.profile);
    expect((await one<{n: number}>('SELECT COUNT(*) AS n FROM habitat_worlds WHERE owner_id=?', p.id))?.n).toBe(1);
    const chosen={version:1 as const,gender:'female' as const,variantId:'sage' as const,hairId:'auburn' as const,eyeId:'jade' as const,skinId:'warm' as const};
    const saved=await (await call('habitat/profile',p.cookie,{name:'Styled',character:'female',variant:'sage',appearance:chosen})).json() as HabitatState;
    expect(saved.profile?.appearance).toEqual(chosen);
    expect((await load(p.cookie,p.world.id)).profile?.appearance).toEqual(chosen);
    const randomized=await (await call('habitat/profile',p.cookie,{name:'Randomized',character:'female',randomize:true})).json() as HabitatState;
    expect(randomized.profile?.appearance).not.toEqual(chosen);
    expect(randomized.profile?.appearance?.gender).toBe('female');
    expect((await call('habitat/profile', p.cookie, {name: 'Invalid', character: 'male', variant: 'remote-url'})).status).toBe(422);
    expect((await call('habitat/profile',p.cookie,{name:'Invalid',character:'female',appearance:{...chosen,hairId:'remote-url'}})).status).toBe(422);
    expect((await call('habitat/profile', p.cookie, {name: 'Invalid', character: 'male', ownerId: 'other'})).status).toBe(422);
  });
  it('hides private worlds, allows public visitors and separates editor from owner privileges', async () => {
    const owner = await player('Owner'), member = await player('Member'), visitor = await player('Visitor');
    const path = `habitat/worlds/${owner.world.id}`;
    expect((await call(path, visitor.cookie)).status).toBe(404);
    expect((await call(`${path}/members`, owner.cookie, {wallet: member.wallet, role: 'editor'})).status).toBe(200);
    expect((await load(member.cookie, owner.world.id)).permissions).toMatchObject({role: 'editor', canEdit: true, canManage: false});
    expect((await call(`${path}/settings`, member.cookie, {name: 'Taken', visibility: 'public'})).status).toBe(403);
    expect((await call(`${path}/members`, member.cookie, {wallet: visitor.wallet, role: 'editor'})).status).toBe(403);
    expect((await call(`${path}/objects`, member.cookie, {revision: 0, object: object()})).status).toBe(200);
    expect((await call(`${path}/settings`, owner.cookie, {name: 'Open', visibility: 'public', revision: 1})).status).toBe(200);
    expect((await load(visitor.cookie, owner.world.id)).canEdit).toBe(false);
    expect((await call(`${path}/objects`, visitor.cookie, {revision: 2, object: object()})).status).toBe(403);
    const listing = await (await call('habitat/worlds', visitor.cookie)).json() as {worlds: {id: string}[]};
    expect(listing.worlds.some((w: {id: string}) => w.id === owner.world.id)).toBe(true);
    expect((await call(`${path}/members/${member.id}`, owner.cookie, {}, 'DELETE')).status).toBe(200);
    expect((await call(`${path}/objects`, member.cookie, {revision: 2, object: object()})).status).toBe(403);
  });
  it('creates, patches, reloads and deletes catalog objects with revision conflicts', async () => {
    const p = await player(), o = object(), path = `habitat/worlds/${p.world.id}/objects`;
    expect((await call(path, p.cookie, {revision: 0, object: o})).status).toBe(200);
    expect((await load(p.cookie, p.world.id)).world?.objects).toEqual([o]);
    expect((await call(`${path}/${o.id}`, p.cookie, {revision: 0, object: {x: 2}}, 'PATCH')).status).toBe(409);
    expect((await call(`${path}/${o.id}`, p.cookie, {revision: 1, object: {x: 2, rotation: 1}}, 'PATCH')).status).toBe(200);
    expect((await load(p.cookie, p.world.id)).world?.objects[0]).toMatchObject({x: 2, rotation: 1});
    expect((await call(`${path}/${o.id}`, p.cookie, {revision: 2}, 'DELETE')).status).toBe(200);
    expect((await load(p.cookie, p.world.id)).world?.objects).toEqual([]);
  });
  it('enforces asset allowlist, transform bounds, strict input and object limits', async () => {
    const p = await player();
    const save = (objects: unknown[]) => call('habitat/save', p.cookie, {worldId: p.world.id, revision: 0, objects});
    expect((await save([object({assetId: 'https://evil.invalid/model.glb'})])).status).toBe(422);
    expect((await save([object({scale: 0})])).status).toBe(422);
    expect((await save([object({x: 100})])).status).toBe(422);
    expect((await save([{...object(), script: 'alert(1)'}])).status).toBe(422);
    const duplicate = object();
    expect((await save([duplicate, duplicate])).status).toBe(422);
    expect((await save(Array.from({length: 121}, () => object()))).status).toBe(422);
    expect((await save([object({behavior: 'switch', target: crypto.randomUUID()})])).status).toBe(422);
    expect((await load(p.cookie, p.world.id)).world?.revision).toBe(0);
    const assets = await call('habitat/assets/resolve', p.cookie, {ids: [BUILD_ASSETS[0].id, 'ctrl-block']});
    expect(assets.status).toBe(200);
    expect(((await assets.json()) as {assets: {url: string}[]}).assets[0].url).toMatch(/^\/plaza\/build-kit\//);
    expect((await call('habitat/assets/resolve', p.cookie, {ids: ['unknown']})).status).toBe(422);
  });
  it('accepts only one competing save at a revision without losing winner data', async () => {
    const p = await player();
    const a = object(), b = object();
    const results = await Promise.all([a, b].map(o => call('habitat/save', p.cookie, {worldId: p.world.id, revision: 0, objects: [o]})));
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const saved = await load(p.cookie, p.world.id);
    expect(saved.world?.revision).toBe(1);
    expect(saved.world?.objects).toEqual([results[0].status === 200 ? a : b]);
  });
  it('joins real players, syncs motion/loadout, rejects replay and leaves without phantom users', async () => {
    const owner = await player('Host'), visitor = await player('Visitor');
    await call(`habitat/worlds/${owner.world.id}/settings`, owner.cookie, {name: 'Shared', visibility: 'public'});
    expect((await load(owner.cookie, owner.world.id)).players).toEqual([]);
    const hostState = await (await call('habitat/join', owner.cookie, {id: owner.world.id})).json() as HabitatState;
    const joined = await (await call('habitat/join', visitor.cookie, {id: owner.world.id})).json() as HabitatState;
    expect(joined.players.map(p => p.id).sort()).toEqual([owner.id, visitor.id].sort());
    const data = {worldId: owner.world.id, sessionId: joined.presenceSession!.id, sequence: 1, x: .3, z: 6, angle: 1, motion: motionSchema.parse({moving: true})};
    expect((await call('habitat/presence', visitor.cookie, data)).status).toBe(200);
    expect((await call('habitat/presence', visitor.cookie, data)).status).toBe(409);
    expect((await call('habitat/presence', owner.cookie, {...data, sequence: 2})).status).toBe(409);
    expect((await call('habitat/presence', visitor.cookie, {...data, sequence: 2, x: 14})).status).toBe(422);
    const visible = (await load(owner.cookie, owner.world.id)).players.find(p => p.id === visitor.id)!;
    expect(visible.motion.moving).toBe(true);
    expect(visible.loadout).toEqual(visitor.profile.loadout);
    await call('habitat/leave', visitor.cookie, {worldId: owner.world.id, sessionId: data.sessionId});
    expect((await load(owner.cookie, owner.world.id)).players.map(p => p.id)).toEqual([owner.id]);
    expect(hostState.presenceSession).not.toBeNull();
  });
  it('reconnect supersedes old connection; stale leave cannot remove new presence', async () => {
    const p = await player();
    const first = await (await call('habitat/join', p.cookie, {id: p.world.id})).json() as HabitatState;
    const next = await (await call('habitat/join', p.cookie, {id: p.world.id})).json() as HabitatState;
    expect(first.presenceSession!.id).not.toBe(next.presenceSession!.id);
    await call('habitat/leave', p.cookie, {worldId: p.world.id, sessionId: first.presenceSession!.id});
    expect((await load(p.cookie, p.world.id)).players).toHaveLength(1);
    const pose = {worldId: p.world.id, sessionId: first.presenceSession!.id, sequence: 1, x: 0, z: 6, angle: 0, motion: {}};
    expect((await call('habitat/presence', p.cookie, pose)).status).toBe(409);
    await exec('UPDATE habitat_presence SET seen_at=? WHERE profile_id=?', Date.now() - 20000, p.id);
    expect((await load(p.cookie, p.world.id)).players).toEqual([]);
    expect((await call('habitat/presence', p.cookie, {...pose, sessionId: next.presenceSession!.id})).status).toBe(409);
    expect((await call('habitat/join', p.cookie, {id: p.world.id})).status).toBe(200);
  });
  it('revokes private world visits and presence immediately', async () => {
    const owner = await player(), visitor = await player();
    const path = `habitat/worlds/${owner.world.id}`;
    await call(`${path}/members`, owner.cookie, {wallet: visitor.wallet, role: 'visitor'});
    await call('habitat/join', visitor.cookie, {id: owner.world.id});
    expect((await load(owner.cookie, owner.world.id)).players).toHaveLength(1);
    await call(`${path}/members/${visitor.id}`, owner.cookie, {}, 'DELETE');
    expect((await load(owner.cookie, owner.world.id)).players).toEqual([]);
    expect((await call(path, visitor.cookie)).status).toBe(404);
    expect((await call('habitat/join', visitor.cookie, {id: owner.world.id})).status).toBe(404);
  });
  it('persists real interaction state and cleans it on object deletion', async () => {
    const p = await player(), lamp = object({assetId: 'ctrl-lamp', behavior: 'light'});
    await call('habitat/save', p.cookie, {worldId: p.world.id, revision: 0, objects: [lamp]});
    expect((await call('habitat/use', p.cookie, {id: lamp.id})).status).toBe(422);
    await call('habitat/join', p.cookie, {id: p.world.id});
    expect((await call('habitat/use', p.cookie, {id: lamp.id})).status).toBe(200);
    expect((await load(p.cookie, p.world.id)).states[lamp.id].active).toBe(true);
    await call(`habitat/worlds/${p.world.id}/objects/${lamp.id}`, p.cookie, {revision: 1}, 'DELETE');
    expect((await load(p.cookie, p.world.id)).states).toEqual({});
  });
});
