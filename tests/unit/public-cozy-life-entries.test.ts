import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import base from '../../public/worlds/neighborhood/navigation.json';
import {createNeighborhood,interact,nearestInteraction} from '../../features/worldgacha/neighborhood-state';
import {groundAt,moveOnWorld,worldPath} from '../../features/worldgacha/navigation';
import {districtObstacle,withPublicDistricts} from '../../features/worldgacha/public-districts';
import {PUBLIC_ACTIVITIES,PUBLIC_LIFE_ENTRIES,PUBLIC_FISHING_SPOT,performPublicActivity} from '../../features/worldgacha/public-world-activities';

const nav=withPublicDistricts(base);
afterEach(()=>vi.unstubAllGlobals());
describe('cozy life entries belong to real public places',()=>{
 it('maps all six panels to distinct, reachable, unobstructed interaction points',()=>{
  expect(PUBLIC_LIFE_ENTRIES.map(a=>a.tab).sort()).toEqual(['barter','community','craft','fishing','garden','kitchen']);
  for(const a of PUBLIC_LIFE_ENTRIES){
   expect(PUBLIC_ACTIVITIES).toContain(a);
   expect(districtObstacle(a.x,a.z),a.id).toBe(false);
   expect(groundAt(nav,a.x,a.z),a.id).not.toBeNull();
   const route=worldPath(nav,base.spawn,a);expect(route.length,a.id).toBeGreaterThan(1);
   let p={...base.spawn};for(const step of route)p=moveOnWorld(nav,p,step);
   expect(Math.hypot(p.x-a.x,p.z-a.z),a.id).toBeLessThan(nav.step);
   const s=createNeighborhood();Object.assign(s.player,a);
   expect(nearestInteraction(s)?.id,a.id).toBe(a.id);
  }
 });
 it('dispatches only after a nearby real interaction and never alters inventory/progression',()=>{
  const target=new EventTarget(),opened:unknown[]=[];vi.stubGlobal('window',target);
  target.addEventListener('cozy-life-open',e=>opened.push((e as CustomEvent).detail));
  for(const a of PUBLIC_LIFE_ENTRIES){
   const s=createNeighborhood();const legacy={watered:s.watered,coffees:s.coffees,residents:JSON.stringify(s.residents)};
   expect(performPublicActivity(s,a.id)).toBeNull();expect(opened).toHaveLength(0);
   Object.assign(s.player,{x:a.x,z:a.z,moving:true,running:true});
   expect(nearestInteraction(s)?.id).toBe(a.id);expect(opened).toHaveLength(0);
   expect(interact(s,a.id)).toBe(a.message);expect(opened.pop()).toEqual({tab:a.tab});
   expect(s.player).toMatchObject({moving:false,running:false,action:'idle'});
   expect(s.watered).toBe(legacy.watered);expect(s.coffees).toBe(legacy.coffees);
   expect(JSON.stringify(s.residents)).toBe(legacy.residents);expect(s.springTended).toBeUndefined();
  }
 });
 it('rejects the range boundary, invalid coordinates and unknown activity IDs',()=>{
  const target=new EventTarget(),open=vi.fn();vi.stubGlobal('window',target);target.addEventListener('cozy-life-open',open);
  const a=PUBLIC_LIFE_ENTRIES[0],s=createNeighborhood();
  for(const offset of [2.6,3,Infinity,NaN]){Object.assign(s.player,{x:a.x+offset,z:a.z});expect(performPublicActivity(s,a.id)).toBeNull();}
  expect(performPublicActivity(s,'made-up-inventory')).toBeNull();expect(open).not.toHaveBeenCalled();expect(s.publicPulse).toBeUndefined();
 });
 it('remains safe during SSR, and keeps legacy tending/tea/rest/bell intact',()=>{
  vi.stubGlobal('window',undefined);const s=createNeighborhood(),a=PUBLIC_LIFE_ENTRIES[0];Object.assign(s.player,a);
  expect(()=>interact(s,a.id)).not.toThrow();
  for(const id of ['garden-tend','garden-rest','market-tea','market-bell'])expect(PUBLIC_ACTIVITIES.some(a=>a.id===id)).toBe(true);
 });
 it('renders the pond/station landmarks only in the public environment, without auto-open handlers',()=>{
  const scene=readFileSync(new URL('../../features/worldgacha/public-district-environment.tsx',import.meta.url),'utf8');
  expect(scene).toContain("name='public-cozy-fishing-pond'");expect(scene).toContain("name='public-fishing-dock'");
  for(const sign of ['SEED & WATER','GATHERED KITCHEN','MAKERS BENCH','COMMUNITY PANTRY','ITEM EXCHANGE'])expect(scene).toContain(sign);
  expect(scene).not.toContain('dispatchEvent');
  const starter=readFileSync(new URL('../../features/habitat/starter-world.ts',import.meta.url),'utf8');
  expect(starter).not.toContain('PUBLIC_FISHING_SPOT');expect(starter).not.toContain('life-fishing');
 });
 it('keeps the ornamental pond beyond the walk grid, with a dry reachable dock approach',()=>{
  const fishing=PUBLIC_LIFE_ENTRIES.find(a=>a.tab==='fishing')!;
  expect(fishing.x).toBe(PUBLIC_FISHING_SPOT.dockX);expect(fishing.z).toBeLessThanOrEqual(13);
  expect(PUBLIC_FISHING_SPOT.pondZ-PUBLIC_FISHING_SPOT.pondRadiusZ).toBeGreaterThan(13);
  expect(groundAt(nav,fishing.x,fishing.z)).not.toBeNull();
 });
});
