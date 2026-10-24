import {EXTERIOR_HOME} from './exterior-layout';

/** Architectural planting strips; coordinates are local to the cottage group. */
export const COTTAGE_BORDER={x:3.65,z:.7,rx:.57,rz:1.7} as const;
export function cottageBorderContains(x:number,z:number){
 const localX=(x-EXTERIOR_HOME.position[0])/EXTERIOR_HOME.scale;
 const localZ=(z-EXTERIOR_HOME.position[2])/EXTERIOR_HOME.scale;
 return [-1,1].some(side=>((localX-side*COTTAGE_BORDER.x)/COTTAGE_BORDER.rx)**2+((localZ-COTTAGE_BORDER.z)/COTTAGE_BORDER.rz)**2<1.12);
}
