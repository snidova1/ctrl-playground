import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_SHOPS} from './public-world-geography';
import {TOWN_DISTRICT_BUILDINGS} from './town-districts';

type Point3={x:number;y:number;z:number};
/** Conservative roof/awning volumes. Camera-only: does not change walking ACLs. */
export function townCameraFraction(target:Point3,desired:Point3){
 let nearest=1;
 for(const house of [...PUBLIC_WORLD_BUILDINGS,...PUBLIC_WORLD_SHOPS,...TOWN_DISTRICT_BUILDINGS]){
  const min={x:house.x-house.width/2-.65,y:-.2,z:house.z-house.depth/2-.8};
  const max={x:house.x+house.width/2+.65,y:6.2,z:house.z+house.depth/2+1.2};
  let enter=0,exit=1;
  for(const axis of ['x','y','z'] as const){
   const delta=desired[axis]-target[axis];
   if(Math.abs(delta)<1e-8){if(target[axis]<min[axis]||target[axis]>max[axis]){exit=-1;break;}continue;}
   const a=(min[axis]-target[axis])/delta,b=(max[axis]-target[axis])/delta;
   enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
  }
  if(enter<=exit&&exit>0)nearest=Math.min(nearest,Math.max(.12,enter-.04));
 }
 return nearest;
}
