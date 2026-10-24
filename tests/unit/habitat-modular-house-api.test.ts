import {describe,expect,it} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {handleApi} from '@/server/api';
import {exec} from '@/db';
import type {HabitatState,WorldObject} from '@/domain/habitat';
import {motionSchema} from '@/features/habitat/types';
import {DEFAULT_HOUSE,replaceHouse,getHouseAnchor,HOUSE_DOOR_ASSET_ID} from '@/features/habitat/modular-house';
const origin='http://localhost:3000';
function call(path:string,cookie='',data?:unknown,method=data===undefined?'GET':'POST',extra:Record<string,string>={}){return handleApi(new Request(`${origin}/api/${path}`,{method,headers:{Cookie:cookie,...(data===undefined?{}:{'Content-Type':'application/json',Origin:origin}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})}),path.split('/'));}
async function player(name:string){const account=privateKeyToAccount(generatePrivateKey()),ip=crypto.randomUUID();const n=await(await call('auth/nonce','',{address:account.address},'POST',{'cf-connecting-ip':ip})).json() as {nonce:string;message:string};const auth=await call('auth/verify','',{address:account.address,nonce:n.nonce,signature:await account.signMessage({message:n.message})},'POST',{'cf-connecting-ip':ip});expect(auth.status).toBe(200);const cookie=auth.headers.get('set-cookie')!.split(';')[0];const res=await call('habitat/profile',cookie,{name,character:'female'});expect(res.status).toBe(200);const state=await res.json() as HabitatState;return {cookie,wallet:account.address,id:state.profile!.id,world:state.world!};}
const furniture=():WorldObject=>({id:crypto.randomUUID(),assetId:'furniture-kit/lampRoundFloor',name:'Reading lamp',x:1,y:0,z:5,rotation:0,scale:1,behavior:'light',target:''});
async function world(cookie:string,id:string){const r=await call(`habitat/worlds/${id}`,cookie);expect(r.status).toBe(200);return r.json() as Promise<HabitatState>;}
describe('modular house real signed API, persistence and structural ownership',()=>{
 it('owner saves real house configuration and reloads it without replacing furniture',async()=>{
  const p=await player('Sinta Maharani'),lamp=furniture(),objects=replaceHouse([lamp],{...DEFAULT_HOUSE,wallColor:'#c7d4bd',floorFinish:'tile'});
  const save=await call('habitat/save',p.cookie,{worldId:p.world.id,revision:0,objects});expect(save.status).toBe(200);
  const s=await world(p.cookie,p.world.id);expect(getHouseAnchor(s.world!.objects)?.house?.wallColor).toBe('#c7d4bd');expect(s.world!.objects.find(o=>o.id===lamp.id)).toEqual(lamp);expect(s.world!.revision).toBe(1);
  expect((await call('habitat/save',p.cookie,{worldId:p.world.id,revision:0,objects})).status).toBe(409);
 });
 it('invited furniture editors may arrange furnishings but cannot add, alter or remove house structure through any save route',async()=>{
  const owner=await player('Dewi Larasati'),editor=await player('Raka Pratama'),path=`habitat/worlds/${owner.world.id}`;
  const objects=replaceHouse([],DEFAULT_HOUSE);
  expect((await call('habitat/save',owner.cookie,{worldId:owner.world.id,revision:0,objects})).status).toBe(200);
  expect((await call(`${path}/members`,owner.cookie,{wallet:editor.wallet,role:'editor'})).status).toBe(200);
  const changed=replaceHouse(objects,{...DEFAULT_HOUSE,roofColor:'#af7055'});
  expect((await call('habitat/save',editor.cookie,{worldId:owner.world.id,revision:1,objects:changed})).status).toBe(403);
  expect((await call(`${path}/objects`,editor.cookie,{worldId:owner.world.id,revision:1,objects:changed},'PUT')).status).toBe(403);
  const door=objects.find(o=>o.assetId===HOUSE_DOOR_ASSET_ID)!;
  expect((await call(`${path}/objects/${door.id}`,editor.cookie,{revision:1},'DELETE')).status).toBe(403);
  const lamp=furniture();expect((await call(`${path}/objects`,editor.cookie,{revision:1,object:lamp})).status).toBe(200);
  const after=await world(owner.cookie,owner.world.id);expect(after.world!.objects).toHaveLength(objects.length+1);expect(getHouseAnchor(after.world!.objects)?.house).toEqual(DEFAULT_HOUSE);
 });
 it('public visitors can use a nearby door/window/light without receiving structural edit rights',async()=>{
  const owner=await player('Ayu Kirana'),guest=await player('Bayu Saputra'),objects=replaceHouse([furniture()],DEFAULT_HOUSE),id=owner.world.id;
  expect((await call('habitat/save',owner.cookie,{worldId:id,revision:0,objects})).status).toBe(200);
  expect((await call(`habitat/worlds/${id}/settings`,owner.cookie,{name:'Ayu home',visibility:'public',revision:1})).status).toBe(200);
  expect((await call('habitat/join',guest.cookie,{id})).status).toBe(200);
  expect((await call('habitat/save',guest.cookie,{worldId:id,revision:2,objects})).status).toBe(403);
  for(const object of objects.filter(o=>o.behavior==='door'||o.behavior==='light')){
   // Explicit isolated DB presence fixture; browser traversal is tested separately.
   await exec('UPDATE habitat_presence SET x=?,z=?,seen_at=? WHERE profile_id=?',object.x,object.z+1,Date.now(),guest.id);
   expect((await call('habitat/use',guest.cookie,{id:object.id})).status).toBe(200);
   expect((await world(owner.cookie,id)).states[object.id]?.active).toBe(true);
   expect((await call('habitat/use',guest.cookie,{id:object.id})).status).toBe(200);
   expect((await world(owner.cookie,id)).states[object.id]?.active).toBe(false);
  }
  expect((await world(guest.cookie,id)).permissions).toMatchObject({role:'visitor',canEdit:false,canManage:false});
 });
 it('authoritative presence stops at a closed door and walks through the exact same opening when opened',async()=>{
  const p=await player('Putri Wulandari'),objects=replaceHouse([],DEFAULT_HOUSE),door=objects.find(o=>o.assetId===HOUSE_DOOR_ASSET_ID)!;
  expect((await call('habitat/save',p.cookie,{worldId:p.world.id,revision:0,objects})).status).toBe(200);
  const joined=await (await call('habitat/join',p.cookie,{id:p.world.id})).json() as HabitatState,movement={worldId:p.world.id,sessionId:joined.presenceSession!.id,motion:motionSchema.parse({moving:true})};
  await exec('UPDATE habitat_presence SET x=?,z=?,seen_at=? WHERE profile_id=?',door.x,door.z+2,Date.now()-4000,p.id);
  const closed=await call('habitat/presence',p.cookie,{...movement,sequence:1,x:door.x,z:door.z-1,angle:Math.PI});expect(closed.status).toBe(200);const blocked=await closed.json() as HabitatState&{accepted:{x:number;z:number}};expect(blocked.accepted.z).toBeGreaterThan(door.z+.25);
  expect((await call('habitat/use',p.cookie,{id:door.id})).status).toBe(200);
  await exec('UPDATE habitat_presence SET seen_at=? WHERE profile_id=?',Date.now()-4000,p.id);
  const open=await call('habitat/presence',p.cookie,{...movement,sequence:2,x:door.x,z:door.z-1,angle:Math.PI});expect(open.status).toBe(200);const entered=await open.json() as HabitatState&{accepted:{x:number;z:number}};expect(entered.accepted.z).toBeCloseTo(door.z-1);expect(entered.world!.id).toBe(p.world.id);
 });
 it('rejects malformed house transforms, orphan openings and non-owner creation in a legacy world',async()=>{
  const owner=await player('Intan Permata'),editor=await player('Fajar Nugraha'),objects=replaceHouse([],DEFAULT_HOUSE),path=`habitat/worlds/${owner.world.id}`;
  expect((await call(`${path}/members`,owner.cookie,{wallet:editor.wallet,role:'editor'})).status).toBe(200);
  expect((await call('habitat/save',editor.cookie,{worldId:owner.world.id,revision:0,objects})).status).toBe(403);
  expect((await call('habitat/save',owner.cookie,{worldId:owner.world.id,revision:0,objects:objects.map(o=>o.house?{...o,x:3}:o)})).status).toBe(422);
  expect((await call('habitat/save',owner.cookie,{worldId:owner.world.id,revision:0,objects:objects.filter(o=>!o.house)})).status).toBe(422);
 });
});
