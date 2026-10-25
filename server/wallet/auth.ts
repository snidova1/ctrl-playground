import {one, exec} from '@/db';
import {settings} from '@/server/env';
import {hash} from './hash';
import {verifyMessage, isAddress} from 'viem';
import {AppError} from '@/server/errors';

export interface Identity {id: string; wallet: string | null; demo: boolean; created_at: string}
const SESSION_SECONDS = 86400 * 7;

function sessionToken(request: Request) {
  return request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('ctrl_session='))?.slice(13);
}

export async function identity(request: Request): Promise<Identity | null> {
  const token = sessionToken(request);
  if (!token) return null;
  const row = await one<{id: string; wallet: string | null; demo: number; created_at: string}>(
    'SELECT users.id,users.wallet,users.demo,users.created_at FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.id=? AND sessions.expires_at>?',
    await hash(token), Date.now());
  return row ? {...row, demo: !!row.demo} : null;
}

export async function createSession(userId: string, secure: boolean) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  await exec('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)', await hash(token), userId, Date.now() + SESSION_SECONDS * 1000);
  return `ctrl_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`;
}

/** Local development only. Disabled on staging (DEMO_AUTH_ENABLED=false). Demo users never get wallet-bound state. */
export async function demoSession(request: Request) {
  if (!settings().demoAuth) throw new AppError('DEMO_DISABLED', 403);
  const id = `demo-${crypto.randomUUID()}`;
  await exec('INSERT INTO users(id,wallet,demo,created_at,reputation) VALUES(?,NULL,1,?,0)', id, new Date().toISOString());
  return createSession(id, new URL(request.url).protocol === 'https:');
}

export async function nonce(request: Request, address: string) {
  if (!isAddress(address)) throw new AppError('INVALID_WALLET');
  const id = crypto.randomUUID().replaceAll('-', '');
  const origin = settings().origin || new URL(request.url).origin;
  const message = `${new URL(origin).host} wants you to sign in to CTRL Willow Common.\n\nWallet: ${address.toLowerCase()}\nURI: ${origin}\nChain ID: ${settings().chainId}\nNonce: ${id}\nIssued At: ${new Date().toISOString()}\n\nThis signature only proves you own this wallet. It costs no gas and grants no transaction authority.`;
  await exec('INSERT INTO nonces(id,message,expires_at) VALUES(?,?,?)', id, message, Date.now() + 300000);
  return {nonce: id, message};
}

export async function authenticate(request: Request, address: string, nonceId: string, signature: `0x${string}`) {
  if (!isAddress(address)) throw new AppError('INVALID_WALLET');
  const row = await one<{message: string; expires_at: number; used: number}>('SELECT * FROM nonces WHERE id=?', nonceId);
  if (!row || row.used || row.expires_at <= Date.now() || !row.message.includes(`Wallet: ${address.toLowerCase()}\n`)) throw new AppError('AUTH_CHALLENGE_EXPIRED', 401);
  // Malformed signatures can throw during recovery instead of returning false.
  const valid = await verifyMessage({address: address as `0x${string}`, message: row.message, signature}).catch(() => false);
  if (!valid) throw new AppError('WALLET_SIGNATURE_INVALID', 401);
  const consumed = await exec('UPDATE nonces SET used=1 WHERE id=? AND used=0 AND expires_at>?', nonceId, Date.now());
  if (!consumed.meta.changes) throw new AppError('AUTH_CHALLENGE_EXPIRED', 401);
  const userId = `wallet-${address.toLowerCase()}`;
  await exec('INSERT OR IGNORE INTO users(id,wallet,demo,created_at) VALUES(?,?,0,?)', userId, address.toLowerCase(), new Date().toISOString());
  return createSession(userId, new URL(request.url).protocol === 'https:');
}

export async function logout(request: Request) {
  const token = sessionToken(request);
  if (token) await exec('DELETE FROM sessions WHERE id=?', await hash(token));
  return 'ctrl_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}

export async function rateLimit(key: string, maximum = 30, seconds = 60) {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const id = `${await hash(key)}:${window}`;
  const r = await exec('INSERT INTO rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 WHERE count<?', id, (window + 1) * seconds * 1000, maximum);
  if (!r.meta.changes) throw new AppError('TOO_MANY_OPERATIONS', 429, 'Slow down a little and try again in a minute.');
}
