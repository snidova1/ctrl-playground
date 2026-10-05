import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {privateKeyToAccount} from 'viem/accounts';
import {handleApi} from '@/server/api';
import type {Account,Mission} from '@/domain/types';
const origin='http://localhost:3000';
function call(path:string,body?:unknown,cookie?:string){return handleApi(new Request(`${origin}/api/${path}`,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:origin}),...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),path.split('/'));}
it('authenticates the funded testnet signer and applies actual tCTRL holder access',async()=>{
 const file=process.env.CTRL_TESTNET_WALLET_FILE;if(!file)throw new Error('CTRL_TESTNET_WALLET_FILE is required');
 const secret=JSON.parse(await readFile(file,'utf8')) as {privateKey:`0x${string}`};const wallet=privateKeyToAccount(secret.privateKey);
 const challenge=await (await call('auth/nonce',{address:wallet.address})).json() as {nonce:string;message:string};expect(challenge.message).toContain('Chain ID: 46630');
 const verified=await call('auth/verify',{address:wallet.address,nonce:challenge.nonce,signature:await wallet.signMessage({message:challenge.message})});expect(verified.status).toBe(200);const cookie=verified.headers.get('set-cookie')!.split(';')[0];
 const response=await call('account',undefined,cookie);expect(response.status).toBe(200);const account=await response.json() as Account;expect(account.demo).toBe(false);expect(account.chainId).toBe(46630);expect(account.balance).toBe(64000);expect(account.tier).toBe('ARCHITECT');expect(account.capacity).toBeGreaterThan(0);
 const proposed=await call('missions',{command:'Build a field guide to public websites with exactly one useful button.',operationId:crypto.randomUUID()},cookie);expect(proposed.status).toBe(201);const mission=await proposed.json() as Mission;
 const supported=await call(`missions/${mission.id}/support`,{amount:25,operationId:crypto.randomUUID()},cookie);expect(supported.status).toBe(200);expect((await supported.json() as Mission).support).toBe(25);
});
