import {describe,it,expect} from 'vitest';
import {controllerElapsed,controllerSteps} from '@/features/plaza/controller-time';
import {navigatePublicWorld} from '@/features/habitat/public-world-geography';
import {advanceMovementJump} from '@/features/plaza/controller-motion';
import {createCharacterMotion} from '@/features/plaza/characters/catalog';
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
 it('substeps one and two FPS stalls without slowing actual walking',()=>{
  for(const fps of [1,2,4,5,10,60]){
   let distance=0;for(let i=0;i<fps;i++)for(const step of controllerSteps(1/fps))distance+=3.4*step;
   expect(distance).toBeCloseTo(3.4,8);
  }
 });
 it('never simulates more than a second or four bounded steps',()=>{
  expect(controllerSteps(20)).toEqual([.25,.25,.25,.25]);
  const fractional=controllerSteps(.6);expect(fractional).toHaveLength(3);expect(fractional.reduce((a,b)=>a+b,0)).toBeCloseTo(.6,10);
  for(const invalid of [0,-1,Infinity,NaN])expect(controllerSteps(invalid)).toEqual([]);
 });
 it('retains rail and water collision throughout low-FPS substeps',()=>{
  let p={x:10,z:-16};for(const step of controllerSteps(1))p=navigatePublicWorld(p,{x:p.x,z:p.z-3.4*step});
  expect(p.z).toBeGreaterThan(-16.66);
  let deck={x:83,z:-98};for(const step of controllerSteps(1))deck=navigatePublicWorld(deck,{x:deck.x+3.4*step,z:deck.z});
  expect(deck.x).toBeLessThan(84.7);
 });
 it('finishes the same real-time jump at one, four and sixty FPS',()=>{
  for(const fps of [1,4,60]){
   const motion=createCharacterMotion();let first=true;
   for(let i=0;i<fps;i++)for(const step of controllerSteps(1/fps)){advanceMovementJump(motion,step,first,false,1000+i*1000/fps);first=false;}
   expect(motion.airborne).toBe(false);expect(motion.height).toBe(0);
  }
 });
});
