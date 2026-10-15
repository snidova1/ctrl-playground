import {describe,it,expect} from 'vitest';
import {venueStaticBatches} from '@/features/habitat/venue-static-batches';
import {createTownVenue,TOWN_VENUES} from '@/domain/town-venues';
import {getBuildAsset} from '@/features/plaza/build-assets';
describe('instanced read-only public room shells',()=>{
 it('batches every original floor/wall with identical transforms, leaving real interactions intact',()=>{
  for(const venue of TOWN_VENUES){
   const objects=createTownVenue(venue.id),batch=venueStaticBatches(objects);
   expect((batch.groups.get('building-kit/floor')?.length??0)+(batch.groups.get('building-kit/wall-window-square')?.length??0)).toBe(86);
   expect(batch.ids.size).toBe(objects.filter(o=>o.behavior==='solid'||o.behavior==='decoration').length);
   expect(batch.groups.size).toBeLessThan(batch.ids.size/3);
   expect(objects.filter(o=>!batch.ids.has(o.id)).some(o=>o.behavior==='seat')).toBe(true);
   expect(objects.filter(o=>!batch.ids.has(o.id)).some(o=>o.behavior==='light')).toBe(true);
   for(const [id,placements] of batch.groups){
    const source=objects.filter(o=>o.assetId===id),extent=Math.max(...getBuildAsset(id)!.bounds);
    expect(placements).toHaveLength(source.length);
    placements.forEach((p,i)=>expect(p).toEqual({x:source[i].x,y:source[i].y,z:source[i].z,size:source[i].scale*extent,yaw:source[i].rotation}));
   }
  }
 });
 it('never batches usable or altered-behavior objects even when their model matches',()=>{
  const wall=createTownVenue(TOWN_VENUES[0].id).find(o=>o.assetId.includes('wall'))!;
  const objects=['seat','door','light','spin','portal','switch'].map((behavior,i)=>({...wall,id:String(i),behavior:behavior as typeof wall.behavior}));
  expect(venueStaticBatches(objects).ids.size).toBe(0);
 });
});
