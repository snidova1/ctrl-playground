import {beforeAll, describe, expect, it} from 'vitest';
import {handleApi} from '@/server/api';
import {exec} from '@/db';
import {createSession} from '@/server/wallet/auth';
import {randomAppearance} from '@/game/core/appearance';
import type {HabitatState, LifeResponse, FriendsResponse} from '@/game/core/api-types';

const ORIGIN = 'http://localhost:3000';
async function wallet(n: number) {
  const address = `0x${String(n).padStart(40, '0')}`;
  const id = `wallet-${address}`;
  await exec('INSERT OR IGNORE INTO users(id,wallet,demo,created_at) VALUES(?,?,0,?)', id, address, new Date().toISOString());
  const cookie = (await createSession(id, false)).split(';')[0];
  return {id, cookie};
}
async function call<T>(cookie: string | null, path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<{status: number; data: T}> {
  const headers: Record<string, string> = {origin: ORIGIN};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await handleApi(new Request(`${ORIGIN}/api/${path}`, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)}), path.split('?')[0].split('/'));
  return {status: res.status, data: await res.json() as T};
}

let alice: {id: string; cookie: string}, bob: {id: string; cookie: string};
beforeAll(async () => {
  alice = await wallet(1);
  bob = await wallet(2);
});

describe('api', () => {
  it('serves health and refuses anonymous life', async () => {
    expect((await call(null, 'health')).status).toBe(200);
    expect((await call(null, 'life')).status).toBe(401);
  });

  it('creates an avatar and a starter Habitat for a signed wallet', async () => {
    const r = await call<{profile: {name: string}}>(alice.cookie, 'habitat/public-profile', {name: 'Alice', appearance: randomAppearance('a')});
    expect(r.status).toBe(200);
    expect(r.data.profile.name).toBe('Alice');
    const home = await call<HabitatState>(alice.cookie, 'habitat/home', {});
    expect(home.status).toBe(200);
    expect(home.data.world?.layout.length).toBeGreaterThan(5);
    expect(home.data.permissions?.role).toBe('owner');
  });

  it('runs server-authoritative life actions with revision checks', async () => {
    const first = await call<LifeResponse>(alice.cookie, 'life');
    expect(first.data.state.coins).toBe(500);
    const buy = await call<LifeResponse>(alice.cookie, 'life', {revision: first.data.state.revision, action: {type: 'buy', item: 'carrot-seed', quantity: 1}});
    expect(buy.status).toBe(200);
    expect(buy.data.state.coins).toBe(485);
    const stale = await call<{code: string}>(alice.cookie, 'life', {revision: first.data.state.revision, action: {type: 'buy', item: 'carrot-seed', quantity: 1}});
    expect(stale.status).toBe(409);
    const bad = await call<{code: string}>(alice.cookie, 'life', {revision: buy.data.state.revision, action: {type: 'sell', item: 'bed-single', quantity: 1}});
    expect(bad.data.code).toBe('ITEM_PLACED');
  });

  it('refuses wearing fashion you do not own', async () => {
    const look = {...randomAppearance('b'), top: 4};
    const r = await call<{code: string}>(alice.cookie, 'habitat/public-profile', {name: 'Alice', appearance: look});
    expect(r.data.code).toBe('FASHION_NOT_OWNED');
  });

  it('keeps private homes hidden until friendship, then allows visiting and gifts', async () => {
    await call(bob.cookie, 'habitat/public-profile', {name: 'Bob', appearance: randomAppearance('c')});
    const aliceHome = (await call<HabitatState>(alice.cookie, 'habitat/state')).data.homeId!;
    expect((await call(bob.cookie, `habitat/worlds/${aliceHome}`)).status).toBe(404);
    await call(bob.cookie, 'friends/request', {id: alice.id});
    const accepted = await call<FriendsResponse>(alice.cookie, 'friends/accept', {id: bob.id});
    expect(accepted.data.friends.map(f => f.id)).toContain(bob.id);
    const visit = await call<HabitatState>(bob.cookie, `habitat/worlds/${aliceHome}`);
    expect(visit.status).toBe(200);
    expect(visit.data.permissions?.canEdit).toBe(false);
    const save = await call<{code: string}>(bob.cookie, 'habitat/save', {worldId: aliceHome, revision: visit.data.world!.revision, layout: []});
    expect(save.status).toBe(403);
    const gift = await call<{ok: boolean}>(alice.cookie, 'friends/gift', {id: bob.id, item: 'carrot-seed', quantity: 1});
    expect(gift.data.ok).toBe(true);
    const mail = await call<FriendsResponse>(bob.cookie, 'friends');
    expect(mail.data.mail[0]?.item).toBe('carrot-seed');
    const claim = await call<FriendsResponse & {state: LifeResponse['state']}>(bob.cookie, 'friends/mail/claim', {id: mail.data.mail[0].id});
    expect(claim.data.state.inventory['carrot-seed']).toBe(5); // 4 starter seeds + the gift
  });

  it('rejects placing furniture you do not own', async () => {
    const state = (await call<HabitatState>(alice.cookie, 'habitat/state')).data;
    const layout = [...state.world!.layout, {id: crypto.randomUUID(), assetId: 'fountain', x: 10, z: -9, rotation: 0, room: false}];
    const r = await call<{code: string}>(alice.cookie, 'habitat/save', {worldId: state.world!.id, revision: state.world!.revision, layout});
    expect(r.data.code).toBe('FURNITURE_NOT_OWNED');
  });

  it('tracks town presence for real players only and rejects teleports', async () => {
    const a = await call<{players: unknown[]}>(alice.cookie, 'town/presence', {x: 0, z: 12, angle: 0, anim: 'idle'});
    expect(a.status).toBe(200);
    const b = await call<{players: {name: string}[]}>(bob.cookie, 'town/presence', {x: 1, z: 12, angle: 0, anim: 'walk', emote: 'wave'});
    expect(b.data.players.map(p => p.name)).toContain('Alice');
    const jump = await call<{code: string}>(alice.cookie, 'town/presence', {x: 40, z: -40, angle: 0, anim: 'run'});
    expect(jump.data.code).toBe('MOVE_TOO_FAST');
  });

  it('reports World Keys as not deployed without configuration', async () => {
    const home = (await call<HabitatState>(alice.cookie, 'habitat/state')).data.homeId!;
    const keys = await call<{status: string}>(alice.cookie, `habitat/worlds/${home}/keys`);
    expect(keys.data.status).toBe('not-deployed');
  });

  it('requires same-origin JSON writes', async () => {
    const res = await handleApi(new Request(`${ORIGIN}/api/life`, {method: 'POST', headers: {cookie: alice.cookie, origin: 'https://evil.example', 'content-type': 'application/json'}, body: '{}'}), ['life']);
    expect(res.status).toBe(403);
  });
});
