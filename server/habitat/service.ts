import {z} from 'zod';
import {normalizeLifeState,type LifeState} from '@/domain/cozy-life';
import {isCozyLayoutClear} from '@/features/habitat/cozy-life-layout';
import {one, query, exec, batch, statement} from '@/db';
import {identity, rateLimit} from '@/server/wallet/auth';
import {settings} from '@/server/env';
import {AppError, safeError} from '@/server/errors';
import {collideWorld, type WorldProfile, type WorldObject} from '@/features/habitat/types';
import {isHouseObject} from '@/features/habitat/modular-house';
import {interactionDistanceTo} from '@/features/habitat/furniture-interactions';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {resolveCharacter, normalizeAppearance, seededModularAppearance as seededAppearance, validVariant, type CharacterAppearance, type CharacterGender} from '@/features/plaza/characters/catalog';
import {
  layoutSchema, motionSchema, worldIdSchema, worldEditorSavePayloadSchema,
  characterProfileInputSchema, poseInputSchema, presenceInputSchema,
  objectCreateSchema, objectUpdateSchema, objectDeleteSchema, worldSettingsSchema,
  memberInputSchema,
  type HabitatState, type WorldPermissions, type CharacterProfile, type WorldMember,
} from '@/domain/habitat';
import {readHabitatJson} from './read-json';
import {resolveHabitatAssets} from './asset-resolver';
import {keysConfig} from '@/server/keys/config';
import {readWorldKeys, prepareOwnerClaim, verifyOwnerClaim} from '@/server/keys/service';

interface Principal {id: string; wallet: string}
interface Row {id: string; owner_id: string; name: string; visibility: 'public' | 'private'; revision: number; layout: string}
interface Presence {world_id: string; x: number; z: number; seen_at: number; session_id: string; sequence: number}
interface ProfileRow extends Omit<WorldProfile,'appearance'>{appearance?:string}
const TTL = 15000;
const builtins = new Set(['ctrl-block', 'ctrl-door', 'ctrl-switch', 'ctrl-lamp', 'ctrl-seat', 'ctrl-portal', 'ctrl-marker']);
const reply = (v: unknown, status = 200) => Response.json(v, {status, headers: {'Cache-Control': 'no-store'}});

async function body(r: Request): Promise<unknown> {
  return readHabitatJson(r);
}

async function principal(r: Request): Promise<Principal> {
  const user = await identity(r);
  if (!user || user.demo || !user.wallet) throw new AppError('WALLET_SESSION_REQUIRED', 401, 'Sign a wallet session to use persistent personal worlds.');
  return {id: user.id, wallet: user.wallet};
}
function parsedAppearance(profile:ProfileRow):CharacterAppearance{
  const gender:CharacterGender=profile.character==='male'?'male':'female';
  let saved:unknown;
  try{saved=profile.appearance?JSON.parse(profile.appearance):undefined;}catch{saved=undefined;}
  return normalizeAppearance(saved,gender,profile.variant);
}
function appearance(profile: ProfileRow): CharacterProfile {
  const saved=parsedAppearance(profile);
  const accessories: Array<{assetId:string;bone:'head'|'neck'|'chest'}> = [];
  for(const key of ['headwearId','eyewearId','earringId','neckwearId','backwearId'] as const){const id=saved[key];if(id&&id!=='none')accessories.push({assetId:`ctrl-${key}-${id}`,bone:key==='backwearId'?'chest':key==='neckwearId'?'neck':'head'});}
  return {...profile,appearance:saved,variant:saved.variantId,loadout:{version:1,characterId:resolveCharacter(saved).id,variantId:saved.variantId,appearance:saved,accessories}};
}
async function permissions(w: Row, user: string): Promise<WorldPermissions> {
  if (w.owner_id === user) return {role: 'owner', canVisit: true, canEdit: true, canManage: true};
  const member = await one<{role: 'editor' | 'visitor'}>('SELECT role FROM habitat_members WHERE world_id=? AND profile_id=?', w.id, user);
  return {role: member?.role ?? 'visitor', canVisit: w.visibility === 'public' || !!member, canEdit: member?.role === 'editor', canManage: false};
}
async function readWorld(id: string, user: string) {
  const world = await one<Row>('SELECT * FROM habitat_worlds WHERE id=?', id);
  if (!world) throw new AppError('WORLD_NOT_FOUND', 404);
  const access = await permissions(world, user);
  if (!access.canVisit) throw new AppError('WORLD_NOT_FOUND', 404, 'This world is private or unavailable.');
  return {world, access};
}
async function state(user: Principal, worldId?: string): Promise<HabitatState> {
  const profile = await one<ProfileRow>('SELECT id,name,character,variant,appearance FROM habitat_profiles WHERE id=?', user.id);
  const home = await one<Row>('SELECT * FROM habitat_worlds WHERE owner_id=?', user.id);
  const location = await one<Presence>('SELECT * FROM habitat_presence WHERE profile_id=? AND seen_at>?', user.id, Date.now() - TTL);
  let selected: Awaited<ReturnType<typeof readWorld>> | null = null;
  if (worldId) selected = await readWorld(worldId, user.id);
  else if (location) {
    try {selected = await readWorld(location.world_id, user.id);}
    catch (e) {if (!(e instanceof AppError) || e.code !== 'WORLD_NOT_FOUND') throw e;}
  }
  if (!selected && home) selected = await readWorld(home.id, user.id);
  const w = selected?.world;
  // Recheck private-world ACLs when reading presence, including after revocation.
  const players = w ? await query<ProfileRow & {x: number; z: number; angle: number; motion: string}>(
    `SELECT p.id,p.name,p.character,p.variant,p.appearance,s.x,s.z,s.angle,s.motion FROM habitat_presence s
     JOIN habitat_profiles p ON p.id=s.profile_id JOIN habitat_worlds w ON w.id=s.world_id
     WHERE s.world_id=? AND s.seen_at>? AND (w.visibility='public' OR w.owner_id=p.id OR EXISTS
       (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=p.id))
     ORDER BY s.seen_at DESC LIMIT 64`, w.id, Date.now() - TTL) : [];
  const states: HabitatState['states'] = {};
  if (w) for (const s of await query<{object_id: string; active: number; used_at: number}>(
    'SELECT * FROM habitat_object_state WHERE world_id=?', w.id)) states[s.object_id] = {active: !!s.active, usedAt: s.used_at};
  return {
    profile: profile ? appearance(profile) : null, homeId: home?.id ?? null,
    world: w ? {id: w.id, ownerId: w.owner_id, name: w.name, visibility: w.visibility, revision: w.revision, objects: layoutSchema.parse(JSON.parse(w.layout))} : null,
    canEdit: selected?.access.canEdit ?? false, permissions: selected?.access ?? null,
    players: players.map(p => ({...appearance(p), x: p.x, z: p.z, angle: p.angle, motion: motionSchema.parse(JSON.parse(p.motion))})),
    presenceSession: location && location.world_id === w?.id ? {id: location.session_id, worldId: location.world_id, sequence: location.sequence, expiresAt: location.seen_at + TTL} : null,
    states, wallet: user.wallet, keyStatus: 'not-deployed',
    worlds: await query<{id: string; name: string; owner: string}>(
      `SELECT w.id,w.name,p.name AS owner FROM habitat_worlds w JOIN habitat_profiles p ON p.id=w.owner_id
       WHERE w.visibility='public' OR w.owner_id=? OR EXISTS
       (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?) ORDER BY w.updated_at DESC LIMIT 60`, user.id, user.id),
  };
}
async function save(user: Principal, id: string, revision: number, input: WorldObject[]) {
  const {world,access} = await readWorld(id, user.id);
  if (!access.canEdit) throw new AppError('EDITOR_REQUIRED', 403);
  const objects = layoutSchema.parse(input);
  // Furniture-editor invitations never transfer ownership of the building.
  // Parsing normalizes property order before comparing reserved structural records.
  const structure=(items:WorldObject[])=>JSON.stringify(items.filter(isHouseObject).sort((a,b)=>a.id.localeCompare(b.id)));
  if(!access.canManage&&structure(objects)!==structure(layoutSchema.parse(JSON.parse(world.layout))))throw new AppError('OWNER_REQUIRED',403,'Only the Habitat owner can modify the house.');
  for (const object of objects) {
    if (!getBuildAsset(object.assetId) && !builtins.has(object.assetId) && !isHouseObject(object)) throw new AppError('UNKNOWN_ASSET', 422);
    if (object.behavior === 'portal' && object.target) {
      worldIdSchema.parse(object.target);
      await readWorld(object.target, user.id);
    }
  }
  const life=await one<{revision:number;state:string}>('SELECT revision,state FROM cozy_life_states WHERE profile_id=?',world.owner_id);
  if(life&&!isCozyLayoutClear(objects,normalizeLifeState(JSON.parse(life.state) as LifeState)))throw new AppError('COZY_LAYOUT_BLOCKED',422,'Pindahkan kebun atau simpan perabot buatan ke tas sebelum membangun di tempat yang sama.');
  // Revision, authorization and concurrent life placement are checked inside the write.

  const result = await batch([
    statement(`UPDATE habitat_worlds SET layout=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?
      AND (owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=habitat_worlds.id AND m.profile_id=? AND m.role='editor'))
      AND COALESCE((SELECT revision FROM cozy_life_states WHERE profile_id=?),0)=?`,
    JSON.stringify(objects), Date.now(), id, revision, user.id, user.id, world.owner_id, life?.revision??0),
    statement(`DELETE FROM habitat_object_state WHERE world_id=? AND object_id NOT IN
      (SELECT json_extract(value,'$.id') FROM habitat_worlds w,json_each(w.layout) WHERE w.id=?)`, id, id),
  ]);
  if (!result[0]?.meta.changes) throw new AppError('WORLD_EDIT_CONFLICT', 409, 'Reload the latest world before editing.');
  return state(user, id);
}
async function join(user: Principal, id: string, sequenced = true) {
  await readWorld(id, user.id);
  if (!await one('SELECT id FROM habitat_profiles WHERE id=?', user.id)) throw new AppError('PROFILE_REQUIRED', 409);
  const result = await exec(`INSERT INTO habitat_presence(profile_id,world_id,x,z,angle,motion,seen_at,session_id,sequence)
    SELECT ?,id,0,6,3.14,'{}',?,?,0 FROM habitat_worlds WHERE id=? AND
      (visibility='public' OR owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=habitat_worlds.id AND m.profile_id=?))
    ON CONFLICT(profile_id) DO UPDATE SET
    world_id=excluded.world_id,x=0,z=6,angle=3.14,motion='{}',seen_at=excluded.seen_at,session_id=excluded.session_id,sequence=0`,
  user.id, Date.now(), sequenced ? crypto.randomUUID() : '', id, user.id, user.id);
  if (!result.meta.changes) throw new AppError('WORLD_NOT_FOUND', 404);
  return state(user, id);
}
async function members(id: string): Promise<WorldMember[]> {
  return query<WorldMember>('SELECT world_id AS worldId,profile_id AS profileId,role FROM habitat_members WHERE world_id=? ORDER BY profile_id', id);
}
async function updateSettings(user: Principal, world: Row, input: unknown) {
  if (world.owner_id !== user.id) throw new AppError('OWNER_REQUIRED', 403);
  const data = worldSettingsSchema.parse(input);
  const result = await exec('UPDATE habitat_worlds SET name=?,visibility=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?',
    data.name, data.visibility, Date.now(), world.id, user.id, data.revision ?? world.revision);
  if (!result.meta.changes) throw new AppError('WORLD_EDIT_CONFLICT', 409);
  return state(user, world.id);
}

export async function handleHabitat(r: Request, path: string[]) {
  try {
    const p = path.join('/');
    if (r.method !== 'GET') {
      if (r.headers.get('origin') !== (settings().origin || new URL(r.url).origin)) throw new AppError('ORIGIN_NOT_ALLOWED', 403);
      if (!r.headers.get('content-type')?.startsWith('application/json')) throw new AppError('JSON_REQUIRED', 415);
    }
    const user = await principal(r);
    if (r.method !== 'GET') await rateLimit(`habitat:${path[0]}:${user.id}`, ['pose', 'presence'].includes(p) ? 150 : 40);
    if (r.method === 'GET' && p === 'state') return reply(await state(user));
    if (r.method === 'GET' && p === 'worlds') return reply({worlds: (await state(user)).worlds});
    if (r.method === 'GET' && p === 'profile') {
      const profile = await one<ProfileRow>('SELECT id,name,character,variant,appearance FROM habitat_profiles WHERE id=?', user.id);
      return reply({profile: profile ? appearance(profile) : null});
    }
    if (r.method === 'POST' && (p === 'profile' || p === 'public-profile')) {
      const data = characterProfileInputSchema.parse(await body(r));
      const previous = await one<ProfileRow>('SELECT * FROM habitat_profiles WHERE id=?', user.id);
      const gender:CharacterGender=data.character;
      const randomized=()=>seededAppearance(crypto.randomUUID(),gender);
      const saved=data.randomize?randomized():data.appearance?normalizeAppearance(data.appearance,gender,data.variant??'original'):previous&&previous.character===gender?parsedAppearance(previous):seededAppearance(crypto.randomUUID(),gender);
      const resolved:CharacterAppearance={...saved,variantId:data.variant?validVariant(data.variant):saved.variantId};
      const variant = resolved.variantId;
      const now = Date.now();
      await batch([
        statement(`INSERT INTO habitat_profiles(id,name,character,variant,appearance,created_at) VALUES(?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET name=excluded.name,character=excluded.character,variant=excluded.variant,appearance=excluded.appearance`, user.id, data.name, data.character, variant, JSON.stringify({...resolved,variantId:variant}), now),
        // A public avatar is not Habitat ownership; only legacy onboarding creates a home.
        ...(p === 'profile' ? [statement(`INSERT OR IGNORE INTO habitat_worlds(id,owner_id,name,visibility,layout,created_at,updated_at)
          VALUES(?,?,?,'private','[]',?,?)`, crypto.randomUUID(), user.id, `${data.name}'s place`, now, now)] : []),
      ]);
      if (p === 'public-profile') {
        const profile = await one<ProfileRow>('SELECT id,name,character,variant,appearance FROM habitat_profiles WHERE id=?', user.id);
        return reply({profile: profile ? appearance(profile) : null});
      }
      return reply(await state(user));
    }
    if (r.method === 'POST' && p === 'assets/resolve') {
      return reply(resolveHabitatAssets(await body(r)));
    }
    if (r.method === 'POST' && (p === 'join' || p === 'visit')) {
      const {id} = z.object({id: worldIdSchema}).strict().parse(await body(r));
      return reply(await join(user, id, p === 'join'));
    }
    if (r.method === 'POST' && p === 'leave') {
      const data = z.object({worldId: worldIdSchema, sessionId: z.string().uuid()}).strict().parse(await body(r));
      const result = await exec('DELETE FROM habitat_presence WHERE profile_id=? AND world_id=? AND session_id=?', user.id, data.worldId, data.sessionId);
      if (!result.meta.changes) throw new AppError('STALE_PRESENCE', 409);
      return reply({ok: true});
    }
    if (r.method === 'POST' && p === 'save') {
      const data = worldEditorSavePayloadSchema.parse(await body(r));
      return reply(await save(user, data.worldId, data.revision, data.objects));
    }
    if (path[0] === 'worlds' && path[1]) {
      const id = worldIdSchema.parse(path[1]);
      const {world, access} = await readWorld(id, user.id);
      if (r.method === 'GET' && path.length === 2) return reply(await state(user, id));
      if (r.method === 'GET' && path[2] === 'permissions' && path.length === 3) return reply(access);
      if (path[2] === 'keys' && (path.length === 3 || path.length === 4 && ['prepare', 'verify'].includes(path[3]))) {
        const reading = r.method === 'GET' && path.length === 3;
        const claiming = r.method === 'POST' && path.length === 4;
        if (!reading && !claiming) throw new AppError('ROUTE_NOT_FOUND', 404);
        if (claiming && world.owner_id !== user.id) throw new AppError('OWNER_REQUIRED', 403);
        // Resolve the owner only from the trusted UUID -> user record, never body/query fields.
        const owner = await one<{wallet: string}>(
          'SELECT wallet FROM users WHERE id=? AND demo=0 AND wallet IS NOT NULL', world.owner_id);
        if (!owner || world.owner_id !== `wallet-${owner.wallet.toLowerCase()}`) throw new AppError('KEYS_OWNER_BINDING_UNAVAILABLE', 503);
        if (reading) return reply(await readWorldKeys(keysConfig(), id, owner.wallet, user.wallet));
        const input = await body(r);
        if (path[3] === 'prepare') {
          z.object({}).strict().parse(input);
          return reply(await prepareOwnerClaim(keysConfig(), id, owner.wallet, user.wallet));
        }
        const {txHash} = z.object({txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/)}).strict().parse(input);
        return reply(await verifyOwnerClaim(keysConfig(), id, owner.wallet, user.wallet, txHash));
      }
      if (path[2] === 'objects') {
        if (!access.canEdit) throw new AppError('EDITOR_REQUIRED', 403);
        if (r.method === 'PUT' && path.length === 3) {
          const data = worldEditorSavePayloadSchema.parse(await body(r));
          if (data.worldId !== id) throw new AppError('WORLD_CHANGED', 409);
          return reply(await save(user, id, data.revision, data.objects));
        }
        const objects = layoutSchema.parse(JSON.parse(world.layout));
        if (r.method === 'POST' && path.length === 3) {
          const data = objectCreateSchema.parse(await body(r));
          if (objects.some(o => o.id === data.object.id)) throw new AppError('OBJECT_ALREADY_EXISTS', 409);
          return reply(await save(user, id, data.revision, [...objects, data.object]));
        }
        if (path.length === 4 && ['PATCH', 'DELETE'].includes(r.method)) {
          const objectId = z.string().uuid().parse(path[3]);
          if (!objects.some(o => o.id === objectId)) throw new AppError('OBJECT_NOT_FOUND', 404);
          if (r.method === 'PATCH') {
            const data = objectUpdateSchema.parse(await body(r));
            return reply(await save(user, id, data.revision, objects.map(o => o.id === objectId ? {...o, ...data.object} : o)));
          }
          const data = objectDeleteSchema.parse(await body(r));
          const next = objects.filter(o => o.id !== objectId).map(o => o.behavior === 'switch' && o.target === objectId ? {...o, target: ''} : o);
          return reply(await save(user, id, data.revision, next));
        }
      }
      if (path[2] === 'members') {
        if (!access.canManage) throw new AppError('OWNER_REQUIRED', 403);
        if (r.method === 'POST' && path.length === 3) {
          const data = memberInputSchema.parse(await body(r));
          const member = await one<{id: string}>(`SELECT p.id FROM habitat_profiles p JOIN users u ON u.id=p.id WHERE u.wallet=? AND u.demo=0`, data.wallet.toLowerCase());
          if (!member) throw new AppError('MEMBER_PROFILE_REQUIRED', 422);
          if (member.id === world.owner_id) throw new AppError('OWNER_ROLE_IMMUTABLE', 422);
          await exec(`INSERT INTO habitat_members(world_id,profile_id,role,created_at) VALUES(?,?,?,?)
            ON CONFLICT(world_id,profile_id) DO UPDATE SET role=excluded.role`, id, member.id, data.role, Date.now());
          return reply({members: await members(id)});
        }
        if (r.method === 'DELETE' && path.length === 4) {
          z.object({}).strict().parse(await body(r));
          await batch([
            statement('DELETE FROM habitat_members WHERE world_id=? AND profile_id=?', id, path[3]),
            statement('DELETE FROM habitat_presence WHERE world_id=? AND profile_id=?', id, path[3]),
          ]);
          return reply({members: await members(id)});
        }
        if (r.method === 'GET' && path.length === 3) return reply({members: await members(id)});
      }
      if (r.method === 'POST' && path[2] === 'settings' && path.length === 3) return reply(await updateSettings(user, world, await body(r)));
      throw new AppError('ROUTE_NOT_FOUND', 404);
    }
    if (r.method === 'POST' && (p === 'pose' || p === 'presence')) {
      const data = (p === 'presence' ? presenceInputSchema : poseInputSchema).parse(await body(r));
      const current = await state(user, data.worldId);
      if (!current.profile || !current.world) throw new AppError('PROFILE_REQUIRED', 409);
      let old = await one<Presence>('SELECT * FROM habitat_presence WHERE profile_id=?', user.id);
      // An expired modern connection must explicitly rejoin; never downgrade it
      // to the legacy protocol before checking its session binding.
      if (p === 'pose' && !data.sessionId && old?.session_id) throw new AppError('STALE_PRESENCE', 409, 'Use sequenced presence for this connection.');
      // Legacy courtyard clients may implicitly join their own home on first pose.
      if ((!old || old.seen_at <= Date.now() - TTL) && p === 'pose' && !data.sessionId && (old?.world_id === data.worldId || current.homeId === data.worldId)) {
        await join(user, data.worldId, false);
        old = await one<Presence>('SELECT * FROM habitat_presence WHERE profile_id=?', user.id);
      }
      if (!old || old.world_id !== data.worldId || old.seen_at <= Date.now() - TTL) throw new AppError('WORLD_SESSION_EXPIRED', 409);
      if (data.sessionId && (data.sessionId !== old.session_id || data.sequence! <= old.sequence)) throw new AppError('STALE_PRESENCE', 409);
      const limit = Math.min(10, Math.max(1, (Date.now() - old.seen_at) / 1000 * 4));
      if (Math.hypot(data.x - old.x, data.z - old.z) > limit) throw new AppError('MOVE_TOO_FAST', 422);
      const position = collideWorld(old, data, current.world.objects, current.states);
      const result = await exec(`UPDATE habitat_presence SET x=?,z=?,angle=?,motion=?,seen_at=?,sequence=?
        WHERE profile_id=? AND world_id=? AND session_id=? AND sequence=? AND EXISTS
        (SELECT 1 FROM habitat_worlds w WHERE w.id=habitat_presence.world_id AND
         (w.visibility='public' OR w.owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?)))`,
      position.x, position.z, data.angle, JSON.stringify(data.motion), Date.now(), data.sequence ?? old.sequence + 1, user.id, data.worldId, old.session_id, old.sequence, user.id, user.id);
      if (!result.meta.changes) throw new AppError('STALE_PRESENCE', 409);
      return reply({...await state(user, data.worldId), accepted: position});
    }
    if (r.method === 'POST' && (p === 'settings' || p === 'use')) {
      const current = await state(user);
      if (!current.world) throw new AppError('PROFILE_REQUIRED', 409);
      const {world} = await readWorld(current.world.id, user.id);
      if (p === 'settings') return reply(await updateSettings(user, world, await body(r)));
      const {id} = z.object({id: z.string().uuid()}).strict().parse(await body(r));
      const object = current.world.objects.find(o => o.id === id);
      if (!object) throw new AppError('OBJECT_NOT_FOUND', 404);
      const position = await one<{x: number; z: number}>('SELECT x,z FROM habitat_presence WHERE profile_id=? AND world_id=? AND seen_at>?', user.id, world.id, Date.now() - TTL);
      if (!position || interactionDistanceTo(position, object) > 3.5) throw new AppError('COME_CLOSER', 422);
      const target = object.behavior === 'switch' ? current.world.objects.find(o => o.id === object.target) : object;
      if (!target) throw new AppError('TARGET_REQUIRED', 422);
      if (['light', 'door', 'spin'].includes(target.behavior)) {
        const result = await exec(`INSERT INTO habitat_object_state(world_id,object_id,active,used_at)
          SELECT id,?,1,? FROM habitat_worlds WHERE id=? AND revision=? AND
          (visibility='public' OR owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=habitat_worlds.id AND m.profile_id=?))
          ON CONFLICT(world_id,object_id) DO UPDATE SET active=1-active,used_at=excluded.used_at`, target.id, Date.now(), world.id, current.world.revision, user.id, user.id);
        if (!result.meta.changes) throw new AppError('WORLD_EDIT_CONFLICT', 409);
      }
      return reply({object, state: await state(user, world.id)});
    }
    throw new AppError('ROUTE_NOT_FOUND', 404);
  } catch (e) {
    if (e instanceof z.ZodError || e instanceof SyntaxError) return reply({detail: 'Invalid world input.', code: 'INVALID_INPUT'}, 422);
    const error = safeError(e);
    return reply({detail: error.detail, code: error.code}, error.status);
  }
}
