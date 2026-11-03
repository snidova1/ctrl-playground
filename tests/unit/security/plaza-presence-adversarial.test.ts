import {describe,it,expect} from 'vitest';
import {handleApi} from '@/server/api';
import {exec} from '@/db';
import {kitBlueprint,plots,type Snapshot} from '@/features/plaza/types';
const origin='http://localhost:3000';
function api(path:string,body?:unknown,cookie?:string,headers:Record<string,string>={}){
 const post=body!==undefined;
 return handleApi(new Request(`${origin}/api/plaza/${path}`,{method:post?'POST':'GET',headers:{
  ...(post?{'Content-Type':'application/json',Origin:origin}:{}),
  'cf-connecting-ip':crypto.randomUUID(),...(cookie?{Cookie:cookie}:{}),...headers
 },...(post?{body:JSON.stringify(body)}:{})}),['plaza',path]);
}
async function visitor(name:string){
 const r=await api('join',{name});expect(r.status).toBe(201);
 return {cookie:r.headers.get('set-cookie')!.split(';')[0],state:await r.json() as Snapshot};
}
describe('security: multiplayer presence identity and workshop object authority',()=>{
 it('does not trust caller-supplied player identity or forged session token',async()=>{
  const a=await visitor('Presence Alpha'),b=await visitor('Presence Bravo');
  expect((await api('state',undefined,'ctrl_plaza=totally-forged')).status).toBe(401);
  const spoof=await api('pose',{x:0,z:6,angle:0,moving:false,id:b.state.me.id},a.cookie);
  expect(spoof.status).toBe(422);
  expect((await api('pose',{x:16,z:-9,angle:0,moving:true},a.cookie)).status).toBe(422);
  const state=await (await api('state',undefined,b.cookie)).json() as Snapshot;
  expect(state.me.id).toBe(b.state.me.id);
  expect(state.me.id).not.toBe(a.state.me.id);
  expect((await api('pose',{x:0,z:6,angle:0,moving:false},a.cookie,{Origin:'https://evil.invalid'})).status).toBe(403);
 });
 it('prevents cross-visitor use of object IDs and idempotency tokens',async()=>{
  const a=await visitor('Creator Alpha'),b=await visitor('Intruder Bravo');
  const id=crypto.randomUUID();
  const blueprint=kitBlueprint('A blue planter in a public courtyard');
  const created=await api('place',{id,blueprint,...plots[a.state.me.plot],rotation:0},a.cookie);
  expect(created.status).toBe(201);
  expect((await api('place',{id,blueprint,...plots[b.state.me.plot],rotation:0},b.cookie)).status).toBe(403);
  expect((await api('remove',{id},b.cookie)).status).toBe(403);
  // Test fixture positions only; no live multiplayer movement is modified.
  await exec('UPDATE plaza_players SET x=9,z=-5.5 WHERE id IN (?,?)',a.state.me.id,b.state.me.id);
  const actionId=crypto.randomUUID();
  expect((await api('use',{id:'plaza-cat',actionId},a.cookie)).status).toBe(200);
  expect((await api('use',{id:'plaza-cat',actionId},b.cookie)).status).toBe(409);
  const actual=await (await api('state',undefined,b.cookie)).json() as Snapshot;
  expect(actual.me.drinks).toBe(0);
  expect((await api('remove',{id},a.cookie)).status).toBe(200);
 });
 it('rejects embedded HTML scripts and unsupported blueprint properties',async()=>{
  expect((await api('join',{name:'<script>alert(1)</script>'})).status).toBe(422);
  const a=await visitor('Payload Tester');
  expect((await api('place',{id:crypto.randomUUID(),blueprint:{...kitBlueprint('green bench'),script:'fetch(\"/api/account\")'},...plots[a.state.me.plot],rotation:0},a.cookie)).status).toBe(422);
  expect((await api('place',{id:crypto.randomUUID(),blueprint:{...kitBlueprint('green bench'),url:'https://evil.invalid/model.glb'},...plots[a.state.me.plot],rotation:0},a.cookie)).status).toBe(422);
 });
});
