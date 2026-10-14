// Keep movement time independent of ordinary render cadence. A long stall must
// still have a bounded catch-up; collision checks sweep the resulting distance.
export function controllerElapsed(delta:number){return Number.isFinite(delta)&&delta>0?Math.min(delta,.25):0;}

// Render stalls below a second must not turn running into slow motion. Sweep
// collision/jump in at most four existing 250ms steps, never one large teleport.
// Discard any further stall time; tab resume is handled separately by the hook.
export function controllerSteps(delta:number):number[]{
 if(!Number.isFinite(delta)||delta<=0)return [];
 const steps:number[]=[];let remaining=Math.min(delta,1);
 while(remaining>1e-9&&steps.length<4){const step=controllerElapsed(remaining);steps.push(step);remaining-=step;}
 return steps;
}
