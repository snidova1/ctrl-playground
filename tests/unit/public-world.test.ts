import {beforeAll,describe,it,expect} from 'vitest';
import {exec,one} from '@/db';
import {handleApi} from '@/server/api';
import {createSession} from '@/server/wallet/auth';
import {PUBLIC_WORLD_ID,createPublicWorld} from '@/features/habitat/public-world';
import {createGuestState,randomGuestStyle} from '@/features/habitat/guest';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {collideWorld} from '@/features/habitat/types';
import type {HabitatState} from '@/domain/habitat';
const origin='http://localhost:3000';
const wallets=['0x00000000000000000000000000000000000000e1','0x00000000000000000000000000000000000000e2'];
const cookies:string[]=[];
const request=(path:string,body:unknown,cookie=cookies[0])=>handleApi(new Request(`${origin}/api/habitat/${path}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)}),['habitat',...path.split('/')]);
beforeAll(async()=>{for(const wallet of wallets){const id=`wallet-${wallet}`;await exec('INSERT INTO users(id,wallet,demo,created_at) VALUES(?,?,0,?)',id,wallet,new Date().toISOString());cookies.push((await createSession(id,false)).split(';')[0]);}});
describe('public world and guest boundary',()=>{
 it('requires both a signed session and a created character',async()=>{
  expect((await request('public-world',{},'')).status).toBe(401);
  expect((await request('public-world',{})).status).toBe(409);
 });
 it('joins two wallets into the same server-owned world with replicated speech and emotes',async()=>{
  for(let i=0;i<2;i++){
   expect((await request('profile',{name:`Visitor ${i}`,character:i?'male':'female'},cookies[i])).status).toBe(200);
   expect(await (await request('public-world',{},cookies[i])).json()).toEqual({id:PUBLIC_WORLD_ID});
  }
  const first=await (await request('join',{id:PUBLIC_WORLD_ID})).json() as HabitatState;
  expect(first.world?.objects.length).toBeGreaterThan(60);
  expect(first.homeId).not.toBe(PUBLIC_WORLD_ID);
  expect(first.permissions).toEqual({role:'visitor',canVisit:true,canEdit:false,canManage:false});
  const second=await (await request('join',{id:PUBLIC_WORLD_ID},cookies[1])).json() as HabitatState;
  expect(second.players.map(p=>p.id)).toContain(`wallet-${wallets[0]}`);
  const sent=await request('presence',{worldId:PUBLIC_WORLD_ID,sessionId:first.presenceSession!.id,sequence:1,x:0,z:6,angle:0,motion:{speech:'Hello neighbors!',speechAt:Date.now(),celebrate:true}});
  expect(sent.status).toBe(200);
  const state=await (await request('join',{id:PUBLIC_WORLD_ID},cookies[1])).json() as HabitatState;
  expect(state.players.find(p=>p.id===first.profile?.id)?.motion).toMatchObject({speech:'Hello neighbors!',celebrate:true});
 });
 it('forbids visitor edits, settings and member changes, including forged editor membership',async()=>{
  await exec("INSERT INTO habitat_members(world_id,profile_id,role,created_at) VALUES(?,?,'editor',?)",PUBLIC_WORLD_ID,`wallet-${wallets[0]}`,Date.now());
  expect((await request('save',{worldId:PUBLIC_WORLD_ID,revision:0,objects:[]})).status).toBe(403);
  expect((await request(`worlds/${PUBLIC_WORLD_ID}/settings`,{name:'Hijacked',visibility:'private'})).status).toBe(403);
  expect((await request(`worlds/${PUBLIC_WORLD_ID}/members`,{wallet:wallets[1],role:'editor'})).status).toBe(403);
  expect((await one<{name:string}>('SELECT name FROM habitat_worlds WHERE id=?',PUBLIC_WORLD_ID))?.name).toBe('Willow Square');
 });
 it('keeps guest builds isolated from each other and the persistent shared layout',()=>{
  const a=createGuestState(),b=createGuestState();
  a.world!.objects=[];
  expect(b.world!.objects.length).toBeGreaterThan(20);
  expect(a.wallet).toBeNull();expect(a.presenceSession).toBeNull();expect(a.homeId).toBeNull();
  expect(a.profile?.id).not.toBe(b.profile?.id);
  const styles=Array.from({length:100},()=>JSON.stringify(randomGuestStyle()));expect(new Set(styles).size).toBe(100);
 });
 it('ships allowlisted models inside budget, a clear spawn and a blocked fountain',()=>{
  const layout=createPublicWorld();expect(layout.length).toBeLessThanOrEqual(120);
  expect(layout.every(o=>o.assetId==='ctrl-block'||getBuildAsset(o.assetId))).toBe(true);
  expect(createPublicWorld()).toEqual(layout);
  expect(collideWorld({x:0,z:6},{x:0,z:5},layout,{}).z).toBeCloseTo(5);
  expect(collideWorld({x:0,z:0},{x:0,z:-3},layout,{}).z).toBeGreaterThan(-2);
 });
});
