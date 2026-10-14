import {describe,it,expect} from 'vitest';
import {nearbyResidents,residentPose,TOWN_RESIDENT_NAMES} from '@/features/habitat/town-residents';
import {isPublicWorldWalkable} from '@/features/habitat/public-world-geography';
describe('physical district NPC ambience, separate from player presence',()=>{
 it('keeps every complete routine out of buildings, trees and water',()=>{
  for(let i=0;i<TOWN_RESIDENT_NAMES.length;i++)for(let seconds=0;seconds<60;seconds+=.5){
   const p=residentPose(i,seconds);expect(isPublicWorldWalkable(p.x,p.z),`${TOWN_RESIDENT_NAMES[i]} at ${p.x},${p.z}`).toBe(true);
   expect(residentPose(i,seconds)).toEqual(p);expect(p.working&&p.moving).toBe(false);
  }
 });
 it('mounts nearby residents in every district within the existing avatar budget',()=>{
  for(const [x,z] of [[0,6],[78,27],[-75,46],[5,-76],[-75,-52],[77,-73],[76,80]]){
   const low=nearbyResidents(x,z,'low'),high=nearbyResidents(x,z,'high');expect(low.length).toBeGreaterThan(0);expect(low.length).toBeLessThanOrEqual(2);expect(high.length).toBeLessThanOrEqual(4);
  }
  expect(nearbyResidents(5,-76,'low')).toContain(6);expect(nearbyResidents(5,-76,'low')).not.toContain(0);
 });
});
