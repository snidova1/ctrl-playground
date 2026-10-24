import {AnimationMixer, LoopOnce, LoopRepeat, type AnimationAction,type AnimationClip} from 'three';
import type {LoadedCharacter} from './loader';
import {characterBudgets, type CharacterMotion} from './catalog';
import {CharacterExpressionController} from './expression-controller';
import {resetModularSprings,updateModularParts} from './modular-runtime';
export type CharacterState='Idle'|'Walk'|'Run'|'JumpStart'|'JumpLoop'|'Land'|'SitDown'|'Seated'|'StandUp'|'Interact'|'Victory';
export type CharacterGesture='interact'|'victory';
export interface AnimationInput {moving:boolean;sitting:boolean;celebrate:boolean;interactedAt:number;motion?:CharacterMotion;}
const gestureStates:Record<CharacterGesture,CharacterState>={interact:'Interact',victory:'Victory'};
const fadeSeconds=.16;
const safetyStates=new Set<CharacterState>(['JumpStart','JumpLoop','Land','SitDown','Seated','StandUp']);
/** This bundle has linear tracks. Reverse copies, including baked hand
 * clearance, rather than modifying shared clips or snapping straight to Idle. */
function standUpClip(source:AnimationClip):AnimationClip{
 const clip=source.clone();clip.name='StandUp';
 for(const track of clip.tracks){
  const times=track.times.slice(),values=track.values.slice(),size=track.getValueSize(),last=times.length-1;
  for(let i=0;i<=last;i++){track.times[i]=clip.duration-times[last-i];for(let j=0;j<size;j++)track.values[i*size+j]=values[(last-i)*size+j];}
 }
 return clip;
}
interface GestureRun {id:CharacterGesture;action:AnimationAction;finished:boolean;}
/** One mixer writes normalized bones; VRM updates raw bones afterwards. */
export class HumanoidAnimator {
  readonly mixer:AnimationMixer;
  readonly actions:Map<string,AnimationAction>;
  readonly expressions:CharacterExpressionController;
  state:CharacterState='Idle';
  private accumulator=0;
  private disposed=false;
  private seated=false;
  private wasSitting=false;
  private standing=false;
  private standStart=0;
  private sitStart=0;
  private wasCelebrating=false;
  private interactedAt=-Infinity;
  // Latest sampled locomotion is independent of the temporary full-body gesture.
  private baseState:CharacterState='Idle';
  private currentAction:AnimationAction;
  private gesture:GestureRun|null=null;
  private readonly retiring=new Map<AnimationAction,number>();
  private readonly onFinished=(event:{action:AnimationAction})=>{
    // Unique action identity is also the run token (even for same-clip retriggers).
    // Defer restoration until AFTER mixer.update, never mutate its action array
    // from inside Three's finished dispatch.
    if(!this.disposed&&this.gesture?.action===event.action)this.gesture.finished=true;
  };
  constructor(readonly character:LoadedCharacter) {
    this.mixer=new AnimationMixer(character.vrm.scene);
    this.actions=new Map(character.clips.map(c=>[c.name,this.mixer.clipAction(c)]));
    for(const name of ['Idle','Walk','Run','JumpStart','JumpLoop','Land','SitDown','Seated','Interact','Victory']) if(!this.actions.has(name))throw new Error(`Missing animation: ${name}`);
    if(!this.actions.has('StandUp'))this.actions.set('StandUp',this.mixer.clipAction(standUpClip(character.clips.find(c=>c.name==='SitDown')!)));
    this.expressions=new CharacterExpressionController(character.vrm);
    this.mixer.addEventListener('finished',this.onFinished);
    this.currentAction=this.actions.get('Idle')!;
    this.expressions.setIdleLife(true);
    this.currentAction.play();this.mixer.update(0);this.expressions.update(0);character.vrm.update(0);updateModularParts(character.vrm,0);
  }

  get activeGesture():CharacterGesture|null{return this.gesture?.id??null;}
  /** Local progress also works when reversing a partially completed SitDown. */
  get seatProgress(){const a=this.actions.get(this.state);if(!a)return 0;const start=this.state==='StandUp'?this.standStart:0;return Math.min(1,Math.max(0,(a.time-start)/Math.max(.001,a.getClip().duration-start)));}

  /** Full-body one-shot; reject during sitting/jump/landing, never queue it.
   * Movement remains sampled while playing. Safety transitions interrupt on the
   * next update; finish/cancel restore the latest sampled state, not start/Idle.
   */
  playGesture(id:CharacterGesture):boolean {
    if(this.disposed||!Object.prototype.hasOwnProperty.call(gestureStates,id)||safetyStates.has(this.baseState))return false;
    const state=gestureStates[id];
    // Three caches clipAction by clip UUID. A private clone gives each request a
    // distinct action, so an old finished event cannot complete a retrigger.
    // Only existing authored tracks are reused; no procedural motion is added.
    const clip=this.character.clips.find(candidate=>candidate.name===state)!.clone();
    const action=this.mixer.clipAction(clip);
    this.retireGesture();
    this.gesture={id,action,finished:false};
    this.actions.set(state,action);
    this.transition(state,action,true);
    return true;
  }

  cancelGesture():void {
    if(this.disposed||!this.gesture)return;
    this.retireGesture();
    this.transition(this.baseState);
  }

  update(delta:number,input:AnimationInput,now=Date.now()) {
    if(this.disposed||!Number.isFinite(delta)||delta<0)return;
    if(delta>.25) {this.accumulator=0;this.character.vrm.springBoneManager?.reset();resetModularSprings(this.character.vrm);}
    if(input.sitting&&!this.wasSitting){this.seated=false;const a=this.actions.get('StandUp')!;this.sitStart=this.state==='StandUp'?Math.max(0,a.getClip().duration-a.time):0;}
    if(input.sitting&&this.state==='SitDown') {
      const a=this.actions.get('SitDown')!;
      if(a.time>=a.getClip().duration-.03)this.seated=true;
    }
    if(input.sitting)this.standing=false;
    else if(this.wasSitting&&!input.moving&&!input.motion?.airborne){
      const a=this.actions.get('SitDown')!;this.standStart=this.state==='SitDown'?Math.max(0,a.getClip().duration-a.time):0;this.standing=true;
    }
    if(input.moving||input.motion?.airborne)this.standing=false;
    if(this.standing&&this.state==='StandUp'){const a=this.actions.get('StandUp')!;if(a.paused||a.time>=a.getClip().duration-.015)this.standing=false;}
    this.wasSitting=input.sitting;
    const motion=input.motion;
    let next:CharacterState='Idle';
    if(input.sitting)next=this.seated?'Seated':'SitDown';
    else if(motion?.airborne)next=motion.jumpTime<.17?'JumpStart':'JumpLoop';
    else if(motion && now-motion.landedAt<180)next='Land';
    else if(this.standing)next='StandUp';
    else if(input.moving)next=motion?.running?'Run':'Walk';
    this.baseState=next;
    if(safetyStates.has(next))this.cancelGesture();

    // Legacy inputs are requests, not per-frame restarts. Consume blocked edges
    // too: held celebrate / old interaction must not replay after a safety state.
    const celebrate=input.celebrate&&!this.wasCelebrating;
    const interact=input.interactedAt!==this.interactedAt&&now>=input.interactedAt&&now-input.interactedAt<1050;
    this.wasCelebrating=input.celebrate;this.interactedAt=input.interactedAt;
    if(next==='Idle') {
      if(celebrate)this.playGesture('victory');
      else if(interact&&!input.celebrate)this.playGesture('interact');
    }
    if(this.gesture?.finished)this.cancelGesture();
    if(!this.gesture)this.transition(next);

    this.accumulator+=Math.min(characterBudgets.maxDelta,delta);
    for(let steps=0;this.accumulator>=characterBudgets.fixedStep&&steps<characterBudgets.maxSteps;steps++) {
      this.accumulator-=characterBudgets.fixedStep;
      this.mixer.update(characterBudgets.fixedStep);
      if(this.gesture?.finished)this.cancelGesture();
      this.releaseRetiredGestures();
      // One face owner after the mixer, before the existing single VRM update.
      this.expressions.setIdleLife(this.state==='Idle'&&!this.gesture);
      this.expressions.update(characterBudgets.fixedStep);
      this.character.vrm.update(characterBudgets.fixedStep);
      updateModularParts(this.character.vrm,characterBudgets.fixedStep);
    }
  }

  private transition(next:CharacterState,action=this.actions.get(next)!,gesture=false) {
    if(action===this.currentAction&&next===this.state)return;
    this.currentAction.fadeOut(fadeSeconds);
    const once=gesture||['SitDown','StandUp','JumpStart','Land'].includes(next);
    action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(once?LoopOnce:LoopRepeat,once?1:Infinity);
    if(next==='StandUp')action.time=this.standStart;
    if(next==='SitDown')action.time=this.sitStart;
    action.clampWhenFinished=once;action.fadeIn(fadeSeconds).play();
    this.currentAction=action;this.state=next;
  }

  private retireGesture() {
    if(!this.gesture)return;
    this.retiring.set(this.gesture.action,this.mixer.time+fadeSeconds);
    this.gesture=null;
  }

  private releaseRetiredGestures() {
    for(const [action,deadline] of this.retiring) {
      if(this.mixer.time+1e-9<deadline)continue;
      action.stop();this.mixer.uncacheAction(action.getClip());this.retiring.delete(action);
      // Keep diagnostics pointing to the authored source, not a disposed run.
      const name=action.getClip().name;
      if(this.actions.get(name)===action)this.actions.set(name,this.mixer.clipAction(this.character.clips.find(clip=>clip.name===name)!));
    }
  }

  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.mixer.removeEventListener('finished',this.onFinished);
    this.gesture=null;this.retiring.clear();this.accumulator=0;
    this.expressions.dispose();this.mixer.stopAllAction();this.mixer.uncacheRoot(this.character.vrm.scene);
  }
}
