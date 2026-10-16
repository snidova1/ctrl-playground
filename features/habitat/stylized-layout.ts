// Shared ground/grass mask, following stylized-scene's shared path blend.
import {intersectsExteriorHouse} from './exterior-layout';
export const POND = {x:15.8,z:-3.65,rx:3.55,rz:2.4} as const;
export function pathCenter(z:number){return Math.sin((z+.6)*.28)*.72;}
export function smoothMask(a:number,b:number,value:number){const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);}
export function pathWeight(x:number,z:number){return (1-smoothMask(.78,1.32,Math.abs(x-pathCenter(z))))*smoothMask(-1,-.4,z)*(1-smoothMask(13.5,15,z));}
export function grassAllowed(x:number,z:number){
 if(intersectsExteriorHouse(x,z,0,0,.3))return false;
 if(pathWeight(x,z)>.04)return false;
 if((x/POND.rx-POND.x/POND.rx)**2+(z/POND.rz-POND.z/POND.rz)**2<1.28)return false;
 if((x/4.8)**2+((z-1.5)/3.3)**2<1)return false;
 return Math.abs(x)<19.7&&Math.abs(z)<15.7;
}
export function seededRandom(initial:number){let seed=initial>>>0;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function scatterGrass(count:number,seed=7419){const random=seededRandom(seed),result:Array<{x:number;z:number;angle:number;height:number}>=[];for(let i=0;i<count*8&&result.length<count;i++){const x=random()*39-19.5,z=random()*31-15.5;if(grassAllowed(x,z))result.push({x,z,angle:random()*Math.PI*2,height:.15+random()*.28});}return result;}
