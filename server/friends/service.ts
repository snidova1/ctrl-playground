import {z, ZodError} from 'zod';
import {exec, one, query, statement} from '@/db';
import {rateLimit} from '@/server/wallet/auth';
import {AppError, safeError} from '@/server/errors';
import {readJson, reply, requireJsonWrite, walletPrincipal} from '@/server/http';
import {toProfile} from '@/server/habitat/service';
import {ITEMS} from '@/game/core/items';
import type {FriendEntry, FriendsResponse} from '@/game/core/api-types';
import {assertChanged, atomic, casLife, loadLife, placedFurniture} from '@/server/life/store';

const profileId = z.string().min(3).max(80);
const MAX_FRIENDS = 100;

interface Row {id: string; name: string; appearance: string; seen: number | null; home: string | null; since: number}
const entry = (r: Row): FriendEntry => ({...toProfile(r), online: !!r.seen && r.seen > Date.now() - 15_000, homeId: r.home, since: r.since});
const SELECT = `SELECT p.id,p.name,p.appearance,t.seen_at AS seen,w.id AS home,f.created_at AS since FROM friendships f`;

async function friends(self: string): Promise<FriendsResponse> {
  const accepted = await query<Row>(`${SELECT}
    JOIN habitat_profiles p ON p.id=CASE WHEN f.requester=? THEN f.addressee ELSE f.requester END
    LEFT JOIN town_presence t ON t.profile_id=p.id LEFT JOIN habitat_worlds w ON w.owner_id=p.id
    WHERE f.status='accepted' AND (f.requester=? OR f.addressee=?) ORDER BY p.name LIMIT 200`, self, self, self);
  const incoming = await query<Row>(`${SELECT} JOIN habitat_profiles p ON p.id=f.requester
    LEFT JOIN town_presence t ON t.profile_id=p.id LEFT JOIN habitat_worlds w ON w.owner_id=p.id
    WHERE f.status='pending' AND f.addressee=? ORDER BY f.created_at DESC LIMIT 50`, self);
  const outgoing = await query<Row>(`${SELECT} JOIN habitat_profiles p ON p.id=f.addressee
    LEFT JOIN town_presence t ON t.profile_id=p.id LEFT JOIN habitat_worlds w ON w.owner_id=p.id
    WHERE f.status='pending' AND f.requester=? ORDER BY f.created_at DESC LIMIT 50`, self);
  const mail = await query<{id: string; sender: string; name: string; item: string; quantity: number; note: string; created_at: number}>(
    `SELECT m.id,m.sender,p.name,m.item,m.quantity,m.note,m.created_at FROM town_mail m JOIN habitat_profiles p ON p.id=m.sender
     WHERE m.recipient=? AND m.claimed_at IS NULL ORDER BY m.created_at DESC LIMIT 50`, self);
  return {
    friends: accepted.map(entry), incoming: incoming.map(entry), outgoing: outgoing.map(entry),
    mail: mail.map(m => ({id: m.id, from: m.sender, fromName: m.name, item: m.item, quantity: m.quantity, note: m.note, createdAt: m.created_at})),
  };
}

async function areFriends(a: string, b: string) {
  return !!await one(`SELECT 1 FROM friendships WHERE status='accepted' AND ((requester=? AND addressee=?) OR (requester=? AND addressee=?))`, a, b, b, a);
}

export async function handleFriends(request: Request, path: string[]): Promise<Response> {
  try {
    const p = path.join('/');
    if (request.method !== 'GET') requireJsonWrite(request);
    const user = await walletPrincipal(request);
    if (!await one('SELECT id FROM habitat_profiles WHERE id=?', user.id)) throw new AppError('PROFILE_REQUIRED', 409, 'Create your avatar first.');
    if (request.method !== 'GET') await rateLimit(`friends:${user.id}`, 40);
    if (request.method === 'GET' && p === '') return reply(await friends(user.id));
    if (request.method === 'GET' && p === 'search') {
      const q = z.string().trim().min(2).max(18).parse(new URL(request.url).searchParams.get('q') ?? '');
      const rows = await query<{id: string; name: string; appearance: string}>(
        `SELECT id,name,appearance FROM habitat_profiles WHERE name LIKE ? ESCAPE '\\' AND id<>? ORDER BY name LIMIT 12`,
        `${q.replace(/[\\%_]/g, c => `\\${c}`)}%`, user.id);
      return reply({results: rows.map(toProfile)});
    }
    if (request.method !== 'POST') throw new AppError('ROUTE_NOT_FOUND', 404);
    const body = await readJson(request, 2048);
    if (request.method === 'POST' && p === 'request') {
      const {id} = z.object({id: profileId}).strict().parse(body);
      if (id === user.id) throw new AppError('CANNOT_FRIEND_SELF', 422);
      if (!await one('SELECT id FROM habitat_profiles WHERE id=?', id)) throw new AppError('PLAYER_NOT_FOUND', 404);
      const count = await one<{n: number}>(`SELECT COUNT(*) AS n FROM friendships WHERE status='accepted' AND (requester=? OR addressee=?)`, user.id, user.id);
      if ((count?.n ?? 0) >= MAX_FRIENDS) throw new AppError('FRIEND_LIMIT', 422);
      // A reverse pending request becomes an acceptance.
      const reverse = await exec(`UPDATE friendships SET status='accepted' WHERE requester=? AND addressee=? AND status='pending'`, id, user.id);
      if (!reverse.meta.changes) await exec(`INSERT OR IGNORE INTO friendships(requester,addressee,status,created_at) SELECT ?,?,'pending',?
        WHERE NOT EXISTS (SELECT 1 FROM friendships WHERE requester=? AND addressee=?)`, user.id, id, Date.now(), id, user.id);
      return reply(await friends(user.id));
    }
    if (request.method === 'POST' && p === 'accept') {
      const {id} = z.object({id: profileId}).strict().parse(body);
      const result = await exec(`UPDATE friendships SET status='accepted' WHERE requester=? AND addressee=? AND status='pending'`, id, user.id);
      if (!result.meta.changes) throw new AppError('REQUEST_NOT_FOUND', 404);
      return reply(await friends(user.id));
    }
    if (request.method === 'POST' && p === 'remove') {
      const {id} = z.object({id: profileId}).strict().parse(body);
      await exec('DELETE FROM friendships WHERE (requester=? AND addressee=?) OR (requester=? AND addressee=?)', user.id, id, id, user.id);
      return reply(await friends(user.id));
    }
    if (request.method === 'POST' && p === 'gift') {
      const data = z.object({id: profileId, item: z.string().min(1).max(60), quantity: z.number().int().min(1).max(20), note: z.string().trim().max(80).default('')}).strict().parse(body);
      if (!ITEMS[data.item]) throw new AppError('UNKNOWN_ITEM', 422);
      if (!await areFriends(user.id, data.id)) throw new AppError('FRIENDS_ONLY', 403, 'You can only send gifts to friends.');
      const pending = await one<{n: number}>('SELECT COUNT(*) AS n FROM town_mail WHERE recipient=? AND claimed_at IS NULL', data.id);
      if ((pending?.n ?? 0) >= 50) throw new AppError('MAILBOX_FULL', 422, 'Their mailbox is full.');
      const now = Date.now();
      const previous = await loadLife(user.id, now);
      const placed = (await placedFurniture(user.id))[data.item] ?? 0;
      const have = previous.inventory[data.item] ?? 0;
      if (have - data.quantity < placed || have < data.quantity) throw new AppError('NOT_ENOUGH_ITEMS', 422, 'You do not have enough of that.');
      const next = structuredClone(previous);
      const left = have - data.quantity;
      if (left) next.inventory[data.item] = left; else delete next.inventory[data.item];
      next.revision++; next.updatedAt = Math.max(now, previous.updatedAt);
      await atomic([casLife(user.id, previous, next), assertChanged(),
        statement('INSERT INTO town_mail(id,sender,recipient,item,quantity,note,created_at) VALUES(?,?,?,?,?,?,?)', crypto.randomUUID(), user.id, data.id, data.item, data.quantity, data.note, now)]);
      return reply({ok: true, state: next});
    }
    if (request.method === 'POST' && p === 'mail/claim') {
      const {id} = z.object({id: z.string().uuid()}).strict().parse(body);
      const mail = await one<{item: string; quantity: number}>('SELECT item,quantity FROM town_mail WHERE id=? AND recipient=? AND claimed_at IS NULL', id, user.id);
      if (!mail) throw new AppError('MAIL_NOT_FOUND', 404);
      const now = Date.now();
      const previous = await loadLife(user.id, now);
      const next = structuredClone(previous);
      next.inventory[mail.item] = Math.min(9999, (next.inventory[mail.item] ?? 0) + mail.quantity);
      next.revision++; next.updatedAt = Math.max(now, previous.updatedAt);
      await atomic([
        statement('UPDATE town_mail SET claimed_at=? WHERE id=? AND recipient=? AND claimed_at IS NULL', now, id, user.id), assertChanged(),
        casLife(user.id, previous, next), assertChanged(),
      ]);
      return reply({...await friends(user.id), state: next});
    }
    throw new AppError('ROUTE_NOT_FOUND', 404);
  } catch (e) {
    if (e instanceof ZodError) return reply({code: 'INVALID_INPUT', detail: 'Invalid request.'}, 422);
    const error = safeError(e);
    return reply({code: error.code, detail: error.detail}, error.status);
  }
}
