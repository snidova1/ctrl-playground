import type {AssetPlacement} from './town-assets';
import {TOWN_PLANTING_CLEARANCES} from './town-prop-layout';
export const TOWN_GARDEN_BEDS=[[-10,2,3.1],[10,2,3.1],[-5.8,7,1.5],[5.8,7,1.5],[-17,16,2.8],[17,16,2.8],[-7,24,2.5],[7,24,2.5]] as const;
/** Deterministic irregular planting, not uniform daisies or new walk blockers. */
export function gardenPlanting(kind:'flower'|'shrub'|'grass'):AssetPlacement[]{
 return TOWN_GARDEN_BEDS.flatMap(([x,z,r],bed)=>{
  const count=kind==='flower'?26:kind==='shrub'?9:18;
  return Array.from({length:count},(_,i)=>{
   const angle=i*2.39996+bed*.7;
   const radius=kind==='shrub'?r*.75:Math.sqrt((i+.5)/count)*r*.87;
   return {x:x+Math.cos(angle)*radius,z:z+Math.sin(angle)*radius,y:.035,size:kind==='flower'?.36+(i%4)*.065:kind==='shrub'?.7+(i%3)*.1:.32+(i%3)*.09,yaw:angle};
  }).filter(p=>!TOWN_PLANTING_CLEARANCES.some(c=>Math.abs(p.x-c.x)<c.width/2&&Math.abs(p.z-c.z)<c.depth/2));
 });
}
export const GARDEN_TREES:AssetPlacement[]=[[-10,-1],[10,-1],[-17,15],[17,15]].map(([x,z],i)=>({x,z,size:4.2+(i%2)*.3,yaw:i*.7}));
