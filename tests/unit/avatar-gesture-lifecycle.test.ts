import {readFileSync} from 'node:fs';
import {beforeAll,describe,expect,it,vi} from 'vitest';
import {Group,LoopOnce,type AnimationAction} from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMExpression,VRMExpressionManager,type VRM} from '@pixiv/three-vrm';
import {HumanoidAnimator,type AnimationInput,type CharacterGesture} from '@/features/plaza/characters/animation';
import {characterBudgets,createCharacterMotion} from '@/features/plaza/characters/catalog';
import {attachNativeModularPart} from '@/features/plaza/characters/modular-runtime';
import type {LoadedCharacter} from '@/features/plaza/characters/loader';

let authored:GLTF;
beforeAll(async()=>{
  const bytes=readFileSync(new URL('../../public/plaza/characters/humanoid-motions.glb',import.meta.url));
  authored=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,'');
});
const step=characterBudgets.fixedStep;
function fixture(){
  const expressionManager=new VRMExpressionManager();
  for(const name of ['happy','sad','blink'])expressionManager.registerExpression(new VRMExpression(name));
  const vrm={scene:authored.scene.clone(true),expressionManager,humanoid:{normalizedHumanBones:{},getNormalizedBoneNode:()=>null},update:vi.fn(),springBoneManager:{reset:vi.fn()}} as unknown as VRM;
  const character={vrm,clips:authored.animations,scale:1,floor:0,toonMaterialCount:0} as LoadedCharacter;
  const animator=new HumanoidAnimator(character);
  const input:AnimationInput={moving:false,sitting:false,celebrate:false,interactedAt:-Infinity,motion:createCharacterMotion()};
  let now=10000;
  const tick=(delta=step)=>{now+=delta*1000;animator.update(delta,input,now);};
  const advance=(seconds:number)=>{for(let left=seconds;left>1e-9;left-=step)tick(Math.min(step,left));};
  const finish=()=>advance(animator.actions.get(animator.state)!.getClip().duration+.25);
  return {animator,input,vrm,tick,advance,finish};
}
function finished(animator:HumanoidAnimator,action:AnimationAction){animator.mixer.dispatchEvent({type:'finished',action,direction:1});}

describe('cancelable authored gesture lifecycle',()=>{
  it.each(['interact','victory'] as CharacterGesture[])('plays %s once with clamping/fades and restores the current locomotion',gesture=>{
    const f=fixture();f.input.moving=true;f.tick();expect(f.animator.state).toBe('Walk');
    expect(f.animator.playGesture(gesture)).toBe(true);
    const action=f.animator.actions.get(gesture==='interact'?'Interact':'Victory')!;
    expect(action.loop).toBe(LoopOnce);expect(action.clampWhenFinished).toBe(true);expect(action.time).toBe(0);
    f.advance(.08);expect(action.getEffectiveWeight()).toBeGreaterThan(0);expect(action.getEffectiveWeight()).toBeLessThan(1);
    f.input.motion!.running=true;f.tick();expect(f.animator.activeGesture).toBe(gesture);
    f.finish();expect(f.animator.activeGesture).toBeNull();expect(f.animator.state).toBe('Run');
    expect(f.animator.actions.get('Run')!.isRunning()).toBe(true);f.animator.dispose();
  });

  it('cancel restores the latest walking/idle input, not the gesture-start snapshot',()=>{
    const f=fixture();f.animator.playGesture('interact');f.input.moving=true;f.tick();
    f.animator.cancelGesture();expect(f.animator.state).toBe('Walk');expect(f.animator.activeGesture).toBeNull();
    f.animator.playGesture('victory');f.input.moving=false;f.tick();f.animator.cancelGesture();
    expect(f.animator.state).toBe('Idle');f.animator.cancelGesture();expect(f.animator.state).toBe('Idle');f.animator.dispose();
  });

  it('sitting interrupts immediately, rejects gestures while seated, and never restarts SitDown',()=>{
    const f=fixture();f.animator.playGesture('victory');const old=f.animator.actions.get('Victory')!;
    f.input.sitting=true;f.tick();expect(f.animator.activeGesture).toBeNull();expect(f.animator.state).toBe('SitDown');
    expect(f.animator.playGesture('interact')).toBe(false);
    finished(f.animator,old);f.tick();expect(f.animator.state).toBe('SitDown');
    f.advance(f.animator.actions.get('SitDown')!.getClip().duration+.1);
    expect(f.animator.state).toBe('Seated');expect(f.animator.playGesture('victory')).toBe(false);
    f.animator.cancelGesture();expect(f.animator.state).toBe('Seated');
    f.input.sitting=false;f.input.moving=true;f.tick();expect(f.animator.state).toBe('Walk');f.animator.dispose();
  });

  it('jump start/loop and landing interrupt or reject gestures without stale restore',()=>{
    const f=fixture();f.animator.playGesture('interact');const old=f.animator.actions.get('Interact')!;
    f.input.motion!.airborne=true;f.tick();expect(f.animator.state).toBe('JumpStart');expect(f.animator.activeGesture).toBeNull();
    expect(f.animator.playGesture('victory')).toBe(false);finished(f.animator,old);
    f.input.motion!.jumpTime=.4;f.tick();expect(f.animator.state).toBe('JumpLoop');expect(f.animator.playGesture('interact')).toBe(false);
    f.input.motion!.airborne=false;f.input.motion!.landedAt=Infinity;f.tick();
    expect(f.animator.state).toBe('Land');expect(f.animator.playGesture('victory')).toBe(false);
    f.input.motion!.landedAt=-Infinity;f.input.moving=true;f.tick();expect(f.animator.state).toBe('Walk');f.animator.dispose();
  });

  it('filters unrelated finished actions and invalidates replaced AND same-clip retrigger completions',()=>{
    const f=fixture();f.animator.playGesture('interact');const first=f.animator.actions.get('Interact')!;
    f.advance(.1);f.animator.playGesture('victory');const second=f.animator.actions.get('Victory')!;
    finished(f.animator,first);finished(f.animator,f.animator.actions.get('Idle')!);f.tick();
    expect(f.animator.activeGesture).toBe('victory');
    f.animator.playGesture('victory');const retrigger=f.animator.actions.get('Victory')!;
    expect(retrigger).not.toBe(second);expect(retrigger.time).toBe(0);
    finished(f.animator,second);f.tick();expect(f.animator.activeGesture).toBe('victory');
    f.input.moving=true;f.finish();expect(f.animator.activeGesture).toBeNull();expect(f.animator.state).toBe('Walk');
    expect(first.isScheduled()).toBe(false);expect(second.isScheduled()).toBe(false);f.animator.dispose();
  });

  it('invalidates an already-pending completion and releases retired private clips after crossfade',()=>{
    const f=fixture();const uncache=vi.spyOn(f.animator.mixer,'uncacheAction');
    f.animator.playGesture('interact');const old=f.animator.actions.get('Interact')!;
    finished(f.animator,old);f.animator.playGesture('victory');f.tick();
    expect(f.animator.activeGesture).toBe('victory');
    for(let i=0;i<12;i++)f.animator.playGesture(i%2?'interact':'victory');
    f.animator.cancelGesture();f.advance(.2);
    expect(uncache).toHaveBeenCalledTimes(14);expect(old.isScheduled()).toBe(false);
    expect(f.animator.activeGesture).toBeNull();expect(f.animator.state).toBe('Idle');f.animator.dispose();
  });

  it('rejects unknown runtime IDs without replacing the current run',()=>{
    const f=fixture();f.animator.playGesture('interact');
    for(const id of ['wave','__proto__','toString',undefined])expect(f.animator.playGesture(id as CharacterGesture)).toBe(false);
    expect(f.animator.activeGesture).toBe('interact');f.animator.dispose();
  });

  it('does not replay held celebrate or an unchanged interaction timestamp after finish/cancel',()=>{
    const f=fixture();f.input.celebrate=true;f.tick();expect(f.animator.activeGesture).toBe('victory');
    f.finish();expect(f.animator.activeGesture).toBeNull();f.advance(.5);expect(f.animator.state).toBe('Idle');
    f.input.celebrate=false;f.tick();f.input.celebrate=true;f.tick();expect(f.animator.activeGesture).toBe('victory');
    f.animator.cancelGesture();f.tick();expect(f.animator.activeGesture).toBeNull();
    f.input.celebrate=false;f.input.interactedAt=20000;f.animator.update(0,f.input,20000);
    expect(f.animator.activeGesture).toBe('interact');f.animator.cancelGesture();f.animator.update(0,f.input,20001);
    expect(f.animator.activeGesture).toBeNull();f.input.interactedAt=20002;f.animator.update(0,f.input,20002);
    expect(f.animator.activeGesture).toBe('interact');f.animator.dispose();
  });

  it('consumes blocked legacy requests rather than queuing a surprise after jump/sit',()=>{
    const f=fixture();f.input.sitting=true;f.input.celebrate=true;f.tick();
    f.input.sitting=false;f.tick();expect(f.animator.state).toBe('StandUp');expect(f.animator.activeGesture).toBeNull();f.finish();expect(f.animator.state).toBe('Idle');expect(f.animator.activeGesture).toBeNull();f.animator.dispose();
  });

  it('removes the finished listener, cancels pending completion, and makes dispose idempotent/inert',()=>{
    const f=fixture();f.animator.playGesture('victory');const action=f.animator.actions.get('Victory')!;
    const remove=vi.spyOn(f.animator.mixer,'removeEventListener');const update=vi.spyOn(f.animator.mixer,'update');
    finished(f.animator,action);f.animator.dispose();f.animator.dispose();
    expect(remove).toHaveBeenCalledTimes(1);expect(remove.mock.calls[0][0]).toBe('finished');
    expect(f.animator.activeGesture).toBeNull();expect(action.isScheduled()).toBe(false);
    expect(f.animator.playGesture('interact')).toBe(false);f.animator.cancelGesture();finished(f.animator,action);f.tick();
    expect(update).not.toHaveBeenCalled();
  });

  it('is fixed-step driven, ignores invalid deltas, bounds stalled frames, and keeps mixer → face → base → parts order',()=>{
    const f=fixture();const donor={scene:new Group(),expressionManager:new VRMExpressionManager(),humanoid:{getNormalizedBoneNode:()=>null},update:vi.fn(),springBoneManager:{reset:vi.fn()}} as unknown as VRM;
    attachNativeModularPart(f.vrm,donor,'drophunter','hair','test');
    const order:string[]=[];const mixerUpdate=f.animator.mixer.update.bind(f.animator.mixer);
    vi.spyOn(f.animator.mixer,'update').mockImplementation(dt=>{order.push('mixer');return mixerUpdate(dt);});
    const faceUpdate=f.animator.expressions.update.bind(f.animator.expressions);
    vi.spyOn(f.animator.expressions,'update').mockImplementation(dt=>{order.push('face');faceUpdate(dt);});
    vi.mocked(f.vrm.update).mockImplementation(()=>order.push('base'));vi.mocked(donor.update).mockImplementation(()=>order.push('parts'));
    f.vrm.scene.userData.ctrlExpression='sad';f.animator.playGesture('victory');const action=f.animator.actions.get('Victory')!;
    for(const dt of [NaN,Infinity,-1])f.animator.update(dt,f.input,10000);
    expect(action.time).toBe(0);f.tick(step/2);expect(action.time).toBe(0);f.tick(step/2);expect(action.time).toBeCloseTo(step);
    expect(order).toEqual(['mixer','face','base','parts']);order.length=0;
    f.tick(2);expect(order).toEqual(Array.from({length:3},()=>['mixer','face','base','parts']).flat());
    expect(f.vrm.springBoneManager!.reset).toHaveBeenCalledOnce();expect(donor.springBoneManager!.reset).toHaveBeenCalledOnce();
    f.advance(.4);expect(f.vrm.expressionManager!.getValue('sad')).toBe(.65);f.animator.cancelGesture();
    expect(f.vrm.scene.userData.ctrlExpression).toBe('sad');expect(f.vrm.expressionManager!.getValue('sad')).toBe(.65);f.animator.dispose();
  });

  it('replays gesture completion deterministically at equivalent fixed-step frame rates',()=>{
    const a=fixture(),b=fixture();a.animator.playGesture('interact');b.animator.playGesture('interact');
    for(let i=0;i<600;i++){
      a.tick(step);b.tick(step/2);b.tick(step/2);
      expect(a.animator.activeGesture).toBe(b.animator.activeGesture);expect(a.animator.state).toBe(b.animator.state);
      expect(a.animator.actions.get(a.animator.state)!.time).toBeCloseTo(b.animator.actions.get(b.animator.state)!.time);
    }
    a.animator.dispose();b.animator.dispose();
  });
});
