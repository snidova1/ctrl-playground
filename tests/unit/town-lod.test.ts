import {describe,it,expect} from 'vitest';
import {townCenterDetailed} from '@/features/habitat/town-lod';
describe('district-aware center detail budget',()=>{
 it('preserves close-up facades and releases their distant detail',()=>{
  expect(townCenterDetailed(0,6,false)).toBe(true);
  for(const [x,z] of [[5,-76],[76,80],[-75,-52],[77,-73]])expect(townCenterDetailed(x,z,true)).toBe(false);
 });
 it('does not oscillate inside the ten-metre hysteresis band',()=>{
  expect(townCenterDetailed(72,6,true)).toBe(true);expect(townCenterDetailed(72,6,false)).toBe(false);
  expect(townCenterDetailed(67,6,false)).toBe(true);expect(townCenterDetailed(79,6,true)).toBe(false);
 });
});
