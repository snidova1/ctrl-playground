import {describe, expect, it} from 'vitest';
import {exec, one} from '@/db';
import type {HabitatState} from '@/domain/habitat';
import {actor, api, error, world} from './habitat-fixtures';

async function join(worldId: string, cookie: string, path = 'join') {
  const response = await api(`habitat/${path}`, {id: worldId}, cookie);
  expect(response.status).toBe(200);
  return (await response.json() as HabitatState).presenceSession!;
}
const pose = (worldId: string) => ({worldId, x: 0, z: 6, angle: 0, motion: {}});
const row = (id: string) => one('SELECT * FROM habitat_presence WHERE profile_id=?', id);

describe('security: signed-wallet presence replay and impersonation', () => {
  it('accepts one heartbeat under contention and denies replay, old sequence and sessionless bypass', async () => {
    const owner = await actor('Sequence Owner');
    const session = await join(owner.worldId, owner.cookie);
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    const heartbeat = {...pose(owner.worldId), sessionId: session.id, sequence: 2};
    const attempts = await Promise.all(Array.from({length: 3}, () => api('habitat/presence', heartbeat, owner.cookie)));
    expect(attempts.map(r => r.status).sort()).toEqual([200, 409, 409]);
    const accepted = await row(owner.id);
    for (const sequence of [2, 1, 0]) await error(await api('habitat/presence', {...heartbeat, sequence}, owner.cookie), 409, 'STALE_PRESENCE');
    // Modern join must not be downgraded to the compatibility pose protocol.
    await error(await api('habitat/pose', pose(owner.worldId), owner.cookie), 409);
    expect(await row(owner.id)).toEqual(accepted);
    expect((await api('habitat/presence', {...heartbeat, sequence: 3}, owner.cookie)).status).toBe(200);
  });

  it('binds session tokens and caller identity to the signing wallet, not supplied profile fields', async () => {
    const owner = await actor('Presence Owner'), attacker = await actor('Presence Attacker');
    expect((await api(`habitat/worlds/${owner.worldId}/settings`, {name: 'Shared Presence', visibility: 'public', revision: 0}, owner.cookie)).status).toBe(200);
    const victim = await join(owner.worldId, owner.cookie);
    const foreign = await join(owner.worldId, attacker.cookie);
    const before = await row(owner.id);
    const payload = {...pose(owner.worldId), sessionId: victim.id, sequence: 1};
    await error(await api('habitat/presence', payload, attacker.cookie), 409);
    await error(await api('habitat/leave', {worldId: owner.worldId, sessionId: victim.id}, attacker.cookie), 409);
    for (const identity of [{id: owner.id}, {profileId: owner.id}, {wallet: owner.wallet}]) {
      await error(await api('habitat/presence', {...payload, sessionId: foreign.id, ...identity}, attacker.cookie), 422);
    }
    expect(await row(owner.id)).toEqual(before);
    expect((await api('habitat/presence', payload, owner.cookie)).status).toBe(200);
    const state = await world(owner.worldId, owner.cookie);
    expect(state.players.filter(p => p.id === owner.id)).toHaveLength(1);
    expect(state.players.find(p => p.id === attacker.id)?.loadout.version).toBe(1);
  });

  it('rejects superseded session/leave and cannot resurrect an explicitly left session', async () => {
    const owner = await actor('Rejoin Owner');
    const old = await join(owner.worldId, owner.cookie);
    const fresh = await join(owner.worldId, owner.cookie);
    expect(fresh.id).not.toBe(old.id);
    const before = await row(owner.id);
    await error(await api('habitat/presence', {...pose(owner.worldId), sessionId: old.id, sequence: 1}, owner.cookie), 409);
    await error(await api('habitat/leave', {worldId: owner.worldId, sessionId: old.id}, owner.cookie), 409);
    expect(await row(owner.id)).toEqual(before);
    expect((await api('habitat/leave', {worldId: owner.worldId, sessionId: fresh.id}, owner.cookie)).status).toBe(200);
    expect(await row(owner.id)).toBeNull();
    await error(await api('habitat/presence', {...pose(owner.worldId), sessionId: fresh.id, sequence: 1}, owner.cookie), 409);
    await error(await api('habitat/leave', {worldId: owner.worldId, sessionId: fresh.id}, owner.cookie), 409);
    expect(await row(owner.id)).toBeNull();
  });

  it('expires sequenced sessions without implicit legacy rejoin', async () => {
    const owner = await actor('Expiry Owner');
    const session = await join(owner.worldId, owner.cookie);
    // Age only the isolated fixture row; do not wait or alter global timers.
    await exec('UPDATE habitat_presence SET seen_at=? WHERE profile_id=?', Date.now() - 20_000, owner.id);
    const expired = await row(owner.id);
    await error(await api('habitat/presence', {...pose(owner.worldId), sessionId: session.id, sequence: 1}, owner.cookie), 409);
    await error(await api('habitat/pose', pose(owner.worldId), owner.cookie), 409);
    expect(await row(owner.id)).toEqual(expired);
    expect((await world(owner.worldId, owner.cookie)).players.some(p => p.id === owner.id)).toBe(false);
  });

  it('preserves explicit legacy visit/pose while keeping modern join sequenced', async () => {
    const owner = await actor('Legacy Owner');
    const legacy = await join(owner.worldId, owner.cookie, 'visit');
    expect(legacy.id).toBe('');
    expect((await api('habitat/pose', pose(owner.worldId), owner.cookie)).status).toBe(200);
    expect(await row(owner.id)).toMatchObject({session_id: '', sequence: 1});
    const modern = await join(owner.worldId, owner.cookie);
    expect(modern.id).toBeTruthy();
    await error(await api('habitat/pose', pose(owner.worldId), owner.cookie), 409);
    expect((await api('habitat/presence', {...pose(owner.worldId), sessionId: modern.id, sequence: 1}, owner.cookie)).status).toBe(200);
  });
});
