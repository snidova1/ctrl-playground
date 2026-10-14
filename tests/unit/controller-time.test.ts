import {describe,it,expect} from 'vitest';
import {controllerElapsed} from '@/features/plaza/controller-time';
import {navigatePublicWorld} from '@/features/habitat/public-world-geography';
describe('bounded frame-rate-independent walking',()=>{
 it('covers the same walking distance at 4, 5, 10 and 60 FPS',()=>{
  for(const fps of [4,5,10,60]){
   let distance=0;for(let i=0;i<fps;i++)distance+=1.8*controllerElapsed(1/fps);
   expect(distance).toBeCloseTo(1.8,8);
  }
 });
 it('bounds suspended-tab catch-up and rejects invalid elapsed values',()=>{
  expect(controllerElapsed(20)).toBe(.25);
  for(const t of [-1,Infinity,NaN])expect(controllerElapsed(t)).toBe(0);
 });
 it('retains swept water-bank collision even on a long render frame',()=>{
  const from={x:10,z:-16},to={x:10,z:-16-3.4*controllerElapsed(1)};
  const result=navigatePublicWorld(from,to);expect(result.z).toBeGreaterThan(-16.66);
 });
});
