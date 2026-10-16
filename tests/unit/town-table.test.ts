import {beforeEach,describe,expect,it} from 'vitest';
import {exec,one} from '@/db';
import {actor,api,error} from './security/habitat-fixtures';
import {TOWN_ACTIVITIES} from '@/features/habitat/town-districts';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world-geography';
import {TOWN_TABLE,townTableDay} from '@/domain/town-table';
import {readTownTable} from '@/server/habitat/town-table';
import type {HabitatState} from '@/domain/habitat';
const state=async(cookie:string)=>(await(await api('habitat/state',undefined,cookie)).json()) as HabitatState;
async function neighbor(name:string){
 const a=await actor(name);await api('habitat/public-world',{},a.cookie);
 const s=await(await api('habitat/join',{id:PUBLIC_WORLD_ID},a.cookie)).json() as HabitatState;
 return {...a,sessionId:s.presenceSession!.id};
}
type Neighbor=Awaited<ReturnType<typeof neighbor>>;
async function work(a:Neighbor,id:string){
 const activity=TOWN_ACTIVITIES.find(c=>c.id===id)!;
 await api('habitat/town-travel',{id:activity.district,sessionId:a.sessionId},a.cookie);
 await exec('DELETE FROM habitat_object_state WHERE world_id=? AND object_id=?',PUBLIC_WORLD_ID,activity.objectId);
 expect((await api('habitat/town-job/start',{id,sessionId:a.sessionId},a.cookie)).status).toBe(200);
 const job=(await state(a.cookie)).town!.job!;
 // Unit-only elapsed fixture; browser acceptance uses the actual work timers.
 await exec('UPDATE town_jobs SET ready_at=? WHERE id=?',Date.now()-1,job.id);
 expect((await api('habitat/town-job/finish',{jobId:job.id,sessionId:a.sessionId},a.cookie)).status).toBe(200);
 return job.id;
}
const approach=(a:Neighbor)=>exec('UPDATE habitat_presence SET x=?,z=?,seen_at=? WHERE profile_id=?',TOWN_TABLE.x,TOWN_TABLE.z,Date.now(),a.id);
const serve=(a:Neighbor)=>api('habitat/town-table/serve',{sessionId:a.sessionId},a.cookie);
describe('persistent shared daily table without a new economy',()=>{
 beforeEach(async()=>{await exec('DELETE FROM town_daily_tables');await exec('DELETE FROM town_project_work');await exec('DELETE FROM town_contributions');await exec('DELETE FROM town_activity_events');});
 it('requires all three real work categories and two different contributors',async()=>{
  const a=await neighbor('Solo host'),b=await neighbor('Orchard neighbor');
  await approach(a);await error(await serve(a),409,'TABLE_CHANGED');
  await work(a,'orchard-harvest');await work(a,'cafe-supplies');await work(a,'community-garden');await approach(a);
  expect((await state(a.cookie)).town!.table).toMatchObject({neighbors:1,servedAt:0});await error(await serve(a),409,'TABLE_CHANGED');
  expect(await one('SELECT * FROM town_daily_tables')).toBeNull();
  const receipt=await work(b,'orchard-harvest');
  await error(await api('habitat/town-job/finish',{jobId:receipt,sessionId:b.sessionId},b.cookie),409);
  await approach(a);expect((await serve(a)).status).toBe(200);
  const shared=(await state(b.cookie)).town!.table!;expect(shared.servedAt).toBeGreaterThan(0);expect(shared.servedBy).toBe('Solo host');expect(shared.neighbors).toBe(2);
  expect((await state(a.cookie)).town!.progress.completed).toBe(3);expect((await state(b.cookie)).town!.progress.completed).toBe(1);
  expect(JSON.stringify(shared)).not.toMatch(/"(?:xp|level|coins|tokens|balance)":/);
 });
 it('rejects private-room coordinates, stale sessions and distant requests before any world/history change',async()=>{
  const a=await neighbor('Wrong room host');
  for(const id of ['orchard-harvest','cafe-supplies','community-garden'])await work(a,id);
  const home=await(await api('habitat/join',{id:a.worldId},a.cookie)).json() as HabitatState;
  a.sessionId=home.presenceSession!.id;await approach(a);await error(await serve(a),409,'WORLD_SESSION_EXPIRED');
  const pub=await(await api('habitat/join',{id:PUBLIC_WORLD_ID},a.cookie)).json() as HabitatState;a.sessionId=pub.presenceSession!.id;
  await error(await serve(a),422,'COME_CLOSER');await approach(a);
  await exec('UPDATE habitat_presence SET seen_at=? WHERE profile_id=?',Date.now()-16000,a.id);await error(await serve(a),409,'WORLD_SESSION_EXPIRED');
  expect(await one('SELECT * FROM town_daily_tables')).toBeNull();expect(await one("SELECT * FROM town_activity_events WHERE kind='table-served'")).toBeNull();
 });
 it('serves exactly once under two concurrent signed requests and persists after leave/rejoin',async()=>{
  const a=await neighbor('Tea host'),b=await neighbor('Flower host');
  await work(a,'orchard-harvest');await work(a,'cafe-supplies');await work(b,'community-garden');await approach(a);await approach(b);
  const results=await Promise.all([serve(a),serve(b)]);expect(results.map(r=>r.status).sort()).toEqual([200,409]);
  expect(await one('SELECT COUNT(*) AS n FROM town_daily_tables')).toEqual({n:1});
  expect(await one("SELECT COUNT(*) AS n FROM town_activity_events WHERE kind='table-served'")).toEqual({n:1});
  const before=(await state(a.cookie)).town!.table;
  await api('habitat/leave',{worldId:PUBLIC_WORLD_ID,sessionId:b.sessionId},b.cookie);
  const joined=await(await api('habitat/join',{id:PUBLIC_WORLD_ID},b.cookie)).json() as HabitatState;expect(joined.town!.table).toEqual(before);
  const next=await readTownTable(Date.now()+86400000);expect(next.servedAt).toBe(0);expect(next.supplies).toEqual({});
  expect(await one('SELECT COUNT(*) AS n FROM town_daily_tables')).toEqual({n:1});
 });
 it('uses a stable UTC preparation boundary rather than accepting a client day',async()=>{
  expect(townTableDay(Date.parse('2026-10-15T23:59:59.999Z'))).toEqual({day:'2026-10-15',startsAt:Date.parse('2026-10-15T00:00:00Z'),endsAt:Date.parse('2026-10-16T00:00:00Z')});
  const a=await neighbor('No client clock');await approach(a);
  const response=await api('habitat/town-table/serve',{sessionId:a.sessionId,day:'2000-01-01'},a.cookie);expect(response.status).toBe(422);
 });
});
