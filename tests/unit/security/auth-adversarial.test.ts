import {describe,it,expect} from 'vitest';
import {handleApi} from '@/server/api';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';

const origin='http://localhost:3000';
function api(path:string,body?:unknown,cookie?:string,headers:Record<string,string>={}){
 const hasBody=body!==undefined;
 return handleApi(new Request(`${origin}/api/${path}`,{method:hasBody?'POST':'GET',
  headers:{...(hasBody?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...headers},
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
});
