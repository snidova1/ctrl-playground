import type {WorldObject} from './types';
export function nearestUsable(objects:WorldObject[],x:number,z:number){
 return objects.filter(o=>!['decoration','solid'].includes(o.behavior)&&Math.hypot(o.x-x,o.z-z)<=3.5).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
}
