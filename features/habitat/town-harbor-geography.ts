/** Shared by rendering and authoritative movement. Water is never an invisible floor. */
export const HARBOR_WATER={x:5,z:-56,width:95,depth:13,bridgeX:-1.5,pierXs:[-16,-2,12,26]} as const;
export function harborWaterBlocks(x:number,z:number){
 const water=HARBOR_WATER;
 if(Math.abs(x-water.x)>=water.width/2||Math.abs(z-water.z)>=water.depth/2)return false;
 if(Math.abs(x-water.bridgeX)<=2.06)return false;
 return !water.pierXs.some(px=>Math.abs(x-px)<=1.66);
}
