/** Shared, restrained vocabulary for the house-entry visual target. Saved house colors stay authoritative. */
export const ENTRY_ART=Object.freeze({door:'#63755b',doorInset:'#52634c',doorEdge:'#7b8967',cedar:'#8f7057',trim:'#80644f',limestone:'#b5aa91',brass:'#c5a066',plasterRoughness:.97,openSeconds:.44,closeSeconds:.38});
export interface DoorMotion{angle:number;lever:number;active:boolean;from:number;elapsed:number;}
export function createDoorMotion(active:boolean):DoorMotion{const angle=active?-Math.PI/2:0;return {angle,lever:0,active,from:angle,elapsed:active?ENTRY_ART.openSeconds:ENTRY_ART.closeSeconds};}
/** Pure visual-only easing. Never changes collision, simulation time, input or authoritative state. */
export function stepDoorMotion(previous:DoorMotion,active:boolean,delta:number):DoorMotion{
 const dt=Number.isFinite(delta)?Math.max(0,Math.min(.1,delta)):0;
 const m=active===previous.active?previous:{...previous,active,from:previous.angle,elapsed:0};
 const duration=active?ENTRY_ART.openSeconds:ENTRY_ART.closeSeconds,elapsed=Math.min(duration,m.elapsed+dt);
 const t=Math.max(0,Math.min(1,(elapsed-.05)/(duration-.05))),ease=t*t*(3-2*t),target=active?-Math.PI/2:0;
 return {active,from:m.from,elapsed,angle:t===1?target:m.from+(target-m.from)*ease,lever:elapsed>=.18?0:-Math.sin(Math.PI*elapsed/.18)*.22*(active?1:-1)};
}
/** Snapshot diffs, not clicks: no startup sound, failed-action sound or repeat on polling. */
export function doorFeedbackChanges(previous:ReadonlyMap<string,boolean>,doors:readonly {id:string;active:boolean}[]){return doors.filter(d=>previous.has(d.id)&&previous.get(d.id)!==d.active);}
