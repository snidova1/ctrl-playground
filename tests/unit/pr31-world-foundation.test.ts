import {expect,it} from 'vitest';
import {TOWN_DISTRICTS,TOWN_DISTRICT_BUILDINGS,DISTRICT_PLOTS} from '../../features/habitat/town-districts';
import {makeTownRegionParts} from '../../features/habitat/town-region-architecture';
import {makeTownSquareInlay} from '../../features/habitat/town-square-foundation';
import {makeTownBackdropRidge} from '../../features/habitat/town-scenery';
import {isPublicWorldWalkable} from '../../features/habitat/public-world-geography';

/** Visual rebuilds are allowed to change the plan, never to desync physical world authority. */
it('authors distinctive non-grid blocks around clear central streets',()=>{
 for(const id of ['residential','workshop','festival','orchard'] as const){
  const district=TOWN_DISTRICTS.find(d=>d.id===id)!;
  const plots=DISTRICT_PLOTS[id],homes=TOWN_DISTRICT_BUILDINGS.filter(h=>h.district===id);
  expect(plots).toHaveLength(10);
  expect(homes).toHaveLength(10);
  expect(new Set(plots.map(p=>p[1])).size).toBeGreaterThanOrEqual(7);
  expect(new Set(plots.map(p=>p[2])).size).toBeGreaterThanOrEqual(4);
  expect(isPublicWorldWalkable(district.x,district.z)).toBe(true);
  for(const h of homes){
   expect(Math.abs(h.x-district.x)).toBeGreaterThan(h.width/2+6);
   expect(Math.abs(h.z-district.z)).toBeGreaterThan(h.depth/2+3);
   expect(isPublicWorldWalkable(h.x,h.z)).toBe(false);
   for(const other of homes){
    if(h.id===other.id)continue;
    const dx=Math.abs(h.x-other.x),dz=Math.abs(h.z-other.z);
    expect(dx>=(h.width+other.width)/2+.75||dz>=(h.depth+other.depth)/2+.75,
      `${h.id} overlaps ${other.id}`).toBe(true);
   }
  }
 }
});
it('keeps the rebuilt architectural volumes finite, merged and drawable',()=>{
 for(const district of ['residential','workshop','festival','orchard','harbor'] as const){
  const parts=makeTownRegionParts(district);
  expect(parts.length).toBeGreaterThan(2);
  expect(parts.length).toBeLessThan(30); // bucketed, not one draw per shutter
  expect(parts.some(p=>p.key.startsWith('roof:'))).toBe(true);
  for(const part of parts){
   const positions=part.geometry.getAttribute('position');
   expect(positions.count).toBeGreaterThan(0);
   expect([...positions.array].every(Number.isFinite)).toBe(true);
   part.geometry.dispose();
  }
 }
});

it('keeps Willow Square's civic inlay flush and horizon geometry finite',()=>{
 const inlay=makeTownSquareInlay();
 expect(inlay.getAttribute('position').count).toBeGreaterThan(300);
 expect(inlay.getAttribute('color').count).toBe(inlay.getAttribute('position').count);
 const position=inlay.getAttribute('position'),normal=inlay.getAttribute('normal');
 for(let i=0;i<position.count;i++){
  expect(position.getY(i)).toBeGreaterThan(.039);
  expect(position.getY(i)).toBeLessThan(.045);
  expect(normal.getY(i)).toBeGreaterThan(.99);
 }
 inlay.dispose();
 for(const phase of [.9,2.7,4.9]){
  const ridge=makeTownBackdropRidge(phase);
  expect([...ridge.getAttribute('position').array].every(Number.isFinite)).toBe(true);
  ridge.dispose();
 }
});
