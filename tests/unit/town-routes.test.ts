import {describe,it,expect} from 'vitest';
import {exec,one} from '@/db';
import {actor,api,error} from './security/habitat-fixtures';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world';
import {getWorkSite,TOWN_ROUTES,TOWN_WORK_SITES} from '@/domain/town-routes';
import {isPublicWorldWalkable} from '@/features/habitat/public-world-geography';
import {createTownVenue} from '@/domain/town-venues';
import {isWorldPointWalkable} from '@/features/habitat/types';
import type {HabitatState} from '@/domain/habitat';
const latest=async(cookie:string)=>(await (await api('habitat/state',undefined,cookie)).json()) as HabitatState;
async function enter(name:string){const a=await actor(name);await api('habitat/public-world',{},a.cookie);const s=await (await api('habitat/join',{id:PUBLIC_WORLD_ID},a.cookie)).json() as HabitatState;return {...a,sessionId:s.presenceSession!.id};}
async function stand(a:Awaited<ReturnType<typeof enter>>,site:string){const p=getWorkSite(site);await exec('UPDATE habitat_presence SET x=?,z=?,seen_at=? WHERE profile_id=?',p.x,p.z,Date.now(),a.id);}
const step=(a:Awaited<ReturnType<typeof enter>>,path:string,r:NonNullable<HabitatState['town']>['route'])=>api(`habitat/town-route/${path}`,{runId:r!.id,revision:r!.revision,sessionId:a.sessionId},a.cookie);
describe('signed multi-stop work routes',()=>{
 it('places every stop on authoritative walkable ground and references existing sites',()=>{
  for(const site of TOWN_WORK_SITES)expect(site.worldId?isWorldPointWalkable(site.x,site.z,createTownVenue(site.worldId),{}):isPublicWorldWalkable(site.x,site.z),site.id).toBe(true);
  for(const route of TOWN_ROUTES)for(const id of route.stops)expect(getWorkSite(id)).toBeDefined();
  // Maintenance must never counterfeit fruit harvest or crafted supplies.
  for(const id of ['lawn-care','street-sweep','walkway-wash','hedge-trim','leaf-rake'])expect(TOWN_ROUTES.find(r=>r.id===id)?.activity).toBe(id);
 });
 it('requires signed presence, exact schemas and a physical first stop',async()=>{
  const a=await enter('Route Security');
  await error(await api('habitat/town-route/start',{id:'clover-mail',sessionId:a.sessionId}),401);
  await error(await api('habitat/town-route/start',{id:'clover-mail',sessionId:a.sessionId},a.cookie),409);
  await stand(a,'post');
  await error(await api('habitat/town-route/start',{id:'clover-mail',sessionId:a.sessionId,xp:100},a.cookie),422);
  expect((await api('habitat/town-route/start',{id:'clover-mail',sessionId:a.sessionId},a.cookie)).status).toBe(200);
  await error(await api('habitat/town-job/start',{id:'neighborhood-post',sessionId:a.sessionId},a.cookie),409);
 });
 it('saves each step across sessions, rejects early finish, races, forgery and wrong stop; peer observes changes',async()=>{
  const a=await enter('Route Walker'),b=await enter('Route Observer');await stand(a,'post');
  await api('habitat/town-route/start',{id:'clover-mail',sessionId:a.sessionId},a.cookie);
  const route=TOWN_ROUTES.find(r=>r.id==='clover-mail')!;
  for(let i=0;i<route.stops.length;i++){
   await stand(a,route.stops[i]);const before=(await latest(a.cookie)).town!.route!;
   await error(await step(b,'work',before),409);
   expect((await step(a,'work',before)).status).toBe(200);
   const working=(await latest(a.cookie)).town!.route!;
   await error(await step(a,'finish',working),409,'ROUTE_NOT_READY');
   await exec('UPDATE town_routes SET ready_at=? WHERE profile_id=?',Date.now()-1,a.id);
   const result=await Promise.all([step(a,'finish',working),step(a,'finish',working)]);
   expect(result.filter(r=>r.status===200)).toHaveLength(1);
   expect((await latest(b.cookie)).town!.visits).toContainEqual(expect.objectContaining({siteId:route.stops[i]}));
   if(i===0){const joined=await (await api('habitat/join',{id:PUBLIC_WORLD_ID},a.cookie)).json() as HabitatState;a.sessionId=joined.presenceSession!.id;expect(joined.town!.route).toMatchObject({step:1});await error(await step(a,'work',joined.town!.route),422,'COME_CLOSER');}
  }
  expect((await latest(a.cookie)).town!.route).toBeNull();
  expect((await latest(a.cookie)).town!.progress.completed).toBe(1);
  expect(await one<{n:number}>('SELECT COUNT(*) AS n FROM town_contributions WHERE profile_id=?',a.id)).toEqual({n:1});
  expect(JSON.stringify((await latest(a.cookie)).town)).not.toMatch(/"(?:xp|level|coins|tokens|balance)":/);
 });
 it('keeps completed stops on cancellation and rejects expired routes',async()=>{
  const a=await enter('Route Cancel');await stand(a,'harbor-west');
  await api('habitat/town-route/start',{id:'harbor-care',sessionId:a.sessionId},a.cookie);
  let r=(await latest(a.cookie)).town!.route!;
  await step(a,'work',r);r=(await latest(a.cookie)).town!.route!;
  await exec('UPDATE town_routes SET ready_at=? WHERE profile_id=?',Date.now()-1,a.id);
  expect((await step(a,'finish',r)).status).toBe(200);r=(await latest(a.cookie)).town!.route!;
  expect((await step(a,'cancel',r)).status).toBe(200);
  expect((await latest(a.cookie)).town!.visits).toContainEqual(expect.objectContaining({siteId:'harbor-west'}));
  await api('habitat/town-route/start',{id:'harbor-care',sessionId:a.sessionId},a.cookie);r=(await latest(a.cookie)).town!.route!;
  await exec('UPDATE town_routes SET expires_at=? WHERE profile_id=?',Date.now()-1,a.id);
  await error(await step(a,'work',r),409,'ROUTE_NOT_ACTIVE');
 });
});
