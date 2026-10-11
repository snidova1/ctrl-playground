import {describe,it,expect} from 'vitest';
import {handleApi} from '@/server/api';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {exec,one} from '@/db';
import {hash} from '@/server/receipts/hash';
import {actor} from './habitat-fixtures';

const origin='http://localhost:3000';
function api(path:string,body?:unknown,cookie?:string,headers:Record<string,string>={}){
 const hasBody=body!==undefined;
 return handleApi(new Request(`${origin}/api/${path}`,{method:hasBody?'POST':'GET',
  headers:{...(hasBody?{'Content-Type':'application/json',Origin:origin}:{}),'cf-connecting-ip':crypto.randomUUID(),...(cookie?{Cookie:cookie}:{}),...headers},
  ...(hasBody?{body:JSON.stringify(body)}:{})}),path.split('/'));
}
const cookieFrom=(r:Response)=>r.headers.get('set-cookie')!.split(';')[0];
describe('security: signed wallet identity and session boundaries',()=>{
 it('consumes one signed challenge exactly once even across concurrent verification attempts',async()=>{
  const owner=privateKeyToAccount(generatePrivateKey());
  const response=await api('auth/nonce',{address:owner.address});
  expect(response.status).toBe(200);
  const {nonce,message}=await response.json() as {nonce:string;message:string};
  expect(message).toContain(owner.address.toLowerCase());
  expect(message).toContain('Chain ID:');
  const signature=await owner.signMessage({message});
  const attempts=await Promise.all(Array.from({length:4},()=>api('auth/verify',{address:owner.address,nonce,signature})));
  expect(attempts.filter(r=>r.status===200)).toHaveLength(1);
  expect(attempts.filter(r=>r.status===401)).toHaveLength(3);
  const valid=cookieFrom(attempts.find(r=>r.status===200)!);
  expect((await (await api('account',undefined,valid)).json() as {wallet:string}).wallet?.toLowerCase()).toBe(owner.address.toLowerCase());
  expect((await api('auth/verify',{address:owner.address,nonce,signature})).status).toBe(401);
 });
 it('rejects a mismatched signer, mismatched wallet, fabricated cookie and revoked cookie',async()=>{
  const alice=privateKeyToAccount(generatePrivateKey()),bob=privateKeyToAccount(generatePrivateKey());
  const {nonce,message}=await (await api('auth/nonce',{address:alice.address})).json() as {nonce:string;message:string};
  const wrongSig=await bob.signMessage({message});
  expect((await api('auth/verify',{address:alice.address,nonce,signature:wrongSig})).status).toBe(401);
  const aliceSig=await alice.signMessage({message});
  expect((await api('auth/verify',{address:bob.address,nonce,signature:aliceSig})).status).toBe(401);
  const accepted=await api('auth/verify',{address:alice.address,nonce,signature:aliceSig});
  expect(accepted.status).toBe(200);
  const cookie=cookieFrom(accepted);
  expect((await api('jobs',undefined,'ctrl_session=forged-value')).status).toBe(401);
  expect((await api('auth/logout',{},cookie)).status).toBe(200);
  expect((await api('jobs',undefined,cookie)).status).toBe(401);
 });
 it('rejects cross-site writes, absent origin and non-JSON content type',async()=>{
  const wallet=privateKeyToAccount(generatePrivateKey());
  const data={address:wallet.address};
  expect((await api('auth/nonce',data,undefined,{Origin:'https://attacker.example'})).status).toBe(403);
  expect((await api('auth/nonce',data,undefined,{Origin:''})).status).toBe(403);
  expect((await api('auth/nonce',data,undefined,{'Content-Type':'text/plain'})).status).toBe(415);
  expect((await api('jobs',{command:'Find a forgotten public archive.',operationId:crypto.randomUUID()},'ctrl_session=fake',{Origin:'https://attacker.example'})).status).toBe(403);
 });
 it('denies real signatures over altered/expired challenges without creating sessions',async()=>{
  const signer=privateKeyToAccount(generatePrivateKey());
  const {nonce,message}=await (await api('auth/nonce',{address:signer.address})).json() as {nonce:string;message:string};
  const altered=await signer.signMessage({message:message.replace('Chain ID: 4663','Chain ID: 1')});
  expect((await api('auth/verify',{address:signer.address,nonce,signature:altered})).status).toBe(401);
  expect(await one('SELECT used FROM nonces WHERE id=?',nonce)).toEqual({used:0});
  const signature=await signer.signMessage({message});
  await exec('UPDATE nonces SET expires_at=? WHERE id=?',Date.now()-1,nonce);
  const rejected=await api('auth/verify',{address:signer.address,nonce,signature});
  expect(rejected.status).toBe(401);
  expect(rejected.headers.get('set-cookie')).toBeNull();
  expect(await one('SELECT id FROM users WHERE wallet=?',signer.address.toLowerCase())).toBeNull();
 });
 it('rejects a previously signed wallet cookie after expiry/logout without deleting durable home state',async()=>{
  const owner=await actor('Expired Auth Owner');
  const token=owner.cookie.slice('ctrl_session='.length);
  await exec('UPDATE sessions SET expires_at=? WHERE id=?',Date.now()-1,await hash(token));
  expect((await api('habitat/state',undefined,owner.cookie)).status).toBe(401);
  expect((await api('habitat/save',{worldId:owner.worldId,revision:0,objects:[]},owner.cookie)).status).toBe(401);
  expect(await one('SELECT id,revision FROM habitat_worlds WHERE id=?',owner.worldId)).toEqual({id:owner.worldId,revision:0});
  const revoked=await actor('Logged Out Owner');
  expect((await api('auth/logout',{},revoked.cookie)).status).toBe(200);
  expect((await api('habitat/profile',{name:'Replay Owner',character:'male'},revoked.cookie)).status).toBe(401);
  expect((await api('habitat/state',undefined,revoked.cookie)).status).toBe(401);
 });
});
