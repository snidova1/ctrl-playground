// Keep movement time independent of ordinary render cadence. A long stall must
// still have a bounded catch-up; collision checks sweep the resulting distance.
export function controllerElapsed(delta:number){return Number.isFinite(delta)&&delta>0?Math.min(delta,.25):0;}
