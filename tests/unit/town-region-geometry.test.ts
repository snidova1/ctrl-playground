import {it,expect} from 'vitest';
import {makeTownRegionParts} from '@/features/habitat/town-region-architecture';
import {TOWN_DISTRICTS} from '@/features/habitat/town-districts';
it('batches all district facade primitives into valid, finite renderable geometry',()=>{
 for(const district of TOWN_DISTRICTS.filter(d=>d.id!=='center'&&d.id!=='garden')){
  const parts=makeTownRegionParts(district.id);
  expect(parts.length).toBeLessThan(20);expect(parts.length).toBeGreaterThan(5);
  for(const part of parts){
   expect(part.geometry.index).toBeNull();
   const vertices=part.geometry.getAttribute('position');
   expect(vertices.count).toBeGreaterThan(0);
   expect([...vertices.array].every(Number.isFinite)).toBe(true);
   part.geometry.computeBoundingSphere();
   expect(Number.isFinite(part.geometry.boundingSphere?.radius)).toBe(true);
   part.geometry.dispose();
  }
 }
});
