import {z, ZodError} from 'zod';
import {exec, one, query} from '@/db';
import {rateLimit} from '@/server/wallet/auth';
import {AppError, safeError} from '@/server/errors';
import {readJson, reply, requireJsonWrite, walletPrincipal} from '@/server/http';
import {TOWN_BOUNDS} from '@/game/core/map';
import {ANIMS, type RemotePlayer} from '@/game/core/api-types';
import {toProfile} from '@/server/habitat/service';

const TTL = 12_000;
export const EMOTES = ['', 'wave', 'heart', 'laugh', 'wow', 'zzz', 'music', 'star'] as const;
const presenceInput = z.object({
  x: z.number().finite().min(TOWN_BOUNDS.minX).max(TOWN_BOUNDS.maxX),
  z: z.number().finite().min(TOWN_BOUNDS.minZ).max(TOWN_BOUNDS.maxZ),
  angle: z.number().finite().min(-100).max(100),
  anim: z.enum(ANIMS as [string, ...string[]]),
  emote: z.enum(EMOTES).optional(),
}).strict();

interface Row {id: string; name: string; appearance: string; x: number; z: number; angle: number; anim: string; emote: string; emote_at: number; friend: number}

async function players(self: string): Promise<RemotePlayer[]> {
  const rows = await query<Row>(`SELECT p.id,p.name,p.appearance,t.x,t.z,t.angle,t.anim,t.emote,t.emote_at,
      EXISTS (SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.requester=p.id AND f.addressee=?) OR (f.addressee=p.id AND f.requester=?))) AS friend
    FROM town_presence t JOIN habitat_profiles p ON p.id=t.profile_id
    WHERE t.seen_at>? AND t.profile_id<>? ORDER BY t.seen_at DESC LIMIT 40`, self, self, Date.now() - TTL, self);
  return rows.map(r => ({...toProfile(r), x: r.x, z: r.z, angle: r.angle, anim: r.anim as RemotePlayer['anim'], emote: r.emote, emoteAt: r.emote_at, friend: !!r.friend}));
}

/** Public World presence. Positions are coarse-checked; NPCs never appear here. */
export async function handleTown(request: Request, path: string[]): Promise<Response> {
  try {
    const p = path.join('/');
    if (request.method !== 'GET') requireJsonWrite(request);
    const user = await walletPrincipal(request);
    const profile = await one<{id: string}>('SELECT id FROM habitat_profiles WHERE id=?', user.id);
    if (!profile) throw new AppError('PROFILE_REQUIRED', 409, 'Create your avatar first.');
    if (request.method === 'GET' && p === 'players') return reply({players: await players(user.id), serverNow: Date.now()});
    if (request.method === 'POST' && p === 'presence') {
      await rateLimit(`town:presence:${user.id}`, 240);
      const data = presenceInput.parse(await readJson(request, 1024));
      const old = await one<{x: number; z: number; seen_at: number}>('SELECT x,z,seen_at FROM town_presence WHERE profile_id=?', user.id);
      const now = Date.now();
      if (old && now - old.seen_at < TTL) {
        const limit = Math.max(2, ((now - old.seen_at) / 1000) * 11 + 1.5);
        if (Math.hypot(data.x - old.x, data.z - old.z) > limit) throw new AppError('MOVE_TOO_FAST', 422);
      }
      const emote = data.emote ?? '';
      await exec(`INSERT INTO town_presence(profile_id,x,z,angle,anim,emote,emote_at,seen_at) VALUES(?,?,?,?,?,?,?,?)
        ON CONFLICT(profile_id) DO UPDATE SET x=excluded.x,z=excluded.z,angle=excluded.angle,anim=excluded.anim,
        emote=CASE WHEN excluded.emote<>'' THEN excluded.emote ELSE town_presence.emote END,
        emote_at=CASE WHEN excluded.emote<>'' THEN excluded.emote_at ELSE town_presence.emote_at END,seen_at=excluded.seen_at`,
      user.id, data.x, data.z, data.angle, data.anim, emote, emote ? now : 0, now);
      return reply({players: await players(user.id), serverNow: now});
    }
    if (request.method === 'POST' && p === 'leave') {
      await exec('DELETE FROM town_presence WHERE profile_id=?', user.id);
      return reply({ok: true});
    }
    throw new AppError('ROUTE_NOT_FOUND', 404);
  } catch (e) {
    if (e instanceof ZodError) return reply({code: 'INVALID_INPUT', detail: 'Invalid presence.'}, 422);
    const error = safeError(e);
    return reply({code: error.code, detail: error.detail}, error.status);
  }
}
