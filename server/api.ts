import {isAddress} from 'viem';
import {z, ZodError} from 'zod';
import {deployment} from '@/config/deployment';
import {networkFor} from '@/config/network';
import {handleHabitat} from './habitat/service';
import {handleLife} from './life/service';
import {handleTown} from './town/service';
import {handleFriends} from './friends/service';
import {identity, demoSession, logout, nonce, authenticate, rateLimit} from './wallet/auth';
import {AppError, safeError} from './errors';
import {settings} from './env';
import {readJson, reply, requireJsonWrite} from './http';

export async function handleApi(request: Request, path: string[]): Promise<Response> {
  try {
    const p = path.join('/');
    const method = request.method;
    if (path[0] === 'habitat') return handleHabitat(request, path.slice(1));
    if (path[0] === 'life') return handleLife(request, path.slice(1));
    if (path[0] === 'town') return handleTown(request, path.slice(1));
    if (path[0] === 'friends') return handleFriends(request, path.slice(1));
    if (method !== 'GET') {
      requireJsonWrite(request);
      const user = await identity(request);
      await rateLimit(`write:${user?.id ?? request.headers.get('cf-connecting-ip') ?? 'anonymous'}`, 20);
    }
    if (method === 'GET' && p === 'network') {
      const s = settings();
      const chain = networkFor(s.chainId);
      return reply({
        walletConnectProjectId: /^[a-f0-9]{32}$/i.test(s.walletConnectProjectId) ? s.walletConnectProjectId : null,
        chainId: chain.id, name: chain.name, testnet: !!chain.testnet, token: isAddress(s.token) ? s.token : null,
        explorer: chain.blockExplorers.default.url,
        faucetEnabled: chain.id === 46630 && isAddress(s.token) && s.token.toLowerCase() === deployment.token?.toLowerCase(),
      });
    }
    if (method === 'GET' && p === 'health') return reply({status: 'ok', mode: settings().mode, game: 'willow-common', version: '2.0.0'});
    if (method === 'GET' && p === 'session') {
      const user = await identity(request);
      return reply({signedIn: !!user && !user.demo && !!user.wallet, wallet: user?.wallet ?? null});
    }
    if (method === 'POST' && p === 'auth/demo') return reply({ok: true}, 200, {'Set-Cookie': await demoSession(request)});
    if (method === 'POST' && p === 'auth/logout') return reply({ok: true}, 200, {'Set-Cookie': await logout(request)});
    if (method === 'POST' && p === 'auth/nonce') {
      const d = z.object({address: z.string()}).strict().parse(await readJson(request));
      return reply(await nonce(request, d.address));
    }
    if (method === 'POST' && p === 'auth/verify') {
      const d = z.object({address: z.string(), nonce: z.string().max(64), signature: z.string().regex(/^0x[0-9a-fA-F]+$/).max(2048)}).strict().parse(await readJson(request));
      return reply({ok: true}, 200, {'Set-Cookie': await authenticate(request, d.address, d.nonce, d.signature as `0x${string}`)});
    }
    throw new AppError('ROUTE_NOT_FOUND', 404);
  } catch (error) {
    if (error instanceof ZodError) return reply({code: 'INVALID_INPUT', detail: error.errors.map(e => e.message).join('. ')}, 422);
    const e = safeError(error);
    return reply({code: e.code, detail: e.detail}, e.status);
  }
}
