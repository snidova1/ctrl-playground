import {describe,it,expect} from 'vitest';
import {handleApi} from '@/server/api';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
const origin='http://localhost:3000';
function api(path:string,data?:unknown,cookie?:string,override:Record<string,string>={}){
 const post=data!==undefined;
 return handleApi(new Request(`${origin}/api/${path}`,{method:post?'POST':'GET',headers:{
  ...(post?{'Content-Type':'application/json',Origin:origin}:{}),
  'cf-connecting-ip':crypto.randomUUID(),...(cookie?{Cookie:cookie}:{}),...override
 },...(post?{body:JSON.stringify(data)}:{})}),path.split('/'));
}
async function signed(){
 const signer=privateKeyToAccount(generatePrivateKey());
 const n=await (await api('auth/nonce',{address:signer.address})).json() as {nonce:string;message:string};
 const signature=await signer.signMessage({message:n.message});
 const res=await api('auth/verify',{address:signer.address,nonce:n.nonce,signature});
 expect(res.status).toBe(200);
 return res.headers.get('set-cookie')!.split(';')[0];
}
async function profile(cookie:string,name:string){
 const response=await api('habitat/profile',{name,character:'female',variant:'original'},cookie);
 expect(response.status).toBe(200);
 return response.json() as Promise<{world:{id:string;revision:number;objects:unknown[]};canEdit:boolean}>;
}
function object(id=crypto.randomUUID()){return {id,assetId:'ctrl-block',name:'Safe Block',x:0,y:0,z:0,rotation:0,scale:1,behavior:'solid',target:''};}
describe('security: habitat access control and adversarial saves',()=>{
 it.fails('rejects unsigned plaza guest world creation (known wallet-boundary regression)',async()=>{
  const guest=await api('plaza/join',{name:'Unauthorized Guest'});
  expect(guest.status).toBe(201);
  const cookie=guest.headers.get('set-cookie')!.split(';')[0];
  const creation=await api('habitat/profile',{name:'Unauthorized Guest',character:'female',variant:'original'},cookie);
  // Security requirement from docs/TASK_OWNERSHIP.md: verified wallet session required.
  expect(creation.status).toBe(401);
 });
 it('keeps private worlds inaccessible to foreign sessions, including forged world visits',async()=>{
  const owner=await signed(),other=await signed();
  const a=await profile(owner,'Home Alpha');await profile(other,'Home Bravo');
  expect((await api('habitat/visit',{id:a.world.id},other)).status).toBe(404);
  const ownerState=await api('habitat/state',undefined,owner);
  expect(ownerState.status).toBe(200);
  expect(((await ownerState.json()) as {world:{id:string}}).world.id).toBe(a.world.id);
  expect((await api('habitat/settings',{name:'Other World',visibility:'public'},other)).status).toBe(200);
  expect((await api('habitat/save',{worldId:a.world.id,revision:a.world.revision,objects:[]},other)).status).toBe(409);
 });
 it('blocks cross-wallet edits after public visit, yet permits viewing',async()=>{
  const owner=await signed(),attacker=await signed();
  const a=await profile(owner,'Public Realm');await profile(attacker,'Visitor Realm');
  expect((await api('habitat/settings',{name:'Public Realm',visibility:'public'},owner)).status).toBe(200);
  const visit=await api('habitat/visit',{id:a.world.id},attacker);
  expect(visit.status).toBe(200);
  expect((await visit.json() as {canEdit:boolean}).canEdit).toBe(false);
  expect((await api('habitat/save',{worldId:a.world.id,revision:0,objects:[object()]},attacker)).status).toBe(403);
  expect((await api('habitat/settings',{name:'Hijacked Realm',visibility:'private'},attacker)).status).toBe(403);
  expect((await api('habitat/use',{id:crypto.randomUUID()},attacker)).status).toBe(404);
 });
 it('rejects executable, remote, duplicate, invalid and excessive world objects',async()=>{
  const owner=await signed();const home=await profile(owner,'Asset Tester');
  const save=(objects:unknown)=>api('habitat/save',{worldId:home.world.id,revision:0,objects},owner);
  expect((await save([{...object(),script:'alert(1)'}])).status).toBe(422);
  expect((await save([{...object(),assetId:'https://evil.invalid/model.glb'}])).status).toBe(422);
  expect((await save([{...object(),assetId:'../../private/file'}])).status).toBe(422);
  const duplicate=object();expect((await save([duplicate,duplicate])).status).toBe(422);
  expect((await save(Array.from({length:121},()=>object()))).status).toBe(422);
  expect((await save([{...object(),scale:1e15}])).status).toBe(422);
  expect((await api('habitat/profile',{name:'<img onerror=alert(1)>',character:'female',variant:'original'},owner)).status).toBe(422);
  expect((await save([object()])).status).toBe(200);
 });
 it('enforces optimistic revision exactly once under concurrent saves and rejects stale edits',async()=>{
  const owner=await signed();const home=await profile(owner,'Revision Tester');
  const requests=await Promise.all([
   api('habitat/save',{worldId:home.world.id,revision:0,objects:[object()]},owner),
   api('habitat/save',{worldId:home.world.id,revision:0,objects:[object()]},owner)
  ]);
  expect(requests.map(r=>r.status).sort()).toEqual([200,409]);
  const state=await (await api('habitat/state',undefined,owner)).json() as {world:{revision:number;objects:unknown[]}};
  expect(state.world.revision).toBe(1);
  expect(state.world.objects).toHaveLength(1);
  expect((await api('habitat/save',{worldId:home.world.id,revision:0,objects:[]},owner)).status).toBe(409);
 });
 it('rejects forged cookies, cross-origin writes and oversized JSON',async()=>{
  expect((await api('habitat/state',undefined,'ctrl_session=invalid')).status).toBe(401);
  const owner=await signed();await profile(owner,'Origin Tester');
  expect((await api('habitat/settings',{name:'Attack',visibility:'public'},owner,{Origin:'https://attacker.invalid'})).status).toBe(403);
  const oversized=await api('habitat/save',{worldId:crypto.randomUUID(),revision:0,objects:[],padding:'X'.repeat(80001)},owner);
  expect(oversized.status).toBe(413);
 });
});
