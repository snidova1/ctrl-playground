import {describe,it,expect} from 'vitest';
import base from '../../public/worlds/neighborhood/navigation.json';
import {PUBLIC_LIFE_ENTRIES} from '../../features/worldgacha/public-world-activities';
import {PUBLIC_DISTRICTS,withPublicDistricts} from '../../features/worldgacha/public-districts';
import {worldPath,nextWorldPathPoint,moveOnWorld} from '../../features/worldgacha/navigation';
describe('public activity continuous navigation',()=>{
 it('walks each route from its district arrival using actual per-frame movement',()=>{
  const nav=withPublicDistricts(base);
  for(const entry of PUBLIC_LIFE_ENTRIES){
   const district=PUBLIC_DISTRICTS[entry.x<0?1:2];let p:{x:number;y:number;z:number}={x:district.x,y:0,z:district.z};const route=worldPath(nav,p,entry);
   for(let i=0;i<4000&&route.length;i++){
    const next=nextWorldPathPoint(route,p);if(!next)break;const d=Math.hypot(next.x-p.x,next.z-p.z),step=Math.min(d,3.6/60);
    p=moveOnWorld(nav,p,{x:p.x+(next.x-p.x)/d*step,z:p.z+(next.z-p.z)/d*step});
   }
   expect(Math.hypot(p.x-entry.x,p.z-entry.z),`${entry.id} final ${JSON.stringify(p)} route=${route.length}`).toBeLessThan(.8);
  }
 });
});
