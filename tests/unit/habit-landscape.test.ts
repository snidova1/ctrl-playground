import {describe,it,expect} from 'vitest';
import {grassAllowed,pathCenter,pathWeight,scatterGrass,POND} from '../../features/habitat/stylized-layout';
describe('stylized landscape placement',()=>{
 it('does not grow through house, pond, path or editable clearing',()=>{
  expect(grassAllowed(0,-3)).toBe(false);expect(grassAllowed(POND.x,POND.z)).toBe(false);expect(grassAllowed(0,1)).toBe(false);
  for(let z=0;z<14;z+=.5){expect(grassAllowed(pathCenter(z),z)).toBe(false);expect(pathWeight(pathCenter(z),z)).toBeGreaterThan(.8);}
 });
 it('fills the quality budget deterministically',()=>{
  for(const count of [2500,10000]){const blades=scatterGrass(count);expect(blades).toHaveLength(count);expect(blades.every(b=>grassAllowed(b.x,b.z))).toBe(true);expect(blades.every(b=>b.height>=.15&&b.height<=.43)).toBe(true);}
  expect(scatterGrass(12,22)).toEqual(scatterGrass(12,22));expect(scatterGrass(12,22)).not.toEqual(scatterGrass(12,23));
 });
});
