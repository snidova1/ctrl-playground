import {describe,it,expect} from 'vitest';
import {exec} from '@/db';
import {actor,api,error} from './security/habitat-fixtures';
import {TOWN_VENUES} from '@/domain/town-venues';
import {getWorkSite} from '@/domain/town-routes';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world';
import type {HabitatState} from '@/domain/habitat';
const state=async(cookie:string)=>(await (await api('habitat/state',undefined,cookie)).json()) as HabitatState;
describe('authoritative indoor/outdoor routes',()=>{
 it('binds starts and finishes to the correct world, persists the stop and records exactly one final contribution',async()=>{
  const a=await actor('Room worker'),b=await actor('Room observer');await api('habitat/public-world',{},a.cookie);
  const site=getWorkSite('tea-service');
  const join=async(id:string)=>{
   const s=await (await api('habitat/join',{id},a.cookie)).json() as HabitatState;
   await exec('UPDATE habitat_presence SET x=?,z=?,seen_at=? WHERE profile_id=?',site.x,site.z,Date.now(),a.id);return s.presenceSession!.id;
  };
  let sessionId=await join(a.worldId);
  await error(await api('habitat/town-route/start',{id:'tea-service',sessionId},a.cookie),409);
  sessionId=await join(site.worldId!);
  expect((await api('habitat/town-route/start',{id:'tea-service',sessionId},a.cookie)).status).toBe(200);
  const act=async(path:string)=>{const r=(await state(a.cookie)).town!.route!;return api(`habitat/town-route/${path}`,{runId:r.id,revision:r.revision,sessionId},a.cookie);};
  sessionId=await join(TOWN_VENUES[1].id);await error(await act('work'),409,'WORLD_SESSION_EXPIRED');
  sessionId=await join(site.worldId!);expect((await act('work')).status).toBe(200);await error(await act('finish'),409,'ROUTE_NOT_READY');
  // Unit-only elapsed-time fixture. Browser acceptance waits the actual six seconds.
  await exec('UPDATE town_routes SET ready_at=? WHERE profile_id=?',Date.now()-1,a.id);
  sessionId=await join(PUBLIC_WORLD_ID);await error(await act('finish'),409,'WORLD_SESSION_EXPIRED');
  sessionId=await join(site.worldId!);expect((await act('finish')).status).toBe(200);
  expect((await state(b.cookie)).town!.visits).toContainEqual(expect.objectContaining({siteId:site.id}));
  sessionId=await join(site.worldId!);expect((await state(a.cookie)).town!.route!.step).toBe(1);await error(await act('work'),409,'WORLD_SESSION_EXPIRED');
  sessionId=await join(PUBLIC_WORLD_ID);const cafe=getWorkSite('cafe');
  await exec('UPDATE habitat_presence SET x=?,z=? WHERE profile_id=?',cafe.x,cafe.z,a.id);
  expect((await act('work')).status).toBe(200);await exec('UPDATE town_routes SET ready_at=? WHERE profile_id=?',Date.now()-1,a.id);
  const run=(await state(a.cookie)).town!.route!;
  const outcomes=await Promise.all([0,1].map(()=>api('habitat/town-route/finish',{runId:run.id,revision:run.revision,sessionId},a.cookie)));
  expect(outcomes.filter(r=>r.status===200)).toHaveLength(1);
  expect((await state(a.cookie)).town!.progress.completed).toBe(1);expect((await state(b.cookie)).town!.progress.completed).toBe(0);
 });
});
