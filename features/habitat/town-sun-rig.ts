import {townSurfaceHeight} from '@/domain/town-walk-surface';
/** Same sunlight direction in every district, with a player-centered shadow tile. */
export function townSunRig(x:number,z:number,phase:number){
 const y=townSurfaceHeight(x,z);
 return {target:[x,y,z] as [number,number,number],position:[x+Math.cos(phase)*50,y+14+Math.max(0,Math.sin(phase))*55,z+36] as [number,number,number]};
}
