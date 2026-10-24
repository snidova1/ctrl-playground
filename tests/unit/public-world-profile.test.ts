import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import {one, query} from '@/db';
import type {CharacterProfile, HabitatState} from '@/domain/habitat';
import {decorationCatalog,decorationDefaults} from '@/features/plaza/characters/catalog';
import {handleApi} from '@/server/api';
import {HABITAT_MAX_BODY_BYTES} from '@/server/habitat/read-json';
import WalletConnection from '@/features/wallet/wallet-connect';
import {actor, api, cookieFrom, error, object, origin, signedWallet} from './security/habitat-fixtures';

// Keep wallet presentation tests offline; API authentication below uses real EOA signatures.
vi.mock('wagmi', () => ({
  WagmiProvider: ({children}: {children: unknown}) => children,
  createConfig: () => ({}), http: () => ({}),
  useConnection: () => ({address: '0x0000000000000000000000000000000000000001', chainId: 4663}),
  useConnectors: () => [], useConnect: () => ({}), useSignMessage: () => ({}),
  useDisconnect: () => ({}), useSwitchChain: () => ({}), useWriteContract: () => ({}), usePublicClient: () => undefined,
}));
vi.mock('wagmi/connectors/injected', () => ({injected: () => ({})}));
vi.mock('wagmi/connectors/walletConnect', () => ({walletConnect: () => ({})}));
vi.mock('@/lib/use-resource', () => ({useResource: () => ({data: {
  chainId: 4663, name: 'Robinhood', testnet: false, token: null,
  explorer: 'https://explorer.robinhood.com', faucetEnabled: false,
}})}));

const route = 'habitat/public-profile';
const chosen = {version: 1, gender: 'female', variantId: 'sage', hairId: 'auburn', eyeId: 'jade', skinId: 'warm'} as const;
const payload = {name: 'Public Explorer', character: 'female', variant: 'sage', appearance: chosen} as const;
async function absentHabitat(id: string) {
  expect(await query('SELECT * FROM habitat_worlds WHERE owner_id=?', id)).toEqual([]);
  expect(await query('SELECT * FROM habitat_members WHERE profile_id=?', id)).toEqual([]);
  expect(await query('SELECT * FROM habitat_presence WHERE profile_id=?', id)).toEqual([]);
}
async function savedProfile(cookie: string) {
  const response = await api('habitat/profile', undefined, cookie);
  expect(response.status).toBe(200);
  return response.json() as Promise<{profile: CharacterProfile | null}>;
}

describe('authenticated public avatar API without Habitat provisioning', () => {
  it('rejects unsigned, forged, guest and demo sessions without creating profiles or worlds', async () => {
    const guests = await api('plaza/join', {name: 'Open Air Guest'});
    expect(guests.status).toBe(201);
    const demo = await api('auth/demo', {});
    expect(demo.status).toBe(200);
    const guest = cookieFrom(guests);
    const counts = await one('SELECT (SELECT COUNT(*) FROM habitat_profiles) AS profiles, (SELECT COUNT(*) FROM habitat_worlds) AS worlds');
    for (const cookie of ['', 'ctrl_session=forged', guest, `ctrl_session=forged; ${guest}`, cookieFrom(demo)]) {
      await error(await api(route, payload, cookie), 401, 'WALLET_SESSION_REQUIRED');
    }
    expect(await one('SELECT (SELECT COUNT(*) FROM habitat_profiles) AS profiles, (SELECT COUNT(*) FROM habitat_worlds) AS worlds')).toEqual(counts);
  });

  it('upserts signed-wallet appearance, reloads through GET profile, and never creates or joins a Habitat', async () => {
    const wallet = await signedWallet();
    expect(await savedProfile(wallet.cookie)).toEqual({profile: null});
    const userBefore = await one('SELECT * FROM users WHERE id=?', wallet.id);
    const response = await api(route, payload, wallet.cookie);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const result = await response.json() as {profile: CharacterProfile};
    expect(Object.keys(result)).toEqual(['profile']);
    expect(result.profile).toMatchObject({id: wallet.id, name: payload.name, character: 'female', variant: 'sage', appearance: chosen,
      loadout: {version: 1, variantId: 'sage', appearance: chosen, accessories: []}});
    expect(await savedProfile(wallet.cookie)).toEqual(result);
    const row = await one<{appearance: string; created_at: number}>('SELECT * FROM habitat_profiles WHERE id=?', wallet.id);
    expect(JSON.parse(row!.appearance)).toEqual({...decorationDefaults,...chosen});
    await absentHabitat(wallet.id);

    const updated = await api(route, {name: 'Renamed Explorer', character: 'female'}, wallet.cookie);
    expect(updated.status).toBe(200);
    expect(await savedProfile(wallet.cookie)).toEqual(await updated.json());
    expect((await savedProfile(wallet.cookie)).profile).toMatchObject({name: 'Renamed Explorer', appearance: chosen});
    expect(await one('SELECT created_at FROM habitat_profiles WHERE id=?', wallet.id)).toEqual({created_at: row!.created_at});
    expect((await one<{n: number}>('SELECT COUNT(*) AS n FROM habitat_profiles WHERE id=?', wallet.id))?.n).toBe(1);
    expect(await one('SELECT * FROM users WHERE id=?', wallet.id)).toEqual(userBefore);
    await absentHabitat(wallet.id);
    const state = await (await api('habitat/state', undefined, wallet.cookie)).json() as HabitatState;
    expect(state).toMatchObject({homeId: null, world: null, canEdit: false, permissions: null, presenceSession: null, players: []});
  });

  it('persists the authored model, accessories and expression unchanged across reload and rename', async () => {
    const wallet=await signedWallet();
    const appearance={...chosen,lookId:'alternate',headwearId:'beret',eyewearId:'round',earringId:'drops',neckwearId:'scarf',backwearId:'wings',expressionId:'happy',accessoryColorId:'rose'} as const;
    const response=await api(route,{...payload,appearance},wallet.cookie);
    expect(response.status).toBe(200);
    const result=await response.json() as {profile:CharacterProfile};
    expect(result.profile.appearance).toEqual(appearance);
    expect(result.profile.loadout).toMatchObject({characterId:'ctrl-anime-female-studio',appearance,accessories:[
      {assetId:'ctrl-headwearId-beret',bone:'head'},
      {assetId:'ctrl-eyewearId-round',bone:'head'},
      {assetId:'ctrl-earringId-drops',bone:'head'},
      {assetId:'ctrl-neckwearId-scarf',bone:'neck'},
      {assetId:'ctrl-backwearId-wings',bone:'chest'},
    ]});
    expect(await savedProfile(wallet.cookie)).toEqual(result);
    expect(JSON.parse((await one<{appearance:string}>('SELECT appearance FROM habitat_profiles WHERE id=?',wallet.id))!.appearance)).toEqual(appearance);
    const renamed=await api(route,{name:'Stable Explorer',character:'female'},wallet.cookie);
    expect(renamed.status).toBe(200);
    expect((await savedProfile(wallet.cookie)).profile?.appearance).toEqual(appearance);
    await absentHabitat(wallet.id);
  });

  it('does not elevate public avatars into owners, members, editors or private-world visitors', async () => {
    const owner = await actor('Private Owner'), visitor = await signedWallet();
    const path = `habitat/worlds/${owner.worldId}`;
    const worldBefore = await one('SELECT * FROM habitat_worlds WHERE id=?', owner.worldId);
    expect((await api(route, payload, visitor.cookie)).status).toBe(200);
    await error(await api(path, undefined, visitor.cookie), 404, 'WORLD_NOT_FOUND');
    await error(await api('habitat/join', {id: owner.worldId}, visitor.cookie), 404, 'WORLD_NOT_FOUND');
    expect((await api(`${path}/settings`, {name: 'Taken', visibility: 'public'}, visitor.cookie)).status).toBe(404);
    expect((await api('habitat/save', {worldId: owner.worldId, revision: 0, objects: []}, visitor.cookie)).status).toBe(404);
    expect(await one('SELECT * FROM habitat_worlds WHERE id=?', owner.worldId)).toEqual(worldBefore);
    expect((await api(`${path}/settings`, {name: 'Public Habitat', visibility: 'public'}, owner.cookie)).status).toBe(200);
    const visible = await (await api(path, undefined, visitor.cookie)).json() as HabitatState;
    expect(visible.permissions).toEqual({role: 'visitor', canVisit: true, canEdit: false, canManage: false});
    await error(await api(`${path}/settings`, {name: 'Taken', visibility: 'private'}, visitor.cookie), 403, 'OWNER_REQUIRED');
    await error(await api('habitat/save', {worldId: owner.worldId, revision: 1, objects: []}, visitor.cookie), 403, 'EDITOR_REQUIRED');
    await absentHabitat(visitor.id);
  });

  it('leaves existing home layout, ownership, membership and live presence untouched', async () => {
    const owner = await actor('Existing Owner');
    const block = object();
    expect((await api('habitat/save', {worldId: owner.worldId, revision: 0, objects: [block]}, owner.cookie)).status).toBe(200);
    expect((await api('habitat/join', {id: owner.worldId}, owner.cookie)).status).toBe(200);
    const before = {
      world: await one('SELECT * FROM habitat_worlds WHERE id=?', owner.worldId),
      presence: await one('SELECT * FROM habitat_presence WHERE profile_id=?', owner.id),
      members: await query('SELECT * FROM habitat_members WHERE world_id=?', owner.worldId),
    };
    const response = await api(route, payload, owner.cookie);
    expect(response.status).toBe(200);
    expect(Object.keys(await response.json())).toEqual(['profile']);
    expect(await one('SELECT * FROM habitat_worlds WHERE id=?', owner.worldId)).toEqual(before.world);
    expect(await one('SELECT * FROM habitat_presence WHERE profile_id=?', owner.id)).toEqual(before.presence);
    expect(await query('SELECT * FROM habitat_members WHERE world_id=?', owner.worldId)).toEqual(before.members);
    expect((await one<{n: number}>('SELECT COUNT(*) AS n FROM habitat_worlds WHERE owner_id=?', owner.id))?.n).toBe(1);
  });

  it('preserves explicit legacy profile onboarding and its one-home behavior', async () => {
    const wallet = await signedWallet();
    expect((await api(route, payload, wallet.cookie)).status).toBe(200);
    await absentHabitat(wallet.id);
    const created = await api('habitat/profile', payload, wallet.cookie);
    expect(created.status).toBe(200);
    const home = await created.json() as HabitatState;
    expect(home.homeId).toBe(home.world?.id);
    expect(home.world?.ownerId).toBe(wallet.id);
    expect(home.permissions).toMatchObject({role: 'owner', canEdit: true, canManage: true});
    const repeat = await api('habitat/profile', {...payload, name: 'Legacy Updated'}, wallet.cookie);
    expect(repeat.status).toBe(200);
    expect((await repeat.json() as HabitatState).homeId).toBe(home.homeId);
    expect((await one<{n: number}>('SELECT COUNT(*) AS n FROM habitat_worlds WHERE owner_id=?', wallet.id))?.n).toBe(1);
  });

  it('enforces origin, JSON content type, strict schema and the existing body budget before writing', async () => {
    const wallet = await signedWallet();
    for (const Origin of ['https://evil.invalid', '']) await error(await api(route, payload, wallet.cookie, 'POST', {Origin}), 403, 'ORIGIN_NOT_ALLOWED');
    await error(await api(route, payload, wallet.cookie, 'POST', {'Content-Type': 'text/plain'}), 415, 'JSON_REQUIRED');
    for (const invalid of [
      {...payload, ownerId: wallet.id}, {...payload, id: 'somebody-else'}, {...payload, role: 'owner'},
      {...payload, name: '<script>'}, {...payload, character: 'remote'}, {...payload, variant: 'remote-url'},
      {...payload, appearance: {...chosen, hairId: 'remote-url'}}, {...payload, appearance: {...chosen, url: 'https://evil.invalid/model.glb'}},
    ]) await error(await api(route, invalid, wallet.cookie), 422);
    for(const key of Object.keys(decorationCatalog))await error(await api(route,{...payload,appearance:{...chosen,[key]:'https://evil.invalid/model.vrm'}},wallet.cookie),422);
    await error(await api(route, payload, wallet.cookie, 'POST', {'Content-Length': String(HABITAT_MAX_BODY_BYTES + 1)}), 413, 'INPUT_TOO_LARGE');
    await error(await api(route, {...payload, padding: 'x'.repeat(HABITAT_MAX_BODY_BYTES)}, wallet.cookie), 413, 'INPUT_TOO_LARGE');
    const request = new Request(`${origin}/api/${route}`, {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json', Cookie: wallet.cookie}, body: '{'});
    await error(await handleApi(request, ['habitat', 'public-profile']), 422, 'INVALID_INPUT');
    expect(await savedProfile(wallet.cookie)).toEqual({profile: null});
    await absentHabitat(wallet.id);
  });

  it('retains the authenticated write rate limit of 40 and rejects the next save without mutation', async () => {
    const wallet = await signedWallet();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    try {
      for (let n = 0; n < 40; n++) expect((await api(route, payload, wallet.cookie)).status).toBe(200);
      const before = await savedProfile(wallet.cookie);
      await error(await api(route, {...payload, name: 'Rate Bypass'}, wallet.cookie), 429, 'TOO_MANY_OPERATIONS');
      expect(await savedProfile(wallet.cookie)).toEqual(before);
      await absentHabitat(wallet.id);
    } finally {clock.mockRestore();}
  });
});

describe('shared wallet sign-in purpose copy', () => {
  it('preserves the default Habitat labels and description', () => {
    const html = renderToStaticMarkup(createElement(WalletConnection, {onVerified: () => {}}));
    expect(html).toContain('Sign in to Habitat');
    expect(html).toContain('Approve a signature to save your character and world. No gas or payment.');
    expect(html).not.toContain('Sign in to CTRL');
  });

  it('threads public-world purpose through both wrappers without Habitat promises', () => {
    const html = renderToStaticMarkup(createElement(WalletConnection, {onVerified: () => {}, purpose: 'public-world'}));
    expect(html).toContain('Sign in to CTRL');
    expect(html).toContain('Sign to save your avatar and explore Public World. No gas or payment.');
    expect(html).not.toContain('Sign in to Habitat');
    expect(html).not.toContain('save your character and world');
  });
});
