import {expect} from 'vitest';
import {generatePrivateKey, privateKeyToAccount} from 'viem/accounts';
import {handleApi} from '@/server/api';
import type {HabitatState, WorldObject} from '@/domain/habitat';

export const origin = 'http://localhost:3000';
export function api(path: string, payload?: unknown, cookie = '', method = payload === undefined ? 'GET' : 'POST', headers: Record<string, string> = {}) {
  return handleApi(new Request(`${origin}/api/${path}`, {
    method,
    headers: {
      ...(method === 'GET' ? {} : {Origin: origin, 'Content-Type': 'application/json'}),
      'cf-connecting-ip': crypto.randomUUID(),
      ...(cookie ? {Cookie: cookie} : {}), ...headers,
    },
    ...(method === 'GET' ? {} : {body: JSON.stringify(payload ?? {})}),
  }), path.split('/'));
}
export const cookieFrom = (response: Response) => {
  expect(response.headers.get('set-cookie')).toBeTruthy();
  return response.headers.get('set-cookie')!.split(';')[0];
};
export async function signedWallet() {
  // Real nonce -> viem EOA signature -> verification; no direct session minting.
  const signer = privateKeyToAccount(generatePrivateKey());
  const challenge = await api('auth/nonce', {address: signer.address});
  expect(challenge.status).toBe(200);
  const {nonce, message} = await challenge.json() as {nonce: string; message: string};
  const signature = await signer.signMessage({message});
  const verified = await api('auth/verify', {address: signer.address, nonce, signature});
  expect(verified.status).toBe(200);
  const wallet = signer.address.toLowerCase();
  return {wallet, id: `wallet-${wallet}`, cookie: cookieFrom(verified)};
}
export async function actor(name: string) {
  const wallet = await signedWallet();
  const response = await api('habitat/profile', {name, character: 'female', variant: 'original'}, wallet.cookie);
  expect(response.status).toBe(200);
  const state = await response.json() as HabitatState;
  expect(state.world?.ownerId).toBe(wallet.id);
  expect(state.homeId).toBe(state.world?.id);
  return {...wallet, worldId: state.homeId!, state};
}
export const object = (id = crypto.randomUUID()): WorldObject => ({
  id, assetId: 'ctrl-block', name: 'Safe Block', x: 0, y: 0, z: 0,
  rotation: 0, scale: 1, behavior: 'solid', target: '',
});
export async function world(worldId: string, cookie: string) {
  const response = await api(`habitat/worlds/${worldId}`, undefined, cookie);
  expect(response.status).toBe(200);
  return response.json() as Promise<HabitatState>;
}
export async function error(response: Response, status: number, code?: string) {
  expect(response.status).toBe(status);
  if (code) expect(await response.json()).toMatchObject({code});
}
