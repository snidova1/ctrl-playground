import {AppError} from './errors';
import {settings} from './env';
import {identity} from './wallet/auth';

export const reply = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(value, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers}});

/** Same-origin JSON writes only. Blocks cross-site form posts against the session cookie. */
export function requireJsonWrite(request: Request) {
  const expected = settings().origin || new URL(request.url).origin;
  if (request.headers.get('origin') !== expected) throw new AppError('ORIGIN_NOT_ALLOWED', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AppError('JSON_REQUIRED', 415);
}

/** Streams the body with a hard byte budget; Content-Length is advisory. */
export async function readJson(request: Request, limit = 16_000): Promise<unknown> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new AppError('INPUT_TOO_LARGE', 413);
  if (!request.body) throw new AppError('INVALID_JSON', 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {void reader.cancel().catch(() => {}); throw new AppError('INPUT_TOO_LARGE', 413);}
      text += decoder.decode(value, {stream: true});
    }
    text += decoder.decode();
  } finally {reader.releaseLock();}
  try {return JSON.parse(text) as unknown;} catch {throw new AppError('INVALID_JSON', 400);}
}

export interface Principal {id: string; wallet: string}
export async function walletPrincipal(request: Request): Promise<Principal> {
  const user = await identity(request);
  if (!user || user.demo || !user.wallet) throw new AppError('WALLET_SESSION_REQUIRED', 401, 'Sign in with your wallet first.');
  return {id: user.id, wallet: user.wallet};
}
