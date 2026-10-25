import {z, ZodError} from 'zod';
import {AppError, safeError} from '@/server/errors';
import {identity, rateLimit} from '@/server/wallet/auth';
import {applyLifeAction, lifeActionSchema, LifeError, townLevel} from '@/game/core/life';
import {dailyQuests} from '@/game/core/quests';
import {realDay} from '@/game/core/clock';
import {assertChanged, atomic, casLife, loadLife, placedFurniture} from './store';
import {readJson, reply, requireJsonWrite} from '@/server/http';

const requestSchema = z.object({revision: z.number().int().min(0), action: lifeActionSchema}).strict();

function random() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000;
}

export async function handleLife(request: Request, path: string[]): Promise<Response> {
  try {
    if (path.length) throw new AppError('ROUTE_NOT_FOUND', 404);
    if (request.method !== 'GET' && request.method !== 'POST') throw new AppError('METHOD_NOT_ALLOWED', 405);
    if (request.method === 'POST') requireJsonWrite(request);
    const user = await identity(request);
    if (!user || user.demo || !user.wallet) throw new AppError('WALLET_SESSION_REQUIRED', 401, 'Sign in with your wallet to save your town life.');
    await rateLimit(`life:${request.method}:${user.id}`, request.method === 'POST' ? 90 : 120);
    const now = Date.now();
    const previous = await loadLife(user.id, now);
    if (request.method === 'GET') {
      return reply({state: previous, events: [], serverNow: now, quests: dailyQuests(user.id, realDay(now), townLevel(previous)), profileId: user.id});
    }
    const data = requestSchema.parse(await readJson(request, 4096));
    if (data.revision !== previous.revision) throw new AppError('LIFE_EDIT_CONFLICT', 409, 'Your game refreshed. Try again.');
    const placed = data.action.type === 'sell' ? await placedFurniture(user.id) : undefined;
    const {state, events} = applyLifeAction(previous, data.action, now, random, {profileId: user.id, placed});
    await atomic([casLife(user.id, previous, state), assertChanged()]);
    return reply({state, events, serverNow: now, quests: dailyQuests(user.id, realDay(now), townLevel(state)), profileId: user.id});
  } catch (error) {
    if (error instanceof ZodError) return reply({code: 'INVALID_ACTION', detail: 'That action is not valid.'}, 422);
    if (error instanceof LifeError) return reply({code: error.code, detail: error.detail}, 422);
    const e = safeError(error);
    return reply({code: e.code, detail: e.detail}, e.status);
  }
}
