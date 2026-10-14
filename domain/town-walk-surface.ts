import {townGroundHeight} from './town-terrain';
/** Festival deck/ramp use the same metres in rendering and authority. */
export const FESTIVAL_DECK={x:77,z:-98,halfWidth:8,halfDepth:5,height:.8,rampHalfWidth:2.6,rampLength:4} as const;
export function townSurfaceHeight(x:number,z:number){
 const d=FESTIVAL_DECK;
 if(Math.abs(x-d.x)<=d.halfWidth&&Math.abs(z-d.z)<=d.halfDepth)return d.height;
 const front=d.z+d.halfDepth;
 if(Math.abs(x-d.x)<=d.rampHalfWidth&&z>=front&&z<=front+d.rampLength)return d.height*(front+d.rampLength-z)/d.rampLength;
 return townGroundHeight(x,z);
}
export function festivalDeckBlocks(x:number,z:number){
 const d=FESTIVAL_DECK,r=.34,dx=Math.abs(x-d.x),dz=z-d.z;
 // Rendered rails prevent stepping through the platform's vertical sides.
 if(Math.abs(dx-d.halfWidth)<r+.05&&Math.abs(dz)<d.halfDepth+r)return true;
 if(Math.abs(dz+d.halfDepth)<r+.05&&dx<d.halfWidth+r)return true;
 if(Math.abs(dz-d.halfDepth)<r+.05&&dx>d.rampHalfWidth-r&&dx<d.halfWidth+r)return true;
 if(dz>d.halfDepth-r&&dz<d.halfDepth+d.rampLength&&Math.abs(dx-d.rampHalfWidth)<r+.05)return true;
 return [-6,6].some(px=>Math.abs(x-d.x-px)<.225+r&&Math.abs(z-d.z+4)<.225+r);
}
