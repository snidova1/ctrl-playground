import {describe,it,expect} from 'vitest';
import {COTTAGE_BORDER,cottageBorderContains} from '../../features/habitat/cottage-layout';
import {EXTERIOR_HOME} from '../../features/habitat/exterior-layout';
import {grassAllowed,scatterGrass} from '../../features/habitat/stylized-layout';

describe('Habitat cottage planting layout',()=>{
 it('shares the actual enlarged house transform and clears grass from both flower borders',()=>{
  for(const side of [-1,1]){
   const x=side*COTTAGE_BORDER.x*EXTERIOR_HOME.scale+EXTERIOR_HOME.position[0];
   const z=COTTAGE_BORDER.z*EXTERIOR_HOME.scale+EXTERIOR_HOME.position[2];
   expect(cottageBorderContains(x,z)).toBe(true);
   expect(grassAllowed(x,z)).toBe(false);
  }
 });
 it('leaves the existing center approach and editable lawn outside those borders untouched',()=>{
  for(const z of [0,2,4,6,8,10])expect(cottageBorderContains(0,z)).toBe(false);
  expect(cottageBorderContains(10,7)).toBe(false);
 });
 it('keeps seeded meadow placement deterministic without grass inside the authored borders',()=>{
  const a=scatterGrass(300,7419),b=scatterGrass(300,7419);
  expect(a).toEqual(b);expect(a).toHaveLength(300);
  expect(a.every(p=>!cottageBorderContains(p.x,p.z))).toBe(true);
 });
});
