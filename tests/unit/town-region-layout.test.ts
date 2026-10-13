import {describe,it,expect} from 'vitest';
import {regionPlanting} from '@/features/habitat/town-region-layout';
import {TOWN_DISTRICTS,TOWN_DISTRICT_BUILDINGS} from '@/features/habitat/town-districts';
import {TOWN_ACTIVITIES} from '@/features/habitat/town-districts';
import {HARBOR_WATER,harborWaterBlocks} from '@/features/habitat/town-harbor-geography';
import {isPublicWorldWalkable} from '@/features/habitat/public-world-geography';
describe('district dressing and physical Harbor crossing',()=>{
 it('keeps dense instanced planting off roads, buildings and civic construction sites',()=>{
  for(const d of TOWN_DISTRICTS.filter(d=>d.id!=='center')){
   const p=regionPlanting(d.id);expect(p.trees.length).toBeGreaterThan(12);expect(p.flowers.length).toBeGreaterThan(60);
   expect(p).toEqual(regionPlanting(d.id));
   for(const tree of p.trees){
    expect(Math.abs(tree.x-d.x)).toBeGreaterThan(4);expect(Math.abs(tree.z-d.z)).toBeGreaterThan(4);
    expect(TOWN_DISTRICT_BUILDINGS.some(h=>Math.abs(tree.x-h.x)<h.width/2+2.2&&Math.abs(tree.z-h.z)<h.depth/2+2.2)).toBe(false);
   }
  }
 });
 it('rejects walking on water but allows the actual bridge and four pier decks',()=>{
  expect(harborWaterBlocks(5,-56)).toBe(true);expect(isPublicWorldWalkable(5,-56)).toBe(false);
  for(let z=-62;z<=-50;z+=.5){
   expect(isPublicWorldWalkable(HARBOR_WATER.bridgeX,z)).toBe(true);
   for(const x of HARBOR_WATER.pierXs)expect(isPublicWorldWalkable(x,z)).toBe(true);
  }
  expect(harborWaterBlocks(HARBOR_WATER.pierXs[0]+1.8,-56)).toBe(true);
 });
 it('arrives beside station counters, never inside their solid geometry',()=>{
  for(const a of TOWN_ACTIVITIES.filter(a=>a.district!=='center')){
   expect(isPublicWorldWalkable(a.x,a.z)).toBe(true);
   expect(isPublicWorldWalkable(a.x+2.4,a.z)).toBe(false);
  }
 });
});
