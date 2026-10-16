import {describe,it,expect} from 'vitest';
import {exec,query} from '@/db';
import {TOWN_VENUES,createTownVenue,townVenueOwner} from '@/domain/town-venues';
import {createLegacyTownVenue} from '@/server/habitat/town-venue-legacy';
import {seedTownVenues} from '@/server/habitat/town-venues';
import {isWorldPointWalkable,collideWorld} from '@/features/habitat/types';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {actor,api,error} from './security/habitat-fixtures';
import type {HabitatState} from '@/domain/habitat';

describe('distinct, persistent public interiors',()=>{
 it('keeps all six room identities, supplied assets and interactive seats within the existing budget',()=>{
  const signatures=new Set<string>();
  for(const v of TOWN_VENUES){
   const room=createTownVenue(v.id);expect(room.length).toBeLessThanOrEqual(120);
   expect(room.filter(o=>o.behavior==='seat').length).toBeGreaterThanOrEqual(4);
   expect(room.filter(o=>o.behavior==='light')).toHaveLength(2);
   const props=room.filter(o=>!o.assetId.startsWith('building-kit/'));
   signatures.add(JSON.stringify(props.map(o=>[o.assetId,o.x,o.z,o.behavior])));
   for(const o of room)expect(getBuildAsset(o.assetId),o.assetId).toBeDefined();
   // Detail belongs on the surface, not embedded inside a table or hovering.
   for(const o of room.filter(o=>o.y>.2&&o.behavior==='decoration')){
    expect(room.some(base=>base.behavior==='solid'&&Math.abs(base.y+getBuildAsset(base.assetId)!.bounds[1]*base.scale-o.y)<.001&&Math.hypot(base.x-o.x,base.z-o.z)<1),o.name).toBe(true);
   }
  }
  expect(signatures.size).toBe(6);
 });
 it('provides an actual walkable entrance and a collision-safe path to every seat in every layout',()=>{
  for(const v of TOWN_VENUES){
   const room=createTownVenue(v.id),queue=[{x:0,z:6}],seen=new Set(['0,6']);
   for(let i=0;i<queue.length;i++){
    const from=queue[i];
    for(const [dx,dz] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]){
     const to={x:from.x+dx,z:from.z+dz},key=`${to.x},${to.z}`;
     if(Math.abs(to.x)>9||to.z< -7||to.z>6||seen.has(key)||!isWorldPointWalkable(to.x,to.z,room,{}))continue;
     const actual=collideWorld(from,to,room,{});if(Math.hypot(actual.x-to.x,actual.z-to.z)>.01)continue;
     seen.add(key);queue.push(to);
    }
   }
   for(const seat of room.filter(o=>o.behavior==='seat')){
    expect(isWorldPointWalkable(seat.x,seat.z,room,{}),`${v.name}: ${seat.name}`).toBe(true);
    expect(queue.some(p=>Math.hypot(p.x-seat.x,p.z-seat.z)<.3),`${v.name}: reachable ${seat.name}`).toBe(true);
   }
   for(let z=6;z>=-4;z-=.25)expect(isWorldPointWalkable(0,z,room,{}),`${v.name}: central aisle ${z}`).toBe(true);
  }
 });
 it('CAS-upgrades only an untouched, empty legacy system room and is idempotent',async()=>{
  await seedTownVenues();const v=TOWN_VENUES[0];
  await exec('UPDATE habitat_worlds SET layout=?,revision=0 WHERE id=?',JSON.stringify(createLegacyTownVenue(v.id)),v.id);
  await seedTownVenues();
  const read=async()=>(await query<{layout:string;revision:number;updated_at:number}>('SELECT layout,revision,updated_at FROM habitat_worlds WHERE id=?',v.id))[0];
  const upgraded=await read();expect(upgraded.revision).toBe(1);expect(JSON.parse(upgraded.layout)).toEqual(createTownVenue(v.id));
  await seedTownVenues();expect(await read()).toEqual(upgraded);
 });
 it('does not replace occupied, reserved, edited, revisioned or player-owned room data',async()=>{
  const a=await actor('Room caretaker');await seedTownVenues();
  expect((await api('habitat/join',{id:a.worldId},a.cookie)).status).toBe(200);
  await exec('INSERT INTO habitat_profiles(id,name,character,variant,appearance,created_at) VALUES(?,?,?,?,?,?)','not-the-system-owner','Another owner','female','original','{}',Date.now());
  const originalHome=(await query<{layout:string}>('SELECT layout FROM habitat_worlds WHERE id=?',a.worldId))[0].layout;
  for(const [index,v] of TOWN_VENUES.slice(1).entries()){
   const legacy=JSON.stringify(createLegacyTownVenue(v.id));
   await exec('UPDATE habitat_worlds SET layout=?,revision=0 WHERE id=?',legacy,v.id);
   if(index===0)await exec('UPDATE habitat_presence SET world_id=?,seen_at=? WHERE profile_id=?',v.id,Date.now(),a.id);
   if(index===1)await exec("INSERT INTO town_gatherings(id,host_id,world_id,title,kind,x,z,created_at,ends_at) VALUES(?,?,?,'Reserved workshop','workshop',0,6,?,?)",crypto.randomUUID(),a.id,v.id,Date.now(),Date.now()+60000);
   if(index===2){const altered=createLegacyTownVenue(v.id);altered.at(-1)!.name='An intentional change';await exec('UPDATE habitat_worlds SET layout=? WHERE id=?',JSON.stringify(altered),v.id);}
   if(index===3)await exec('UPDATE habitat_worlds SET revision=2 WHERE id=?',v.id);
   if(index===4){await exec('DELETE FROM habitat_presence WHERE profile_id=?',a.id);await exec('UPDATE habitat_worlds SET owner_id=? WHERE id=?','not-the-system-owner',v.id);}
   const before=await query('SELECT layout,revision,updated_at FROM habitat_worlds WHERE id=?',v.id);await seedTownVenues();
   expect(await query('SELECT layout,revision,updated_at FROM habitat_worlds WHERE id=?',v.id)).toEqual(before);
   // Restore only the test-owned fixture for the next independent guard.
   await exec('UPDATE habitat_worlds SET owner_id=?,layout=?,revision=1 WHERE id=?',townVenueOwner(v.id),JSON.stringify(createTownVenue(v.id)),v.id);
  }
  expect((await query<{layout:string}>('SELECT layout FROM habitat_worlds WHERE id=?',a.worldId))[0].layout).toBe(originalHome);
 });
 it('persists shared lamp changes across two signed sessions and reloads, but rejects distant or stale input',async()=>{
  const a=await actor('Lamp host'),b=await actor('Lamp neighbor');await seedTownVenues();const v=TOWN_VENUES[0];
  const join=async(p:typeof a)=>(await (await api('habitat/join',{id:v.id},p.cookie)).json()) as HabitatState;
  const sa=await join(a);await join(b);const lamp=sa.world!.objects.find(o=>o.behavior==='light')!;
  expect(Math.hypot(lamp.x,lamp.z-6)).toBeLessThan(3.5);
  await error(await api('habitat/use',{id:lamp.id,sessionId:crypto.randomUUID()},a.cookie),409,'STALE_PRESENCE');
  expect((await api('habitat/use',{id:lamp.id,sessionId:sa.presenceSession!.id},a.cookie)).status).toBe(200);
  expect((await join(b)).states[lamp.id].active).toBe(true);
  const restored=await join(a);expect(restored.states[lamp.id].active).toBe(true);
  expect(restored.town!.progress.completed).toBe(0);
  expect(restored.town!.history.filter(e=>e.kind==='switched on')).toEqual([expect.objectContaining({target:`${v.name} · ${lamp.name}`})]);
  await exec('UPDATE habitat_presence SET x=8,z=-6 WHERE profile_id=?',a.id);
  await error(await api('habitat/use',{id:lamp.id},a.cookie),422,'COME_CLOSER');
  expect((await (await api('habitat/state',undefined,a.cookie)).json() as HabitatState).town!.history.filter(e=>e.kind.startsWith('switched'))).toHaveLength(1);
  expect((await api('habitat/use',{id:lamp.id},b.cookie)).status).toBe(200);
  expect((await join(a)).states[lamp.id].active).toBe(false);
  expect((await join(b)).town!.history).toContainEqual(expect.objectContaining({kind:'switched off',target:`${v.name} · ${lamp.name}`}));
 });
});
