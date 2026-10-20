export type PublicQuality='low'|'high';
export const PUBLIC_LIFE_BUDGETS={low:{flowers:48,butterflies:4,birds:2,leaves:72},high:{flowers:120,butterflies:8,birds:3,leaves:144}} as const;
// Permanent details stay on the edges, not in visitors' six 4.8m build plots.
export const PUBLIC_BEDS=[{x:-15.25,z:-1.6,w:1.1,d:2.5},{x:-15.25,z:6,w:1.1,d:2.5},{x:15.25,z:2,w:1.1,d:2.5},{x:15.25,z:11.2,w:1.1,d:2.5}];
export const PERGOLA_POSTS=[{x:-10.4,z:-.1},{x:-3.7,z:-.1},{x:-10.4,z:3.1},{x:-3.7,z:3.1}];
export const PUBLIC_LIFE_OBSTACLES=[...PUBLIC_BEDS,...PERGOLA_POSTS.map(p=>({...p,w:.18,d:.18}))];
export function publicLifeBudget(quality:PublicQuality){return PUBLIC_LIFE_BUDGETS[quality];}
export function advanceAmbient(time:number,delta:number,still:boolean){return still?time:time+Math.max(0,Math.min(delta,.05));}
export function butterflyPose(index:number,time:number){const bed=PUBLIC_BEDS[index%PUBLIC_BEDS.length];const phase=index*2.399;return {x:bed.x+Math.cos(time*.31+phase)*.65,y:1.1+Math.sin(time*.8+phase)*.28,z:bed.z+Math.sin(time*.43+phase)*.9,turn:-time*.31-phase,wing:Math.sin(time*13+phase)*.95};}
export function birdPose(index:number,time:number){const phase=time*.085+index*2.1;return {x:Math.cos(phase)*11,y:11.8+Math.sin(phase*2+index)*.7,z:Math.sin(phase)*7-2,turn:-phase,wing:Math.sin(time*4.2+index)*.3};}
