import {z, ZodError} from 'zod';
import {batch, exec, one, query, statement} from '@/db';
import {rateLimit} from '@/server/wallet/auth';
import {AppError, safeError} from '@/server/errors';
import {readJson, reply, requireJsonWrite, walletPrincipal, type Principal} from '@/server/http';
import {appearanceSchema, nameSchema, normalizeAppearance, randomAppearance} from '@/game/core/appearance';
import {countPlaced, layoutSchema, readStoredLayout, starterLayout} from '@/game/core/home';
import {fashionNeeded} from '@/game/core/wardrobe';
import {HOME_BOUNDS, ROOM_BOUNDS} from '@/game/core/map';
import {publicLife, normalizeLife} from '@/game/core/life';
import {ANIMS, type HabitatState, type HomePermissions, type PublicProfile, type RemotePlayer} from '@/game/core/api-types';
import {keysConfig} from '@/server/keys/config';
import {readWorldKeys, prepareOwnerClaim, verifyOwnerClaim} from '@/server/keys/service';
import {loadLife} from '@/server/life/store';

interface WorldRow {id: string; owner_id: string; name: string; visibility: 'public' | 'private'; revision: number; layout: string}
interface ProfileRow {id: string; name: string; appearance: string}
interface PresenceRow {world_id: string; x: number; z: number; seen_at: number; session_id: string; sequence: number; motion: string}
const TTL = 15_000;

const uuid = z.string().uuid();
const profileInput = z.object({name: nameSchema, appearance: appearanceSchema.optional(), randomize: z.boolean().optional()}).strict();
const presenceInput = z.object({
  worldId: uuid, sessionId: uuid, sequence: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1),
  x: z.number().finite().min(-20).max(20), z: z.number().finite().min(-20).max(20), angle: z.number().finite().min(-100).max(100),
  anim: z.enum(ANIMS as [string, ...string[]]), inside: z.boolean(),
}).strict();
const saveInput = z.object({worldId: uuid, revision: z.number().int().min(0), layout: layoutSchema}).strict();
const settingsInput = z.object({name: z.string().trim().min(2).max(40), visibility: z.enum(['public', 'private']), revision: z.number().int().min(0)}).strict();
const memberInput = z.object({wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/), role: z.enum(['editor', 'visitor'])}).strict();

export function toProfile(row: ProfileRow): PublicProfile {
  let saved: unknown;
  try {saved = JSON.parse(row.appearance);} catch {saved = undefined;}
  return {id: row.id, name: row.name, appearance: normalizeAppearance(saved, row.id)};
}

const FRIEND_SQL = `EXISTS (SELECT 1 FROM friendships f WHERE f.status='accepted' AND
  ((f.requester=w.owner_id AND f.addressee=?) OR (f.addressee=w.owner_id AND f.requester=?)))`;

async function permissions(world: WorldRow, user: string): Promise<HomePermissions> {
  if (world.owner_id === user) return {role: 'owner', canVisit: true, canEdit: true, canManage: true};
  const member = await one<{role: 'editor' | 'visitor'}>('SELECT role FROM habitat_members WHERE world_id=? AND profile_id=?', world.id, user);
  const friend = await one<{ok: number}>(`SELECT 1 AS ok FROM habitat_worlds w WHERE w.id=? AND ${FRIEND_SQL}`, world.id, user, user);
  const role = member?.role === 'editor' ? 'editor' : friend ? 'friend' : 'visitor';
  return {role, canVisit: world.visibility === 'public' || !!member || !!friend, canEdit: member?.role === 'editor', canManage: false};
}

async function readWorld(id: string, user: string) {
  const world = await one<WorldRow>('SELECT * FROM habitat_worlds WHERE id=?', id);
  if (!world) throw new AppError('WORLD_NOT_FOUND', 404);
  const access = await permissions(world, user);
  // Private homes are indistinguishable from missing ones.
  if (!access.canVisit) throw new AppError('WORLD_NOT_FOUND', 404, 'This home is private or unavailable.');
  return {world, access};
}

const VISIBLE_SQL = `(w.visibility='public' OR w.owner_id=p.id OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=p.id)
  OR EXISTS (SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.requester=w.owner_id AND f.addressee=p.id) OR (f.addressee=w.owner_id AND f.requester=p.id))))`;

async function state(user: Principal, worldId?: string): Promise<HabitatState> {
  const profileRow = await one<ProfileRow>('SELECT id,name,appearance FROM habitat_profiles WHERE id=?', user.id);
  const home = await one<WorldRow>('SELECT * FROM habitat_worlds WHERE owner_id=?', user.id);
  let selected: Awaited<ReturnType<typeof readWorld>> | null = null;
  if (worldId) selected = await readWorld(worldId, user.id);
  else if (home) selected = await readWorld(home.id, user.id);
  const w = selected?.world;
  const players = w ? await query<ProfileRow & {x: number; z: number; angle: number; motion: string}>(
    `SELECT p.id,p.name,p.appearance,s.x,s.z,s.angle,s.motion FROM habitat_presence s
     JOIN habitat_profiles p ON p.id=s.profile_id JOIN habitat_worlds w ON w.id=s.world_id
     WHERE s.world_id=? AND s.seen_at>? AND p.id<>? AND ${VISIBLE_SQL} ORDER BY s.seen_at DESC LIMIT 32`, w.id, Date.now() - TTL, user.id) : [];
  const location = await one<PresenceRow>('SELECT * FROM habitat_presence WHERE profile_id=? AND seen_at>?', user.id, Date.now() - TTL);
  const owner = w ? await one<{name: string}>('SELECT name FROM habitat_profiles WHERE id=?', w.owner_id) : null;
  let garden: HabitatState['garden'] = null;
  if (w && w.owner_id !== user.id) {
    const life = await one<{state: string}>('SELECT state FROM town_life WHERE profile_id=?', w.owner_id);
    if (life) garden = publicLife(normalizeLife(JSON.parse(life.state))).plots;
  }
  return {
    profile: profileRow ? toProfile(profileRow) : null,
    homeId: home?.id ?? null,
    world: w ? {id: w.id, ownerId: w.owner_id, ownerName: owner?.name ?? 'Neighbour', name: w.name, visibility: w.visibility, revision: w.revision, layout: readStoredLayout(w.layout)} : null,
    permissions: selected?.access ?? null,
    players: players.map(p => {
      let motion: {anim?: string; inside?: boolean} = {};
      try {motion = JSON.parse(p.motion);} catch {/* legacy motion */}
      return {...toProfile(p), x: p.x, z: p.z, angle: p.angle, anim: (ANIMS as string[]).includes(motion.anim ?? '') ? motion.anim : 'idle', inside: !!motion.inside, emote: '', emoteAt: 0} as RemotePlayer;
    }),
    presenceSession: location && location.world_id === w?.id ? {id: location.session_id, worldId: location.world_id, sequence: location.sequence} : null,
    worlds: await query<{id: string; name: string; owner: string; visibility: 'public' | 'private'}>(
      `SELECT w.id,w.name,p.name AS owner,w.visibility FROM habitat_worlds w JOIN habitat_profiles p ON p.id=w.owner_id
       WHERE w.visibility='public' OR w.owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?) OR ${FRIEND_SQL}
       ORDER BY w.updated_at DESC LIMIT 40`, user.id, user.id, user.id, user.id),
    garden,
    wallet: user.wallet,
  };
}

async function save(user: Principal, id: string, revision: number, layout: z.infer<typeof layoutSchema>) {
  const {world, access} = await readWorld(id, user.id);
  if (!access.canEdit) throw new AppError('EDITOR_REQUIRED', 403);
  // Furniture comes from the owner's bag: you can only place what the owner owns.
  const owned = (await loadLife(world.owner_id)).inventory;
  for (const [item, n] of Object.entries(countPlaced(layout))) {
    if ((owned[item] ?? 0) < n) throw new AppError('FURNITURE_NOT_OWNED', 422, 'Place only furniture you own.');
  }
  const result = await exec(`UPDATE habitat_worlds SET layout=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?
    AND (owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=habitat_worlds.id AND m.profile_id=? AND m.role='editor'))`,
  JSON.stringify(layout), Date.now(), id, revision, user.id, user.id);
  if (!result.meta.changes) throw new AppError('WORLD_EDIT_CONFLICT', 409, 'Someone else edited this home. Reload and try again.');
  return state(user, id);
}

async function join(user: Principal, id: string) {
  await readWorld(id, user.id);
  if (!await one('SELECT id FROM habitat_profiles WHERE id=?', user.id)) throw new AppError('PROFILE_REQUIRED', 409);
  await exec(`INSERT INTO habitat_presence(profile_id,world_id,x,z,angle,motion,seen_at,session_id,sequence)
    VALUES(?,?,0,10,3.14,'{}',?,?,0) ON CONFLICT(profile_id) DO UPDATE SET
    world_id=excluded.world_id,x=0,z=10,angle=3.14,motion='{}',seen_at=excluded.seen_at,session_id=excluded.session_id,sequence=0`,
  user.id, id, Date.now(), crypto.randomUUID());
  return state(user, id);
}

async function createHome(user: Principal) {
  const profile = await one<ProfileRow>('SELECT id,name,appearance FROM habitat_profiles WHERE id=?', user.id);
  if (!profile) throw new AppError('PROFILE_REQUIRED', 409, 'Create your avatar first.');
  await loadLife(user.id);
  const now = Date.now();
  await exec(`INSERT OR IGNORE INTO habitat_worlds(id,owner_id,name,visibility,layout,revision,created_at,updated_at) VALUES(?,?,?,'private',?,0,?,?)`,
    crypto.randomUUID(), user.id, `${profile.name}'s Home`, JSON.stringify(starterLayout(() => crypto.randomUUID())), now, now);
  // Legacy homes from the previous build hold layouts this build cannot read: refurnish them once.
  const home = await one<WorldRow>('SELECT * FROM habitat_worlds WHERE owner_id=?', user.id);
  if (home && readStoredLayout(home.layout).length === 0 && (home.layout !== '[]' || home.revision === 0)) {
    await exec('UPDATE habitat_worlds SET layout=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?', JSON.stringify(starterLayout(() => crypto.randomUUID())), now, home.id, home.revision);
  }
  return state(user);
}

async function members(id: string) {
  return query<{worldId: string; profileId: string; role: string; name: string}>(
    'SELECT m.world_id AS worldId,m.profile_id AS profileId,m.role,p.name FROM habitat_members m JOIN habitat_profiles p ON p.id=m.profile_id WHERE m.world_id=? ORDER BY p.name', id);
}

export async function handleHabitat(r: Request, path: string[]): Promise<Response> {
  try {
    const p = path.join('/');
    if (r.method !== 'GET') requireJsonWrite(r);
    const user = await walletPrincipal(r);
    if (r.method !== 'GET') await rateLimit(`habitat:${path[0]}:${user.id}`, p === 'presence' ? 200 : 40);
    const body = () => readJson(r, 80_000);

    if (r.method === 'GET' && p === 'state') return reply(await state(user));
    if (r.method === 'GET' && p === 'profile') {
      const row = await one<ProfileRow>('SELECT id,name,appearance FROM habitat_profiles WHERE id=?', user.id);
      return reply({profile: row ? toProfile(row) : null});
    }
    if (r.method === 'POST' && (p === 'profile' || p === 'public-profile')) {
      const data = profileInput.parse(await body());
      const look = data.randomize || !data.appearance ? randomAppearance(crypto.randomUUID()) : data.appearance;
      // Wearing paid fashion requires owning it; starter pieces are free for everyone.
      const needed = fashionNeeded(look);
      if (needed.length) {
        const owned = (await loadLife(user.id)).inventory;
        if (needed.some(item => !owned[item])) throw new AppError('FASHION_NOT_OWNED', 422, 'Buy that outfit first.');
      }
      await exec(`INSERT INTO habitat_profiles(id,name,character,variant,appearance,created_at) VALUES(?,?,'chibi','v2',?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,character='chibi',variant='v2',appearance=excluded.appearance`, user.id, data.name, JSON.stringify(look), Date.now());
      const row = await one<ProfileRow>('SELECT id,name,appearance FROM habitat_profiles WHERE id=?', user.id);
      return reply({profile: row ? toProfile(row) : null});
    }
    if (r.method === 'POST' && p === 'home') return reply(await createHome(user));
    if (r.method === 'POST' && p === 'join') {
      const {id} = z.object({id: uuid}).strict().parse(await body());
      return reply(await join(user, id));
    }
    if (r.method === 'POST' && p === 'leave') {
      const data = z.object({worldId: uuid, sessionId: uuid}).strict().parse(await body());
      await exec('DELETE FROM habitat_presence WHERE profile_id=? AND world_id=? AND session_id=?', user.id, data.worldId, data.sessionId);
      return reply({ok: true});
    }
    if (r.method === 'POST' && p === 'presence') {
      const data = presenceInput.parse(await body());
      const old = await one<PresenceRow>('SELECT * FROM habitat_presence WHERE profile_id=?', user.id);
      if (!old || old.world_id !== data.worldId || old.seen_at <= Date.now() - TTL) throw new AppError('WORLD_SESSION_EXPIRED', 409);
      if (data.sessionId !== old.session_id || data.sequence <= old.sequence) throw new AppError('STALE_PRESENCE', 409);
      const limit = Math.min(14, Math.max(1.5, (Date.now() - old.seen_at) / 1000 * 9));
      let oldInside = false;
      try {oldInside = !!JSON.parse(old.motion).inside;} catch {/* legacy */}
      if (oldInside === data.inside && Math.hypot(data.x - old.x, data.z - old.z) > limit) throw new AppError('MOVE_TOO_FAST', 422);
      const b = data.inside ? ROOM_BOUNDS : HOME_BOUNDS;
      const x = Math.max(b.minX, Math.min(b.maxX, data.x)), z2 = Math.max(b.minZ, Math.min(b.maxZ, data.z));
      const result = await exec(`UPDATE habitat_presence SET x=?,z=?,angle=?,motion=?,seen_at=?,sequence=?
        WHERE profile_id=? AND world_id=? AND session_id=? AND sequence=? AND EXISTS (SELECT 1 FROM habitat_worlds w WHERE w.id=habitat_presence.world_id AND
        (w.visibility='public' OR w.owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?) OR ${FRIEND_SQL}))`,
      x, z2, data.angle, JSON.stringify({anim: data.anim, inside: data.inside}), Date.now(), data.sequence, user.id, data.worldId, old.session_id, old.sequence, user.id, user.id, user.id, user.id);
      if (!result.meta.changes) throw new AppError('STALE_PRESENCE', 409);
      const current = await state(user, data.worldId);
      return reply({players: current.players, revision: current.world?.revision ?? 0});
    }
    if (r.method === 'POST' && p === 'save') {
      const data = saveInput.parse(await body());
      return reply(await save(user, data.worldId, data.revision, data.layout));
    }
    if (path[0] === 'worlds' && path[1]) {
      const id = uuid.parse(path[1]);
      const {world, access} = await readWorld(id, user.id);
      if (r.method === 'GET' && path.length === 2) return reply(await state(user, id));
      if (path[2] === 'keys' && (path.length === 3 || (path.length === 4 && ['prepare', 'verify'].includes(path[3])))) {
        const reading = r.method === 'GET' && path.length === 3;
        const claiming = r.method === 'POST' && path.length === 4;
        if (!reading && !claiming) throw new AppError('ROUTE_NOT_FOUND', 404);
        if (claiming && world.owner_id !== user.id) throw new AppError('OWNER_REQUIRED', 403);
        // Resolve the owner only from the trusted UUID -> wallet record, never from the request.
        const owner = await one<{wallet: string}>('SELECT wallet FROM users WHERE id=? AND demo=0 AND wallet IS NOT NULL', world.owner_id);
        if (!owner || world.owner_id !== `wallet-${owner.wallet.toLowerCase()}`) throw new AppError('KEYS_OWNER_BINDING_UNAVAILABLE', 503);
        if (reading) return reply(await readWorldKeys(keysConfig(), id, owner.wallet, user.wallet));
        const input = await body();
        if (path[3] === 'prepare') {
          z.object({}).strict().parse(input);
          return reply(await prepareOwnerClaim(keysConfig(), id, owner.wallet, user.wallet));
        }
        const {txHash} = z.object({txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/)}).strict().parse(input);
        return reply(await verifyOwnerClaim(keysConfig(), id, owner.wallet, user.wallet, txHash));
      }
      if (path[2] === 'members') {
        if (!access.canManage) throw new AppError('OWNER_REQUIRED', 403);
        if (r.method === 'GET' && path.length === 3) return reply({members: await members(id)});
        if (r.method === 'POST' && path.length === 3) {
          const data = memberInput.parse(await body());
          const member = await one<{id: string}>('SELECT p.id FROM habitat_profiles p JOIN users u ON u.id=p.id WHERE u.wallet=? AND u.demo=0', data.wallet.toLowerCase());
          if (!member) throw new AppError('MEMBER_PROFILE_REQUIRED', 422, 'That wallet has not created an avatar yet.');
          if (member.id === world.owner_id) throw new AppError('OWNER_ROLE_IMMUTABLE', 422);
          await exec(`INSERT INTO habitat_members(world_id,profile_id,role,created_at) VALUES(?,?,?,?)
            ON CONFLICT(world_id,profile_id) DO UPDATE SET role=excluded.role`, id, member.id, data.role, Date.now());
          return reply({members: await members(id)});
        }
        if (r.method === 'DELETE' && path.length === 4) {
          await batch([
            statement('DELETE FROM habitat_members WHERE world_id=? AND profile_id=?', id, path[3]),
            statement('DELETE FROM habitat_presence WHERE world_id=? AND profile_id=?', id, path[3]),
          ]);
          return reply({members: await members(id)});
        }
      }
      if (r.method === 'POST' && path[2] === 'settings' && path.length === 3) {
        if (world.owner_id !== user.id) throw new AppError('OWNER_REQUIRED', 403);
        const data = settingsInput.parse(await body());
        const result = await exec('UPDATE habitat_worlds SET name=?,visibility=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?',
          data.name, data.visibility, Date.now(), id, user.id, data.revision);
        if (!result.meta.changes) throw new AppError('WORLD_EDIT_CONFLICT', 409);
        return reply(await state(user, id));
      }
    }
    throw new AppError('ROUTE_NOT_FOUND', 404);
  } catch (e) {
    if (e instanceof ZodError) return reply({code: 'INVALID_INPUT', detail: e.errors[0]?.message ?? 'Invalid input.'}, 422);
    const error = safeError(e);
    return reply({code: error.code, detail: error.detail}, error.status);
  }
}
