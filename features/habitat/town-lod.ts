/** Hysteresis prevents facade detail thrashing on a district boundary. */
export function townCenterDetailed(x:number,z:number,current:boolean){return Math.hypot(x,z-6)<(current?78:68);}
