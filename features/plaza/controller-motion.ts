import {advanceJump,type CharacterMotion} from './characters/catalog';
/** Preserve the avatar integrator's 50ms safety limit without losing frame time. */
export function advanceMovementJump(motion:CharacterMotion,delta:number,requested:boolean,locked:boolean,now:number){
 if(!Number.isFinite(delta)||delta<=0)return;
 const elapsed=Math.min(delta,.25);
 for(let t=0;t<elapsed-1e-9;t+=.05)advanceJump(motion,Math.min(.05,elapsed-t),requested&&t===0,locked,now);
}
