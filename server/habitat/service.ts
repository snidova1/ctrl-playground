import {z} from 'zod';
import {PUBLIC_WORLD_ID,PUBLIC_WORLD_OWNER,createPublicWorld} from '@/features/habitat/public-world';
import {getTownActivity,TOWN_DISTRICTS} from '@/features/habitat/town-districts';
import {isPublicWorldWalkable} from '@/features/habitat/public-world-geography';
import {one, query, exec, batch, statement} from '@/db';
import {identity, rateLimit} from '@/server/wallet/auth';
import {settings} from '@/server/env';
import {AppError, safeError} from '@/server/errors';
import {collideWorld,isWorldPointWalkable, type WorldProfile, type WorldObject} from '@/features/habitat/types';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {resolveCharacter, normalizeAppearance, seededAppearance, validVariant, type CharacterAppearance, type CharacterGender} from '@/features/plaza/characters/catalog';
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
import {readTownLife,recordContribution,townLifeAction,townLifePaths} from './town-life';
import {readWorldKeys, prepareOwnerClaim, verifyOwnerClaim} from '@/server/keys/service';

interface Principal {id: string; wallet: string}
interface Row {id: string; owner_id: string; name: string; visibility: 'public' | 'private'; revision: number; layout: string}
interface Presence {world_id: string; x: number; z: number; seen_at: number; session_id: string; sequence: number;motion:string}
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
  return {...profile,appearance:saved,variant:saved.variantId,loadout:{version:1,characterId:resolveCharacter(saved).id,variantId:saved.variantId,appearance:saved,accessories:[]}};
}
async function permissions(w: Row, user: string): Promise<WorldPermissions> {
  if (w.id === PUBLIC_WORLD_ID) return {role:'visitor',canVisit:true,canEdit:false,canManage:false};
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
  const players = w ? await query<ProfileRow & {x: number; z: number; angle: number; motion: string;workUntil:number|null}>(
    `SELECT p.id,p.name,p.character,p.variant,p.appearance,s.x,s.z,s.angle,s.motion,COALESCE(j.ready_at,r.ready_at) AS workUntil FROM habitat_presence s
     JOIN habitat_profiles p ON p.id=s.profile_id JOIN habitat_worlds w ON w.id=s.world_id
     LEFT JOIN town_jobs j ON j.profile_id=p.id AND j.completed_at=0 AND j.expires_at>${Date.now()}
     LEFT JOIN town_routes r ON r.profile_id=p.id AND r.completed_at=0 AND r.expires_at>${Date.now()}
     WHERE s.world_id=? AND s.seen_at>? AND (w.visibility='public' OR w.owner_id=p.id OR EXISTS
       (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=p.id))
     ORDER BY s.seen_at DESC LIMIT 64`, w.id, Date.now() - TTL) : [];
  const states: HabitatState['states'] = {};
  if (w) for (const s of await query<{object_id: string; active: number; used_at: number}>(
    'SELECT * FROM habitat_object_state WHERE world_id=?', w.id)) states[s.object_id] = {active: !!s.active, usedAt: s.used_at};
  return {
    town: profile ? await readTownLife(user.id) : undefined,
    profile: profile ? appearance(profile) : null, homeId: home?.id ?? null,
    world: w ? {id: w.id, ownerId: w.owner_id, name: w.name, visibility: w.visibility, revision: w.revision, objects: layoutSchema.parse(JSON.parse(w.layout))} : null,
    canEdit: selected?.access.canEdit ?? false, permissions: selected?.access ?? null,
    players: players.map(p => ({...appearance(p), x: p.x, z: p.z, angle: p.angle, workUntil:p.workUntil??0, motion: motionSchema.parse(JSON.parse(p.motion))})),
    presenceSession: location && location.world_id === w?.id ? {id: location.session_id, worldId: location.world_id, sequence: location.sequence, expiresAt: location.seen_at + TTL} : null,
    states, wallet: user.wallet, keyStatus: 'not-deployed',
    worlds: await query<{id: string; name: string; owner: string}>(
      `SELECT w.id,w.name,p.name AS owner FROM habitat_worlds w JOIN habitat_profiles p ON p.id=w.owner_id
       WHERE w.visibility='public' OR w.owner_id=? OR EXISTS
       (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?) ORDER BY w.updated_at DESC LIMIT 60`, user.id, user.id),
  };
}
async function save(user: Principal, id: string, revision: number, input: WorldObject[]) {
  const {access} = await readWorld(id, user.id);
  if (!access.canEdit) throw new AppError('EDITOR_REQUIRED', 403);
  const objects = layoutSchema.parse(input);
  for (const object of objects) {
    if (!getBuildAsset(object.assetId) && !builtins.has(object.assetId)) throw new AppError('UNKNOWN_ASSET', 422);
    if (object.behavior === 'portal' && object.target) {
      worldIdSchema.parse(object.target);
      await readWorld(object.target, user.id);
    }
  }
  // Revision and authorization are checked inside the write as well as before it.
  const result = await batch([
    statement(`UPDATE habitat_worlds SET layout=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?
      AND (owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=habitat_worlds.id AND m.profile_id=? AND m.role='editor'))`,
    JSON.stringify(objects), Date.now(), id, revision, user.id, user.id),
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
    if (r.method === 'POST' && townLifePaths.has(p)) {
      if (!await one('SELECT id FROM habitat_profiles WHERE id=?',user.id)) throw new AppError('PROFILE_REQUIRED',409);
      return reply(await townLifeAction(user,p,await body(r)));
    }
    if (r.method === 'POST' && p === 'public-world') {
      z.object({}).strict().parse(await body(r));
      if (!await one('SELECT id FROM habitat_profiles WHERE id=?',user.id)) throw new AppError('PROFILE_REQUIRED',409);
      const now=Date.now();
      await batch([
        statement('INSERT OR IGNORE INTO habitat_profiles(id,name,character,variant,appearance,created_at) VALUES(?,?,?,?,?,?)',PUBLIC_WORLD_OWNER,'CTRL Town','female','sage','{}',now),
        statement("INSERT OR IGNORE INTO habitat_worlds(id,owner_id,name,visibility,layout,created_at,updated_at) VALUES(?,?,?,'public',?,?,?)",PUBLIC_WORLD_ID,PUBLIC_WORLD_OWNER,'Willow Square',JSON.stringify(createPublicWorld()),now,now),
      ]);
      return reply({id:PUBLIC_WORLD_ID});
    }
    if (r.method === 'GET' && p === 'state') return reply(await state(user));
    if (r.method === 'GET' && p === 'worlds') return reply({worlds: (await state(user)).worlds});
    if (r.method === 'GET' && p === 'profile') {
      const profile = await one<ProfileRow>('SELECT id,name,character,variant,appearance FROM habitat_profiles WHERE id=?', user.id);
      return reply({profile: profile ? appearance(profile) : null});
    }
    if (r.method === 'POST' && p === 'profile') {
      const data = characterProfileInputSchema.parse(await body(r));
      const previous = await one<ProfileRow>('SELECT * FROM habitat_profiles WHERE id=?', user.id);
      const gender:CharacterGender=data.character;
      const randomized=()=>seededAppearance(crypto.randomUUID(),gender);
      const saved=data.randomize?randomized():data.appearance?{...data.appearance,gender}:previous&&previous.character===gender?parsedAppearance(previous):seededAppearance(crypto.randomUUID(),gender);
      const resolved:CharacterAppearance={...saved,variantId:data.variant?validVariant(data.variant):saved.variantId};
      const variant = resolved.variantId;
      const now = Date.now();
      await batch([
        statement(`INSERT INTO habitat_profiles(id,name,character,variant,appearance,created_at) VALUES(?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET name=excluded.name,character=excluded.character,variant=excluded.variant,appearance=excluded.appearance`, user.id, data.name, data.character, variant, JSON.stringify({...resolved,variantId:variant}), now),
        statement(`INSERT OR IGNORE INTO habitat_worlds(id,owner_id,name,visibility,layout,created_at,updated_at)
          VALUES(?,?,?,'private','[]',?,?)`, crypto.randomUUID(), user.id, `${data.name}'s place`, now, now),
      ]);
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
      const oldSeat=motionSchema.parse(JSON.parse(old.motion)).seatId;
      if(data.motion.seatId&&data.motion.seatId!==oldSeat)throw new AppError('SEAT_NOT_CLAIMED',409);
      const seated=!!data.motion.sitting&&!!oldSeat&&current.world.objects.some(o=>o.id===oldSeat&&o.behavior==='seat')&&isWorldPointWalkable(old.x,old.z,current.world.objects,current.states,data.worldId);
      const position = seated?{x:old.x,z:old.z}:collideWorld(old, data, current.world.objects, current.states, data.worldId);
      const result = await exec(`UPDATE habitat_presence SET x=?,z=?,angle=?,motion=?,seen_at=?,sequence=?
        WHERE profile_id=? AND world_id=? AND session_id=? AND sequence=? AND EXISTS
        (SELECT 1 FROM habitat_worlds w WHERE w.id=habitat_presence.world_id AND
         (w.visibility='public' OR w.owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?)))`,
      position.x, position.z, data.angle, JSON.stringify({...data.motion,seatId:seated?oldSeat:null,speechAt:Math.min(data.motion.speechAt??0,Date.now())}), Date.now(), data.sequence ?? old.sequence + 1, user.id, data.worldId, old.session_id, old.sequence, user.id, user.id);
      if (!result.meta.changes) throw new AppError('STALE_PRESENCE', 409);
      return reply({...await state(user, data.worldId), accepted: position});
    }
    // Server-owned destination travel; not an untrusted client teleport coordinate.
    if (r.method === 'POST' && p === 'town-travel') {
      const data = z.object({id:z.string().max(40),sessionId:z.string().uuid()}).strict().parse(await body(r));
      const destination = TOWN_DISTRICTS.find(d=>d.id===data.id);
      if (!destination || !isPublicWorldWalkable(destination.x,destination.z))
        throw new AppError('INVALID_TOWN_DESTINATION',422);
      const now=Date.now();
      const moved=await exec(`UPDATE habitat_presence SET x=?,z=?,seen_at=?
        WHERE profile_id=? AND world_id=? AND session_id=? AND seen_at>?`,
        destination.x,destination.z,now,user.id,PUBLIC_WORLD_ID,data.sessionId,now-TTL);
      if (!moved.meta.changes) throw new AppError('WORLD_SESSION_EXPIRED',409);
      return reply({...await state(user,PUBLIC_WORLD_ID),accepted:{x:destination.x,z:destination.z}});
    }
    // Shared Townies-style field work: authenticated, proximity-gated and persistent.
    // This never trusts a client-supplied position, reward amount or world identifier.
    if (r.method === 'POST' && p === 'town-activity') {
      const {id} = z.object({id:z.string().min(2).max(50)}).strict().parse(await body(r));
      const activity = getTownActivity(id);
      if (!activity) throw new AppError('ACTIVITY_NOT_FOUND', 404);
      const location = await one<{x:number;z:number;world_id:string;seen_at:number}>(
        'SELECT x,z,world_id,seen_at FROM habitat_presence WHERE profile_id=?',user.id);
      if (!location || location.world_id !== PUBLIC_WORLD_ID || location.seen_at < Date.now()-TTL)
        throw new AppError('PUBLIC_WORLD_REQUIRED',409,'Enter the Public World to help your neighbors.');
      if (Math.hypot(location.x-activity.x,location.z-activity.z)>4.25)
        throw new AppError('COME_CLOSER',422,'Walk to the activity marker first.');
      const now=Date.now();
      const results=await batch([statement(`INSERT INTO habitat_object_state(world_id,object_id,active,used_at)
        SELECT ?,?,1,? WHERE EXISTS (SELECT 1 FROM habitat_worlds WHERE id=? AND visibility='public')
        AND EXISTS (SELECT 1 FROM habitat_presence WHERE profile_id=? AND world_id=? AND seen_at>?
         AND (x-?)*(x-?)+(z-?)*(z-?)<=18.0625)
        ON CONFLICT(world_id,object_id) DO UPDATE SET active=1,used_at=excluded.used_at
        WHERE habitat_object_state.used_at<=?`,PUBLIC_WORLD_ID,activity.objectId,now,PUBLIC_WORLD_ID,user.id,PUBLIC_WORLD_ID,now-TTL,activity.x,activity.x,activity.z,activity.z,now-activity.cooldownMs),
        ...recordContribution(user,crypto.randomUUID(),activity.id,now)]);
      if (!results[0]?.meta.changes) throw new AppError('ACTIVITY_RESTING',409,'Your neighbors finished this recently. Come back soon.');
      return reply({activity:activity.id,message:activity.result,updatedAt:now,state:await state(user,PUBLIC_WORLD_ID)});
    }
    if (r.method === 'POST' && (p === 'settings' || p === 'use')) {
      const current = await state(user);
      if (!current.world) throw new AppError('PROFILE_REQUIRED', 409);
      const {world} = await readWorld(current.world.id, user.id);
      if (p === 'settings') return reply(await updateSettings(user, world, await body(r)));
      const {id,sessionId} = z.object({id: z.string().uuid(),sessionId:z.string().uuid().optional()}).strict().parse(await body(r));
      const object = current.world.objects.find(o => o.id === id);
      if (!object) throw new AppError('OBJECT_NOT_FOUND', 404);
      const position = await one<{x: number; z: number;session_id:string;motion:string}>('SELECT x,z,session_id,motion FROM habitat_presence WHERE profile_id=? AND world_id=? AND seen_at>?', user.id, world.id, Date.now() - TTL);
      if (!position || Math.hypot(position.x - object.x, position.z - object.z) > 3.5) throw new AppError('COME_CLOSER', 422);
      if(sessionId&&sessionId!==position.session_id)throw new AppError('STALE_PRESENCE',409);
      if(object.behavior==='seat'){
        const now=Date.now(),previous=motionSchema.parse(JSON.parse(position.motion));
        const standing=previous.sitting&&previous.seatId===id;
        const candidates=[0,.12,-.12,.24,-.24].map(offset=>({x:object.x+Math.sin(object.rotation)*offset,z:object.z+Math.cos(object.rotation)*offset}));
        const point=standing?position:candidates.find(p=>isWorldPointWalkable(p.x,p.z,current.world!.objects,current.states,world.id));
        if(!point)throw new AppError('SEAT_BLOCKED',409,'Move furniture away from this seat before using it.');
        const result=await batch([statement(`UPDATE habitat_presence SET x=?,z=?,angle=?,motion=?,seen_at=? WHERE profile_id=? AND world_id=? AND session_id=? AND seen_at>? AND (x-?)*(x-?)+(z-?)*(z-?)<=12.25 AND EXISTS(SELECT 1 FROM habitat_worlds w WHERE w.id=habitat_presence.world_id AND w.revision=? AND (w.visibility='public' OR w.owner_id=? OR EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?))) AND NOT EXISTS(SELECT 1 FROM habitat_presence s WHERE s.profile_id<>? AND s.world_id=? AND s.seen_at>? AND json_extract(s.motion,'$.sitting')=1 AND json_extract(s.motion,'$.seatId')=?)`,point.x,point.z,object.rotation,JSON.stringify({...previous,seatId:standing?null:id,sitting:!standing,moving:false,running:false,airborne:false,height:0}),now,user.id,world.id,position.session_id,now-TTL,object.x,object.x,object.z,object.z,world.revision,user.id,user.id,user.id,world.id,now-TTL,id),
          statement("INSERT INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT ?,?,?,?,? WHERE changes()=1",crypto.randomUUID(),user.id,standing?'stood':'sat',object.name,now)]);
        if(!result[0]?.meta.changes)throw new AppError('SEAT_UNAVAILABLE',409,'Seat occupied, world changed, or your session expired.');
        return reply({object,state:await state(user,world.id)});
      }
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
