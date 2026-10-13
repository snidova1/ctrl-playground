import {AnimationClip,AnimationMixer,Euler,Quaternion,QuaternionKeyframeTrack, LoopOnce, LoopRepeat, type AnimationAction} from 'three';
import type {LoadedCharacter} from './loader';
import {characterBudgets, type CharacterMotion} from './catalog';
export type CharacterState='Idle'|'Walk'|'Run'|'JumpStart'|'JumpLoop'|'Land'|'SitDown'|'Seated'|'Interact'|'Victory'|'HighFive'|'Working';
export interface SocialAnimation {kind:'high-five'|'dance';acceptedAt:number;expiresAt:number}
export interface AnimationInput {moving:boolean;sitting:boolean;celebrate:boolean;interactedAt:number;motion?:CharacterMotion;socialAction?:SocialAnimation;workUntil?:number;}
function highFiveClip(character:LoadedCharacter){
 const tracks=[];
 for(const [name,poses] of [
  ['rightUpperArm',[[0,0,1.05],[-.8,.15,.35],[-1.15,.15,.15],[-1.15,.15,.15],[0,0,1.05]]],
  ['rightLowerArm',[[0,0,0],[-.9,0,0],[-1.1,0,0],[-1.1,0,0],[0,0,0]]],
  ['leftUpperArm',[[0,0,-1.05],[0,0,-1.05],[0,0,-1.05],[0,0,-1.05],[0,0,-1.05]]],
 ] as const){
  const bone=character.vrm.humanoid.getNormalizedBoneNode(name);if(!bone)continue;
  const values=poses.flatMap(p=>new Quaternion().setFromEuler(new Euler(...p)).toArray());
  tracks.push(new QuaternionKeyframeTrack(`${bone.name}.quaternion`,[0,.65,1.15,2.05,3.05],values));
 }
 return new AnimationClip('HighFive',3.1,tracks);
}
/** One mixer writes normalized bones; VRM updates raw bones afterwards. */
export class HumanoidAnimator {
  readonly mixer:AnimationMixer;
  readonly actions:Map<string,AnimationAction>;
  state:CharacterState='Idle';
  private accumulator=0;
  private elapsed=0;
  private started=false;
  private seated=false;
  private wasSitting=false;
  constructor(readonly character:LoadedCharacter) {
    this.mixer=new AnimationMixer(character.vrm.scene);
    this.actions=new Map(character.clips.map(c=>[c.name,this.mixer.clipAction(c)]));
    this.actions.set('HighFive',this.mixer.clipAction(highFiveClip(character)));
    const work=character.clips.find(clip=>clip.name==='Interact')?.clone();
    if(work){work.name='Working';this.actions.set('Working',this.mixer.clipAction(work));}
    for(const name of ['Idle','Walk','Run','JumpStart','JumpLoop','Land','SitDown','Seated','Interact','Victory']) if(!this.actions.has(name))throw new Error(`Missing animation: ${name}`);
    this.actions.get('Idle')!.play();this.mixer.update(0);character.vrm.update(0);this.started=true;
  }
  update(delta:number,input:AnimationInput,now=Date.now()) {
    if(!Number.isFinite(delta)||delta<0)return;
    if(delta>.25) {this.accumulator=0;this.character.vrm.springBoneManager?.reset();}
    if(input.sitting&&!this.wasSitting)this.seated=false;
    if(input.sitting&&this.state==='SitDown') {
      const a=this.actions.get('SitDown')!;
      if(a.time>=a.getClip().duration-.03)this.seated=true;
    }
    this.wasSitting=input.sitting;
    const motion=input.motion;
    let next:CharacterState='Idle';
    const social=input.socialAction;
    const coordinated=social&&social.acceptedAt>0&&now>=social.acceptedAt&&now<social.expiresAt;
    if(coordinated)next=social.kind==='dance'?'Victory':'HighFive';
    else if(input.sitting)next=this.seated?'Seated':'SitDown';
    else if(motion?.airborne)next=motion.jumpTime<.17?'JumpStart':'JumpLoop';
    else if(motion && now-motion.landedAt<180)next='Land';
    else if(input.moving)next=motion?.running?'Run':'Walk';
    else if(input.workUntil&&input.workUntil>now)next='Working';
    else if(input.celebrate)next='Victory';
    else if(now-input.interactedAt<1050)next='Interact';
    if(!this.started||next!==this.state) {
      this.actions.get(this.state)?.fadeOut(.16);
      const action=this.actions.get(next)!;
      const once=['SitDown','JumpStart','Land','Interact'].includes(next);
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(once?LoopOnce:LoopRepeat,once?1:Infinity);
      action.clampWhenFinished=once;action.fadeIn(.16).play();this.state=next;this.started=true;
    }
    this.accumulator+=Math.min(characterBudgets.maxDelta,delta);
    if(coordinated){const action=this.actions.get(next)!;action.time=((now-social.acceptedAt)/1000)%action.getClip().duration;}
    for(let steps=0;this.accumulator>=characterBudgets.fixedStep&&steps<characterBudgets.maxSteps;steps++) {
      this.accumulator-=characterBudgets.fixedStep;this.elapsed+=characterBudgets.fixedStep;
      this.mixer.update(characterBudgets.fixedStep);
      // Small deterministic blink, no competing bone/eye rotations.
      const phase=this.elapsed%4.6,blink=phase<.16?Math.sin(phase/.16*Math.PI):0;
      this.character.vrm.expressionManager?.setValue('blink',blink);
      this.character.vrm.update(characterBudgets.fixedStep);
    }
  }
  dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.character.vrm.scene);}
}
