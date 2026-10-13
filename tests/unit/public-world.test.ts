import {beforeAll,describe,it,expect} from 'vitest';
import {exec,one} from '@/db';
import {handleApi} from '@/server/api';
import {createSession} from '@/server/wallet/auth';
import {PUBLIC_WORLD_ID,createPublicWorld} from '@/features/habitat/public-world';
import {PUBLIC_WORLD_BOUNDS,isPublicWorldWalkable,navigatePublicWorld,PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_BRIDGES} from '@/features/habitat/public-world-geography';
import {poseInputSchema} from '@/domain/habitat';
import {createGuestState,randomGuestStyle} from '@/features/habitat/guest';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {collideWorld} from '@/features/habitat/types';
import type {HabitatState} from '@/domain/habitat';
import {townCameraFraction} from '@/features/habitat/town-camera';
import {residentPose} from '@/features/habitat/town-residents';
import {actor,api as signedApi} from './security/habitat-fixtures';
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
 it('creates a navigable district map rather than an inaccessible background billboard',()=>{
  expect(PUBLIC_WORLD_BOUNDS.maxX-PUBLIC_WORLD_BOUNDS.minX).toBeGreaterThan(60);
  expect(PUBLIC_WORLD_BOUNDS.maxZ-PUBLIC_WORLD_BOUNDS.minZ).toBeGreaterThan(55);
  expect(PUBLIC_WORLD_BUILDINGS.length).toBeGreaterThanOrEqual(6);
  expect(PUBLIC_WORLD_BRIDGES).toHaveLength(2);
  expect(isPublicWorldWalkable(0,6)).toBe(true);
  // Homes and shops stop the player, but pavement beside them is usable.
  expect(isPublicWorldWalkable(-23,2)).toBe(false);
  expect(isPublicWorldWalkable(-23,11)).toBe(true);
  expect(isPublicWorldWalkable(-8,-9)).toBe(false);
  const wander=navigatePublicWorld({x:0,z:6},{x:19,z:9});
  expect(wander.x).toBeGreaterThan(18);
  expect(wander.z).toBeCloseTo(9,1);
 });
 it('blocks walking through the river except at authored bridges',()=>{
  const denied=navigatePublicWorld({x:10,z:-15},{x:10,z:-25});
  expect(denied.z).toBeGreaterThan(-17.1);
  const crossed=navigatePublicWorld({x:-1.5,z:-15},{x:-1.5,z:-25});
  expect(crossed.z).toBeLessThan(-24.7);
  const eastBridge=navigatePublicWorld({x:20,z:-15},{x:20,z:-25});
  expect(eastBridge.z).toBeLessThan(-24.7);
  expect(isPublicWorldWalkable(0,-19)).toBe(true);
  expect(isPublicWorldWalkable(9,-19)).toBe(false);
 });
 it('limits expanded pose coordinates to the shared public world, preserving private-home bounds',()=>{
  const sample={x:25,z:21,worldId:PUBLIC_WORLD_ID,angle:0,motion:{},sessionId:crypto.randomUUID(),sequence:1};
  expect(poseInputSchema.safeParse(sample).success).toBe(true);
  expect(poseInputSchema.safeParse({...sample,worldId:crypto.randomUUID()}).success).toBe(false);
  expect(poseInputSchema.safeParse({...sample,x:35}).success).toBe(false);
  const scene=createPublicWorld();
  const moved=collideWorld({x:14,z:9},{x:17,z:9},scene,{},PUBLIC_WORLD_ID);
  expect(moved.x).toBeGreaterThan(15);
  expect(collideWorld({x:14,z:9},{x:17,z:9},scene,{}).x).toBeLessThanOrEqual(15);
 });
 it('ships allowlisted models inside budget, a clear spawn and a blocked fountain',()=>{
  const layout=createPublicWorld();expect(layout.length).toBeLessThanOrEqual(120);
  expect(layout.every(o=>o.assetId==='ctrl-block'||getBuildAsset(o.assetId))).toBe(true);
  expect(createPublicWorld()).toEqual(layout);
  expect(collideWorld({x:0,z:6},{x:0,z:5},layout,{}).z).toBeCloseTo(5);
  expect(collideWorld({x:0,z:0},{x:0,z:-3},layout,{}).z).toBeGreaterThan(-2);
 });
});

describe('Public World polish: physical edges and original local ambience',()=>{
 it('keeps avatar shoulders inside both rails and outside waterbanks',()=>{
  for(const bridge of PUBLIC_WORLD_BRIDGES){
   expect(isPublicWorldWalkable(bridge.x+2.7,-19)).toBe(true);
   expect(isPublicWorldWalkable(bridge.x+2.9,-19)).toBe(false);
   expect(isPublicWorldWalkable(bridge.x+3.15,-16.2)).toBe(false);
   const slide=navigatePublicWorld({x:bridge.x,z:-19},{x:bridge.x+8,z:-19});
   expect(slide.x).toBeLessThan(bridge.x+2.74);
  }
  expect(isPublicWorldWalkable(10,-16.8)).toBe(false);
  expect(isPublicWorldWalkable(10,-22.2)).toBe(false);
  expect(isPublicWorldWalkable(2,-3)).toBe(false);
 });
 it('resolves static geography and object walls in the same swept step',()=>{
  const layout=createPublicWorld();
  const moved=collideWorld({x:3,z:0},{x:0,z:-6},layout,{},PUBLIC_WORLD_ID);
  expect(Math.hypot(moved.x,moved.z+3)).toBeGreaterThanOrEqual(2.59);
  for(const h of PUBLIC_WORLD_BUILDINGS){
   const result=collideWorld({x:h.x,z:h.z+h.depth/2+2},{x:h.x,z:h.z},layout,{},PUBLIC_WORLD_ID);
   expect(result.z).toBeGreaterThanOrEqual(h.z+h.depth/2+.34);
  }
 });
 it('shortens camera rays at houses, keeps open views unchanged',()=>{
  expect(townCameraFraction({x:0,y:1.25,z:6},{x:0,y:5,z:17})).toBe(1);
  expect(townCameraFraction({x:-23,y:1.25,z:7},{x:-23,y:4,z:0})).toBeLessThan(.4);
  expect(townCameraFraction({x:8,y:1.25,z:-5},{x:8,y:4,z:-12})).toBeLessThan(.5);
 });
 it('keeps deterministic NPC routes walkable with walking and rest phases',()=>{
  for(let index=0;index<4;index++){
   for(let time=0;time<120;time+=.5){
    const p=residentPose(index,time);
    expect(isPublicWorldWalkable(p.x,p.z)).toBe(true);
    expect(residentPose(index,time)).toEqual(p);
   }
  }
  expect(residentPose(0,0)).toMatchObject({moving:false,waving:true});
  expect(residentPose(0,6).moving).toBe(true);
  expect(residentPose(1,20)).toMatchObject({sitting:true,moving:false});
 });
 it('walks a signed round trip across both bridges; preserves private-home access',async()=>{
  const owner=await actor('Cozy Owner'),visitor=await actor('Cozy Visitor');
  expect((await signedApi('habitat/public-world',{},visitor.cookie)).status).toBe(200);
  let state=await (await signedApi('habitat/join',{id:PUBLIC_WORLD_ID},visitor.cookie)).json() as HabitatState;
  let position={x:0,z:6},sequence=0;
  const sessionId=state.presenceSession!.id;
  const points=[[17,6],[17,-14],[20,-14],[20,-23.5],[-1.5,-23.5],[-1.5,-14],[0,-14],[0,-6],[3,-6],[3,6],[0,6]];
  for(const [x,z] of points){
   const start={...position},steps=Math.ceil(Math.hypot(x-start.x,z-start.z)/.95);
   for(let i=1;i<=steps;i++){
    const next={x:start.x+(x-start.x)*i/steps,z:start.z+(z-start.z)*i/steps};
    const response=await signedApi('habitat/presence',{worldId:PUBLIC_WORLD_ID,sessionId,sequence:++sequence,...next,angle:0,motion:{moving:true}},visitor.cookie);
    expect(response.status).toBe(200);
    const body=await response.json() as HabitatState&{accepted:{x:number;z:number}};
    expect(body.accepted.x).toBeCloseTo(next.x,3);expect(body.accepted.z).toBeCloseTo(next.z,3);
    position=body.accepted;state=body;
   }
  }
  expect((await signedApi('habitat/join',{id:owner.worldId},visitor.cookie)).status).toBe(404);
  expect((await signedApi(`habitat/worlds/${owner.worldId}/members`,{wallet:visitor.wallet,role:'visitor'},owner.cookie)).status).toBe(200);
  const permitted=await signedApi('habitat/join',{id:owner.worldId},visitor.cookie);
  expect(permitted.status).toBe(200);
  expect((await permitted.json() as HabitatState).permissions?.canEdit).toBe(false);
  const back=await (await signedApi('habitat/join',{id:PUBLIC_WORLD_ID},visitor.cookie)).json() as HabitatState;
  expect(back.profile).toEqual(state.profile);expect(back.homeId).toBe(visitor.worldId);
 });
});
