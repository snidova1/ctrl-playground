import {describe,it,expect} from 'vitest';
import {exec,query} from '@/db';
import {actor,api,error} from './security/habitat-fixtures';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world';
import {TOWN_VENUES,createTownVenue,townVenueOwner} from '@/domain/town-venues';
import {isPublicWorldWalkable} from '@/features/habitat/public-world-geography';
import {getBuildAsset} from '@/features/plaza/build-assets';
import type {HabitatState} from '@/domain/habitat';
async function enter(name:string){const a=await actor(name);expect((await api('habitat/public-world',{},a.cookie)).status).toBe(200);const s=await (await api('habitat/join',{id:PUBLIC_WORLD_ID},a.cookie)).json() as HabitatState;return {...a,sessionId:s.presenceSession!.id};}
describe('public furnished interiors',()=>{
 it('uses bundled assets, unique objects, safe door positions and bounded layouts',()=>{
  const ids=new Set<string>();
  for(const venue of TOWN_VENUES){
   expect(isPublicWorldWalkable(venue.x,venue.z),venue.name).toBe(true);
   const room=createTownVenue(venue.id);expect(room.length).toBeLessThanOrEqual(120);expect(room.filter(o=>o.behavior==='seat').length).toBeGreaterThan(0);
   for(const o of room){expect(getBuildAsset(o.assetId),o.assetId).toBeDefined();expect(ids.has(o.id)).toBe(false);ids.add(o.id);}
  }
 });
 it('seeds six separate system owners without breaking one home per wallet or overwriting homes',async()=>{
  const a=await enter('Rooms Owner');await api('habitat/public-world',{},a.cookie);
  const rows=await query<{id:string;owner_id:string;layout:string}>('SELECT id,owner_id,layout FROM habitat_worlds WHERE owner_id LIKE ?', 'ctrl-public-venue-%');
  expect(rows).toHaveLength(6);expect(new Set(rows.map(r=>r.owner_id)).size).toBe(6);
  const s=await (await api('habitat/state',undefined,a.cookie)).json() as HabitatState;
  expect(s.homeId).toBe(a.worldId);expect(s.players.some(p=>p.id.startsWith('ctrl-public-venue-'))).toBe(false);
  const before=rows.find(r=>r.id===TOWN_VENUES[0].id)!.layout;await api('habitat/public-world',{},a.cookie);
  expect((await query<{layout:string}>('SELECT layout FROM habitat_worlds WHERE id=?',TOWN_VENUES[0].id))[0].layout).toBe(before);
  expect(rows.map(r=>r.owner_id)).toContain(townVenueOwner(TOWN_VENUES[0].id));
 });
 it('binds physical entry/exit to a fresh signed session, prevents edits and returns to the doorway',async()=>{
  const a=await enter('Room Walker'),v=TOWN_VENUES[1];
  const transition=(path:string,session=a.sessionId)=>api(`habitat/town-venue/${path}`,{id:v.id,sessionId:session},a.cookie);
  await error(await transition('enter'),422,'COME_CLOSER');
  await exec('UPDATE habitat_presence SET x=?,z=?,seen_at=? WHERE profile_id=?',v.x,v.z,Date.now(),a.id);
  await error(await transition('enter',crypto.randomUUID()),409);
  const response=await transition('enter');expect(response.status).toBe(200);const inside=await response.json() as HabitatState;
  expect(inside.world?.id).toBe(v.id);expect(inside.canEdit).toBe(false);expect(inside.world?.objects.length).toBeGreaterThan(80);
  a.sessionId=inside.presenceSession!.id;
  await error(await api('habitat/save',{worldId:v.id,revision:0,objects:[]},a.cookie),403,'EDITOR_REQUIRED');
  await exec('UPDATE habitat_presence SET x=0,z=0 WHERE profile_id=?',a.id);await error(await transition('exit'),422);
  await exec('UPDATE habitat_presence SET z=6 WHERE profile_id=?',a.id);
  const back=await transition('exit');expect(back.status).toBe(200);const outside=await back.json() as HabitatState;
  expect(outside.world!.id).toBe(PUBLIC_WORLD_ID);expect(outside.players.find(p=>p.id===a.id)).toMatchObject({x:v.x,z:v.z});
 });
 it('lets independent players meet, chat and host a consented gathering in a real room',async()=>{
  const a=await enter('Room Host'),b=await enter('Room Friend'),v=TOWN_VENUES[0];
  for(const p of [a,b]){
   await exec('UPDATE habitat_presence SET x=?,z=?,seen_at=? WHERE profile_id=?',v.x,v.z,Date.now(),p.id);
   const result=await api('habitat/town-venue/enter',{id:v.id,sessionId:p.sessionId},p.cookie);expect(result.status).toBe(200);const s=await result.json() as HabitatState;p.sessionId=s.presenceSession!.id;
  }
  expect((await api('habitat/town-chat',{text:'Tea together?',sessionId:a.sessionId},a.cookie)).status).toBe(200);
  const observer=await (await api('habitat/state',undefined,b.cookie)).json() as HabitatState;
  expect(observer.town!.chat).toContainEqual(expect.objectContaining({text:'Tea together?'}));expect(observer.players.some(p=>p.id===a.id)).toBe(true);
  expect((await api('habitat/town-gathering/create',{title:'Tea room picnic',kind:'picnic',sessionId:a.sessionId},a.cookie)).status).toBe(200);
 });
});
