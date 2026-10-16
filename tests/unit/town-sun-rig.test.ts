import {describe,it,expect} from 'vitest';
import {townSunRig} from '@/features/habitat/town-sun-rig';
import {townSurfaceHeight} from '@/domain/town-walk-surface';
describe('district sunlight and player-centered shadow coverage',()=>{
 it('keeps sunlight direction identical after district travel',()=>{
  for(const phase of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   const origin=townSunRig(0,6,phase),harbor=townSunRig(5,-76,phase),orchard=townSunRig(76,80,phase);
   const direction=(rig:ReturnType<typeof townSunRig>)=>rig.position.map((n,i)=>n-rig.target[i]);
   for(const rig of [harbor,orchard])direction(rig).forEach((n,i)=>expect(n).toBeCloseTo(direction(origin)[i],10));
  }
 });
 it('follows actual terrain/deck elevation and stays inside the shadow far plane',()=>{
  for(const [x,z] of [[77,-98],[-102,74],[76,80],[5,-76]]){
   const rig=townSunRig(x,z,Math.PI/2);expect(rig.target).toEqual([x,townSurfaceHeight(x,z),z]);
   const distance=Math.hypot(...rig.position.map((n,i)=>n-rig.target[i]));expect(distance).toBeLessThan(150);expect(distance).toBeGreaterThan(.5);
  }
 });
});
