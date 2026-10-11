import {describe, it, expect} from 'vitest';
import {one, query} from '@/db';
import type {HabitatState} from '@/domain/habitat';
import {kitBlueprint, plots, type Snapshot} from '@/features/plaza/types';
import {actor, api, cookieFrom, error, object, signedWallet, world} from './habitat-fixtures';

describe('security: signed-wallet Habitat boundary and durable state', () => {
  it('denies unsigned guests profile/state/writes with 401 while courtyard play still works', async () => {
    const joined = await api('plaza/join', {name: 'Courtyard Guest'});
    expect(joined.status).toBe(201);
    const guest = cookieFrom(joined);
    const snapshot = await joined.json() as Snapshot;
    const counts = () => query<{name: string; count: number}>(
      `SELECT 'profiles' AS name,COUNT(*) AS count FROM habitat_profiles
       UNION ALL SELECT 'worlds',COUNT(*) FROM habitat_worlds
       UNION ALL SELECT 'presence',COUNT(*) FROM habitat_presence
       UNION ALL SELECT 'objects',COUNT(*) FROM habitat_object_state`);
    const before = await counts();
    const id = crypto.randomUUID();
    for (const [path, payload, method] of [
      ['profile', undefined, 'GET'], ['state', undefined, 'GET'],
      ['profile', {name: 'Guest Home', character: 'female', variant: 'original'}, 'POST'],
      ['save', {worldId: id, revision: 0, objects: [object()]}, 'POST'],
      ['settings', {name: 'Guest Realm', visibility: 'public'}, 'POST'],
      [`worlds/${id}/objects`, {worldId: id, revision: 0, objects: []}, 'PUT'],
      [`worlds/${id}/members`, {wallet: '0x' + '1'.repeat(40), role: 'editor'}, 'POST'],
      ['join', {id}, 'POST'], ['use', {id: crypto.randomUUID()}, 'POST'],
    ] as const) {
      await error(await api(`habitat/${path}`, payload, guest, method), 401, 'WALLET_SESSION_REQUIRED');
    }
    expect(await counts()).toEqual(before);
    expect((await api('plaza/state', undefined, guest)).status).toBe(200);
    expect((await api('plaza/pose', {x: 0, z: 6, angle: 0, moving: false}, guest)).status).toBe(200);
    const placed = crypto.randomUUID();
    expect((await api('plaza/place', {id: placed, blueprint: kitBlueprint('A green planter'),
      ...plots[snapshot.me.plot], rotation: 0}, guest)).status).toBe(201);
    expect((await api('plaza/remove', {id: placed}, guest)).status).toBe(200);
  });

  it('denies demo/forged sessions but preserves exactly one durable home for a real signed wallet', async () => {
    const demo = await api('auth/demo', {});
    expect(demo.status).toBe(200);
    for (const cookie of [cookieFrom(demo), 'ctrl_session=forged', '']) {
      await error(await api('habitat/profile', {name: 'Not Wallet', character: 'female'}, cookie), 401);
      await error(await api('habitat/state', undefined, cookie), 401);
    }
    const owner = await actor('Durable Owner');
    const update = await api('habitat/profile', {name: 'Updated Owner', character: 'male', variant: 'sage'}, owner.cookie);
    expect(update.status).toBe(200);
    expect((await update.json() as HabitatState).homeId).toBe(owner.worldId);
    expect(await one('SELECT COUNT(*) AS count FROM habitat_worlds WHERE owner_id=?', owner.id)).toEqual({count: 1});
    const block = object();
    const saved = await api('habitat/save', {worldId: owner.worldId, revision: 0, objects: [block]}, owner.cookie);
    expect(saved.status).toBe(200);
    const reloaded = await world(owner.worldId, owner.cookie);
    expect(reloaded.profile).toMatchObject({id: owner.id, name: 'Updated Owner', character: 'male', variant: 'sage'});
    expect(reloaded.world).toMatchObject({ownerId: owner.id, revision: 1, objects: [block]});
    expect(reloaded.keyStatus).toBe('not-deployed');
  });
});

describe('security: cross-wallet discovery, member ACL and revocation', () => {
  it('hides private worlds and denies foreign writes; public visibility grants no editor/owner authority', async () => {
    const owner = await actor('Private Owner'), outsider = await actor('Foreign Visitor');
    const path = `habitat/worlds/${owner.worldId}`;
    for (const suffix of ['', '/permissions', '/members']) await error(await api(path + suffix, undefined, outsider.cookie), 404);
    await error(await api('habitat/join', {id: owner.worldId}, outsider.cookie), 404);
    // Privacy denial is 404, not revision-conflict 409: do not reveal that a private world exists.
    await error(await api('habitat/save', {worldId: owner.worldId, revision: 0, objects: []}, outsider.cookie), 404);
    const listing = await api('habitat/worlds', undefined, outsider.cookie);
    expect((await listing.json() as {worlds: {id: string}[]}).worlds.some(w => w.id === owner.worldId)).toBe(false);
    expect((await api(path + '/settings', {name: 'Public Realm', visibility: 'public', revision: 0}, owner.cookie)).status).toBe(200);
    const visit = await api('habitat/join', {id: owner.worldId}, outsider.cookie);
    expect(visit.status).toBe(200);
    expect((await visit.json() as HabitatState).permissions).toEqual({role: 'visitor', canVisit: true, canEdit: false, canManage: false});
    const id = object().id;
    for (const [suffix, method, payload] of [
      ['/objects', 'PUT', {worldId: owner.worldId, revision: 1, objects: [object(id)]}],
      ['/objects', 'POST', {revision: 1, object: object(id)}],
      [`/objects/${id}`, 'PATCH', {revision: 1, object: {name: 'Hijacked'}}],
      [`/objects/${id}`, 'DELETE', {revision: 1}],
      ['/settings', 'POST', {name: 'Hijacked', visibility: 'private', revision: 1}],
      ['/members', 'POST', {wallet: outsider.wallet, role: 'editor'}],
      [`/members/${owner.id}`, 'DELETE', {}],
    ] as const) await error(await api(path + suffix, payload, outsider.cookie, method), 403);
    await error(await api('habitat/save', {worldId: owner.worldId, revision: 1, objects: []}, outsider.cookie), 403);
    expect((await world(owner.worldId, owner.cookie)).world).toMatchObject({ownerId: owner.id, revision: 1, name: 'Public Realm', objects: []});
    expect((await api(path + '/settings', {name: 'Private Again', visibility: 'private', revision: 1}, owner.cookie)).status).toBe(200);
    await error(await api(path, undefined, outsider.cookie), 404);
    expect((await world(owner.worldId, owner.cookie)).players.some(p => p.id === outsider.id)).toBe(false);
    const fallback = await api('habitat/state', undefined, outsider.cookie);
    expect((await fallback.json() as HabitatState).world?.id).toBe(outsider.worldId);
  });

  it('supports private editor/visitor membership, downgrades and immediate revocation without transferring ownership', async () => {
    const owner = await actor('ACL Owner'), member = await actor('ACL Member');
    const path = `habitat/worlds/${owner.worldId}`;
    const grant = (role: string) => api(path + '/members', {wallet: member.wallet, role}, owner.cookie);
    const unknown = await signedWallet();
    await error(await api(path + '/members', {wallet: unknown.wallet, role: 'editor'}, owner.cookie), 422, 'MEMBER_PROFILE_REQUIRED');
    await error(await api(path + '/members', {wallet: owner.wallet, role: 'editor'}, owner.cookie), 422, 'OWNER_ROLE_IMMUTABLE');
    await error(await grant('owner'), 422);
    expect((await grant('visitor')).status).toBe(200);
    expect((await world(owner.worldId, member.cookie)).permissions).toMatchObject({canVisit: true, canEdit: false, canManage: false});
    await error(await api(path + '/objects', {revision: 0, object: object()}, member.cookie), 403);
    expect((await grant('editor')).status).toBe(200);
    const block = object();
    expect((await api(path + '/objects', {revision: 0, object: block}, member.cookie)).status).toBe(200);
    const joined = await api('habitat/join', {id: owner.worldId}, member.cookie);
    expect(joined.status).toBe(200);
    const session = (await joined.json() as HabitatState).presenceSession!;
    await error(await api(path + '/settings', {name: 'Editor Takeover', visibility: 'public'}, member.cookie), 403);
    await error(await api(path + '/members', {wallet: unknown.wallet, role: 'visitor'}, member.cookie), 403);
    expect((await grant('visitor')).status).toBe(200);
    await error(await api(path + '/objects/' + block.id, {revision: 1, object: {x: 1}}, member.cookie, 'PATCH'), 403);
    expect((await api(path + '/members/' + member.id, {}, owner.cookie, 'DELETE')).status).toBe(200);
    for (const suffix of ['', '/permissions', '/members']) await error(await api(path + suffix, undefined, member.cookie), 404);
    await error(await api('habitat/join', {id: owner.worldId}, member.cookie), 404);
    await error(await api('habitat/presence', {worldId: owner.worldId, sessionId: session.id, sequence: 1, x: 0, z: 6, angle: 0, motion: {}}, member.cookie), 404);
    await error(await api('habitat/save', {worldId: owner.worldId, revision: 1, objects: []}, member.cookie), 404);
    expect(await one('SELECT profile_id FROM habitat_presence WHERE profile_id=?', member.id)).toBeNull();
    const final = await world(owner.worldId, owner.cookie);
    expect(final.players.some(p => p.id === member.id)).toBe(false);
    expect(final.world).toMatchObject({ownerId: owner.id, revision: 1, objects: [block]});
  });

  it('revokes public-world editor rights and old presence while retaining ordinary visitor access', async () => {
    const owner = await actor('Public ACL Owner'), member = await actor('Public ACL Member');
    const path = `habitat/worlds/${owner.worldId}`;
    expect((await api(path + '/settings', {name: 'Public ACL', visibility: 'public', revision: 0}, owner.cookie)).status).toBe(200);
    expect((await api(path + '/members', {wallet: member.wallet, role: 'editor'}, owner.cookie)).status).toBe(200);
    const joined = await api('habitat/join', {id: owner.worldId}, member.cookie);
    expect(joined.status).toBe(200);
    const old = (await joined.json() as HabitatState).presenceSession!;
    expect((await api(path + '/members/' + member.id, {}, owner.cookie, 'DELETE')).status).toBe(200);
    expect((await world(owner.worldId, member.cookie)).permissions).toEqual({role: 'visitor', canVisit: true, canEdit: false, canManage: false});
    await error(await api('habitat/save', {worldId: owner.worldId, revision: 1, objects: []}, member.cookie), 403);
    await error(await api('habitat/presence', {worldId: owner.worldId, sessionId: old.id, sequence: 1, x: 0, z: 6, angle: 0, motion: {}}, member.cookie), 409);
    expect((await api('habitat/join', {id: owner.worldId}, member.cookie)).status).toBe(200);
    expect((await world(owner.worldId, owner.cookie)).world).toMatchObject({revision: 1, ownerId: owner.id});
  });
});

describe('security: stale and concurrent world mutations', () => {
  it('commits one winner across signed owner/editor saves and rejects stale CRUD/settings without clobbering it', async () => {
    const owner = await actor('Revision Owner'), editor = await actor('Revision Editor');
    const path = `habitat/worlds/${owner.worldId}`;
    expect((await api(path + '/members', {wallet: editor.wallet, role: 'editor'}, owner.cookie)).status).toBe(200);
    const a = object(), b = object();
    const results = await Promise.all([
      api('habitat/save', {worldId: owner.worldId, revision: 0, objects: [a]}, owner.cookie),
      api(path + '/objects', {worldId: owner.worldId, revision: 0, objects: [b]}, editor.cookie, 'PUT'),
    ]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const winner = results[0].status === 200 ? a : b;
    const current = await world(owner.worldId, owner.cookie);
    expect(current.world).toMatchObject({revision: 1, objects: [winner]});
    for (const [suffix, method, payload] of [
      ['/objects', 'POST', {revision: 0, object: object()}],
      [`/objects/${winner.id}`, 'PATCH', {revision: 0, object: {x: 3}}],
      [`/objects/${winner.id}`, 'DELETE', {revision: 0}],
      ['/objects', 'PUT', {worldId: owner.worldId, revision: 0, objects: []}],
      ['/settings', 'POST', {name: 'Stale Settings', visibility: 'public', revision: 0}],
    ] as const) await error(await api(path + suffix, payload, owner.cookie, method), 409, 'WORLD_EDIT_CONFLICT');
    expect((await world(owner.worldId, owner.cookie)).world).toEqual(current.world);
    await error(await api(path + '/objects', {worldId: editor.worldId, revision: 1, objects: []}, owner.cookie, 'PUT'), 409, 'WORLD_CHANGED');
    const settings = await Promise.all(['Settings Alpha', 'Settings Bravo'].map(name =>
      api(path + '/settings', {name, visibility: 'public', revision: 1}, owner.cookie)));
    expect(settings.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await world(owner.worldId, owner.cookie)).world).toMatchObject({revision: 2, objects: [winner]});
  });

  it('allows current-revision CRUD while removing switch references and persistent state only for deleted objects', async () => {
    const owner = await actor('CRUD Owner');
    const path = `habitat/worlds/${owner.worldId}/objects`;
    const lamp = {...object(), assetId: 'ctrl-lamp', behavior: 'light', x: 0, z: 6};
    const button = {...object(), assetId: 'ctrl-switch', behavior: 'switch', target: lamp.id};
    expect((await api(path, {worldId: owner.worldId, revision: 0, objects: [lamp, button]}, owner.cookie, 'PUT')).status).toBe(200);
    expect((await api('habitat/join', {id: owner.worldId}, owner.cookie)).status).toBe(200);
    expect((await api('habitat/use', {id: lamp.id}, owner.cookie)).status).toBe(200);
    expect((await world(owner.worldId, owner.cookie)).states[lamp.id]?.active).toBe(true);
    expect((await api(path + '/' + lamp.id, {revision: 1, object: {name: 'Renamed Lamp'}}, owner.cookie, 'PATCH')).status).toBe(200);
    expect((await world(owner.worldId, owner.cookie)).states[lamp.id]?.active).toBe(true);
    expect((await api(path + '/' + lamp.id, {revision: 2}, owner.cookie, 'DELETE')).status).toBe(200);
    const final = await world(owner.worldId, owner.cookie);
    expect(final.world?.revision).toBe(3);
    expect(final.world?.objects).toEqual([{...button, target: ''}]);
    expect(final.states[lamp.id]).toBeUndefined();
  });
});
