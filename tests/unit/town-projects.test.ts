import {describe,it,expect,beforeEach} from 'vitest';
import {exec,one} from '@/db';
import {actor,api,error} from './security/habitat-fixtures';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world';
import type {HabitatState} from '@/domain/habitat';
import {TOWN_ACTIVITIES} from '@/features/habitat/town-districts';
async function neighbor(name:string){
 const user=await actor(name);
 await api('habitat/public-world',{},user.cookie);
 const joined=await(await api('habitat/join',{id:PUBLIC_WORLD_ID},user.cookie)).json() as HabitatState;
 return {...user,sessionId:joined.presenceSession!.id};
}
const latest=async(cookie:string)=>(await(await api('habitat/state',undefined,cookie)).json()) as HabitatState;
async function contribute(user:Awaited<ReturnType<typeof neighbor>>,id:string){
 const activity=TOWN_ACTIVITIES.find(a=>a.id===id)!;
 expect((await api('habitat/town-travel',{id:activity.district,sessionId:user.sessionId},user.cookie)).status).toBe(200);
 await exec('DELETE FROM habitat_object_state WHERE world_id=? AND object_id=?',PUBLIC_WORLD_ID,activity.objectId);
 expect((await api('habitat/town-job/start',{id,sessionId:user.sessionId},user.cookie)).status).toBe(200);
 const job=(await latest(user.cookie)).town!.job!;
 await exec('UPDATE town_jobs SET ready_at=? WHERE id=?',Date.now()-1,job.id);
 expect((await api('habitat/town-job/finish',{jobId:job.id,sessionId:user.sessionId},user.cookie)).status).toBe(200);
 return job;
}
describe('durable cooperative civic construction',()=>{
 beforeEach(async()=>{await exec('DELETE FROM town_project_work');await exec('DELETE FROM town_projects');});
 it('needs distinct neighbors and ordered district work; saves finished construction across rejoin',async()=>{
  const a=await neighbor('Pavilion Builder'),b=await neighbor('Pavilion Neighbor');
  await contribute(a,'artisan-project'); // out of order never builds the pavilion
  expect((await latest(a.cookie)).town!.projects.find(p=>p.id==='fernwood-pavilion')!.stage).toBe(0);
  await contribute(a,'orchard-harvest');await contribute(a,'orchard-harvest');
  expect((await latest(a.cookie)).town!.projects.find(p=>p.id==='fernwood-pavilion')).toMatchObject({stage:0,contributions:2,neighbors:1});
  await contribute(b,'orchard-harvest');
  expect((await latest(b.cookie)).town!.projects.find(p=>p.id==='fernwood-pavilion')).toMatchObject({stage:1,revision:1});
  await contribute(a,'artisan-project');await contribute(b,'artisan-project');
  await contribute(a,'community-garden');await contribute(b,'community-garden');
  const completed=(await latest(a.cookie)).town!.projects.find(p=>p.id==='fernwood-pavilion')!;
  expect(completed).toMatchObject({stage:3,revision:3});expect(completed.completedAt).toBeGreaterThan(0);
  const rejoined=await(await api('habitat/join',{id:PUBLIC_WORLD_ID},b.cookie)).json() as HabitatState;
  expect(rejoined.town!.projects.find(p=>p.id==='fernwood-pavilion')).toEqual(completed);
  expect(JSON.stringify(rejoined.town)).not.toMatch(/"(?:xp|level|coins|tokens|balance)":/);
 });
 it('never counts replayed, forged or premature receipts as civic work',async()=>{
  const a=await neighbor('Lantern Maker');
  const job=await contribute(a,'artisan-project');
  await error(await api('habitat/town-job/finish',{jobId:job.id,sessionId:a.sessionId},a.cookie),409);
  await error(await api('habitat/town-job/finish',{jobId:crypto.randomUUID(),sessionId:a.sessionId},a.cookie),409);
  const n=await one<{n:number}>('SELECT COUNT(*) AS n FROM town_project_work WHERE project_id=? AND receipt=?','tidewater-lanterns',job.id);
  expect(n!.n).toBe(1);
  expect((await latest(a.cookie)).town!.projects.find(p=>p.id==='tidewater-lanterns')).toMatchObject({stage:0,contributions:1,neighbors:1});
 });
 it('records only the successful gardener and never leaks another player’s history',async()=>{
  const a=await neighbor('Planter'),b=await neighbor('Waterer');
  for(const p of [a,b])await api('habitat/town-travel',{id:'garden',sessionId:p.sessionId},p.cookie);
  expect((await api('habitat/town-garden',{id:'fern-bed-2',action:'plant',revision:0,sessionId:a.sessionId},a.cookie)).status).toBe(200);
  await error(await api('habitat/town-garden',{id:'fern-bed-2',action:'water',revision:0,sessionId:b.sessionId},b.cookie),409);
  expect((await latest(b.cookie)).town!.history).toEqual([]);
  expect((await api('habitat/town-garden',{id:'fern-bed-2',action:'water',revision:1,sessionId:b.sessionId},b.cookie)).status).toBe(200);
  expect((await latest(a.cookie)).town!.history).toMatchObject([{kind:'plant',target:'fern-bed-2'}]);
  const rejoined=await(await api('habitat/join',{id:PUBLIC_WORLD_ID},b.cookie)).json() as HabitatState;
  expect(rejoined.town!.history).toMatchObject([{kind:'water',target:'fern-bed-2'}]);
 });
 it('persists accepted social interactions for both participants, not unaccepted proposals',async()=>{
  const a=await neighbor('Social Initiator'),b=await neighbor('Social Recipient');
  await api('habitat/town-social',{id:b.id,kind:'high-five',sessionId:a.sessionId},a.cookie);
  const proposal=(await latest(b.cookie)).town!.social[0];
  expect((await latest(a.cookie)).town!.history).toEqual([]);
  await api('habitat/town-social/accept',{id:proposal.id,sessionId:b.sessionId},b.cookie);
  expect((await latest(a.cookie)).town!.history).toMatchObject([{kind:'high-five',target:'Social Recipient'}]);
  const fresh=await(await api('habitat/join',{id:PUBLIC_WORLD_ID},b.cookie)).json() as HabitatState;
  expect(fresh.town!.history).toMatchObject([{kind:'high-five',target:'Social Initiator'}]);
 });
});
