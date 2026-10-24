import {readFileSync} from 'node:fs';
import {beforeAll,describe,expect,it,vi} from 'vitest';
import {AnimationClip,AnimationMixer,Euler,Group,Quaternion,Vector3,type KeyframeTrack} from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMExpression,VRMExpressionManager,VRMUtils,type VRM,type VRMHumanBoneName} from '@pixiv/three-vrm';
import {relaxedIdle} from '@/features/plaza/characters/relaxed-idle';
import {retargetHumanoid} from '@/features/plaza/characters/retarget';
import {HumanoidAnimator} from '@/features/plaza/characters/animation';
import {CharacterExpressionController} from '@/features/plaza/characters/expression-controller';
import {characterBudgets,createCharacterMotion} from '@/features/plaza/characters/catalog';
import type {LoadedCharacter} from '@/features/plaza/characters/loader';
import {headlessAuthoredVrm} from './helpers/authored-vrm';

let motions:GLTF;
beforeAll(async()=>{
 const bytes=readFileSync('public/plaza/characters/humanoid-motions.glb');
 motions=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,'');
});
const sample=(track:KeyframeTrack,time:number)=>Array.from((track as KeyframeTrack&{createInterpolant:()=>{evaluate:(t:number)=>ArrayLike<number>}}).createInterpolant().evaluate(time));
const angle=(a:number[],b:number[])=>new Quaternion().fromArray(a).angleTo(new Quaternion().fromArray(b));

describe('living idle on shipped rigs, not just clip names',()=>{
 for(const gender of ['male','female'] as const)it(`${gender}: upper-body variation, periodic seam, original fingers and planted feet`,async()=>{
  const vrm=await headlessAuthoredVrm(gender==='male'?'/plaza/characters/anime/male-mobile.vrm':'/plaza/characters/airi-reference/avatar-sample-a-mobile.vrm');
  try{
   const source=retargetHumanoid(motions,vrm).find(c=>c.name==='Idle')!;
   const before=source.tracks.map(t=>Array.from(t.values));
   const idle=relaxedIdle(source,vrm,gender);
   const track=(bone:VRMHumanBoneName)=>idle.tracks.find(t=>t.name===`${vrm.humanoid.getNormalizedBoneNode(bone)!.name}.quaternion`)!;
   for(const bone of ['chest','head','leftUpperArm','rightUpperArm'] as VRMHumanBoneName[]){
    const t=track(bone),start=sample(t,0);
    const range=Math.max(...Array.from({length:49},(_,i)=>angle(start,sample(t,idle.duration*i/48))));
    expect(range,`${bone} must visibly vary, rather than stay at its static relaxed pose`).toBeGreaterThan(.009);
    expect(range,`${bone} must remain subtle`).toBeLessThan(.12);
   }
   for(const t of idle.tracks){
    const size=t.getValueSize(),first=Array.from(t.values.slice(0,size)),last=Array.from(t.values.slice(-size));
    // Preserve source finger data verbatim, including sub-microradian exporter
    // noise; the newly baked body tracks have bit-exact loop endpoints.
    if(/Thumb|Index|Middle|Ring|Little/.test(t.name))first.forEach((v,i)=>expect(Math.abs(v-last[i])).toBeLessThan(.00001));
    else expect(first).toEqual(last);
    // Matching one-sided velocity as well as endpoint pose prevents a loop hitch.
    const a=sample(t,0),b=sample(t,.01),c=sample(t,idle.duration-.01),d=sample(t,idle.duration);
    for(let i=0;i<size;i++)expect(Math.abs((b[i]-a[i])-(d[i]-c[i]))).toBeLessThan(.00005);
   }
   const fingers=source.tracks.filter(t=>/Thumb|Index|Middle|Ring|Little/.test(t.name));expect(fingers.length).toBeGreaterThan(10);
   for(const finger of fingers){const copy=idle.tracks.find(t=>t.name===finger.name)!;expect(copy).not.toBe(finger);expect(Array.from(copy.values)).toEqual(Array.from(finger.values));expect(Array.from(copy.times)).toEqual(Array.from(finger.times));}
   expect(source.tracks.map(t=>Array.from(t.values))).toEqual(before);
   const left=sample(track('leftUpperLeg'),0),right=sample(track('rightUpperLeg'),0);
   const legacy=vrm.meta.metaVersion==='0'?-1:1;
   const expected=gender==='male'?.125:-.025;
   expect(new Euler().setFromQuaternion(new Quaternion().fromArray(left)).z).toBeCloseTo(expected*legacy,5);
   expect(new Euler().setFromQuaternion(new Quaternion().fromArray(right)).z).toBeCloseTo(-expected*legacy,5);
   expect(new Euler().setFromQuaternion(new Quaternion().fromArray(sample(track('leftFoot'),0))).z).toBeCloseTo(-expected*legacy,5);
   expect(new Euler().setFromQuaternion(new Quaternion().fromArray(sample(track('rightFoot'),0))).z).toBeCloseTo(expected*legacy,5);
   const mixer=new AnimationMixer(vrm.scene);mixer.clipAction(idle).play();
   const at=(bone:VRMHumanBoneName)=>vrm.humanoid.getRawBoneNode(bone)!.getWorldPosition(new Vector3());
   mixer.setTime(0);vrm.update(0);vrm.scene.updateMatrixWorld(true);
   const feet=['leftFoot','rightFoot','leftToes','rightToes'] as const,rest=feet.map(at);
   for(let i=1;i<=48;i++){
    mixer.setTime(idle.duration*i/48);vrm.update(0);vrm.scene.updateMatrixWorld(true);
    feet.forEach((bone,j)=>expect(at(bone).distanceTo(rest[j]),`${bone} must not slide/lift`).toBeLessThan(.000001));
    expect(Math.abs(at('leftFoot').y-at('rightFoot').y)).toBeLessThan(.015);
    expect(at('leftHand').y).toBeLessThan(at('leftUpperArm').y-.2);expect(at('rightHand').y).toBeLessThan(at('rightUpperArm').y-.2);
   }
   mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);
  }finally{VRMUtils.deepDispose(vrm.scene);}
 });

 it('plays distinct authored Walk/Run keyframes and returns Run after a gesture, without replacing locomotion',async()=>{
  const vrm=await headlessAuthoredVrm('/plaza/characters/anime/male-mobile.vrm');
  const clips=retargetHumanoid(motions,vrm).map(c=>c.name==='Idle'?relaxedIdle(c,vrm,'male'):c);
  const run=clips.find(c=>c.name==='Run')!,walk=clips.find(c=>c.name==='Walk')!;
  expect(run.duration).toBeCloseTo(.9333333,5);expect(walk.duration).toBeCloseTo(1.3333333,5);
  const bone=vrm.humanoid.getNormalizedBoneNode('leftUpperLeg')!,runTrack=run.tracks.find(t=>t.name===`${bone.name}.quaternion`)!;
  expect(angle(sample(runTrack,0),sample(runTrack,run.duration/4))).toBeGreaterThan(.1);
  expect(Array.from(runTrack.values)).not.toEqual(Array.from(walk.tracks.find(t=>t.name===runTrack.name)!.values));
  const animator=new HumanoidAnimator({vrm,clips,scale:1,floor:0,toonMaterialCount:0});
  const input={moving:true,sitting:false,celebrate:false,interactedAt:-Infinity,motion:createCharacterMotion()};
  const tick=()=>animator.update(characterBudgets.fixedStep,input,10000);
  tick();expect(animator.state).toBe('Walk');input.motion.running=true;tick();expect(animator.state).toBe('Run');
  for(let i=0;i<20;i++)tick();expect(animator.actions.get('Run')!.getClip()).toBe(run);expect(animator.actions.get('Run')!.getEffectiveWeight()).toBe(1);
  const before=bone.quaternion.clone();tick();expect(before.angleTo(bone.quaternion)).toBeGreaterThan(.001);
  animator.playGesture('interact');for(let i=0;i<150;i++)tick();expect(animator.activeGesture).toBeNull();expect(animator.state).toBe('Run');
  input.moving=false;tick();expect(animator.state).toBe('Idle');animator.dispose();VRMUtils.deepDispose(vrm.scene);
 });
});

function faceFixture(){
 const expressionManager=new VRMExpressionManager();for(const name of ['happy','sad','relaxed','blink','aa','custom'])expressionManager.registerExpression(new VRMExpression(name));
 const lookAt={yaw:0,pitch:0,autoUpdate:false,target:undefined as Group|undefined};
 const vrm={scene:new Group(),expressionManager,lookAt,update:vi.fn(),springBoneManager:{reset:vi.fn()}} as unknown as VRM;
 const value=(name:string)=>expressionManager.getValue(name)??0;
 return {vrm,value,lookAt,expressionManager};
}
function advance(controller:CharacterExpressionController,seconds:number){for(let t=0;t<seconds-1e-9;t+=.01)controller.update(.01);}

describe('single-owner idle face life',()=>{
 it('adds restrained warmth/gaze and natural blinks only while idle, without touching visemes/custom channels',()=>{
  const f=faceFixture();f.expressionManager.setValue('aa',.4);f.expressionManager.setValue('custom',.3);
  const controller=new CharacterExpressionController(f.vrm,{seed:3});controller.setIdleLife(true);
  const warm:number[]=[],yaw:number[]=[],pitch:number[]=[],blink:number[]=[];
  for(let i=0;i<2400;i++){controller.update(.01);warm.push(f.value('happy'));yaw.push(f.lookAt.yaw);pitch.push(f.lookAt.pitch);blink.push(f.value('blink'));}
  expect(Math.max(...warm)).toBeGreaterThan(.015);expect(Math.max(...warm)).toBeLessThan(.09);expect(Math.max(...blink)).toBeGreaterThan(.8);
  expect(Math.max(...yaw)-Math.min(...yaw)).toBeGreaterThan(2);expect(Math.max(...yaw.map(Math.abs))).toBeLessThanOrEqual(4);
  expect(Math.max(...pitch)-Math.min(...pitch)).toBeGreaterThan(.5);expect(Math.max(...pitch.map(Math.abs))).toBeLessThanOrEqual(2);
  expect(f.value('aa')).toBe(.4);expect(f.value('custom')).toBe(.3);
  controller.setIdleLife(false);advance(controller,1);expect(f.value('happy')).toBe(0);expect(Math.abs(f.lookAt.yaw)).toBeLessThan(.01);controller.dispose();
 });
 it('never overrides explicit neutral/sad/gesture warmth and restores the latest baseline',()=>{
  const f=faceFixture(),controller=new CharacterExpressionController(f.vrm,{seed:3});controller.setIdleLife(true);advance(controller,8);
  controller.setExpression('neutral');advance(controller,.5);expect(f.value('happy')).toBe(0);
  controller.setExpression('sad',.6);advance(controller,.5);expect(f.value('sad')).toBe(.6);expect(f.value('happy')).toBe(0);expect(Math.abs(f.lookAt.yaw)).toBeLessThan(.1);
  controller.setExpression('happy',.5);advance(controller,.5);expect(f.value('happy')).toBe(.5);
  f.vrm.scene.userData.ctrlExpression='sad';controller.resetExpression();advance(controller,1);expect(f.value('sad')).toBe(.65);expect(f.value('happy')).toBe(0);controller.dispose();
 });
 it('fades out mid-smile when locomotion starts, rather than popping or leaving warmth stuck',()=>{
  const f=faceFixture(),controller=new CharacterExpressionController(f.vrm,{seed:3});controller.setIdleLife(true);advance(controller,7.5);
  const smile=f.value('happy');expect(smile).toBeGreaterThan(.03);
  controller.setIdleLife(false);controller.update(.01);expect(f.value('happy')).toBeGreaterThan(0);expect(f.value('happy')).toBeLessThan(smile);
  advance(controller,.3);expect(f.value('happy')).toBe(0);controller.dispose();
 });
 it('drives the shipped VRM look-at applier through the existing single VRM update',async()=>{
  const vrm=await headlessAuthoredVrm('/plaza/characters/anime/male-mobile.vrm');
  try{
   expect(vrm.lookAt).toBeDefined();vrm.lookAt!.autoUpdate=false;
   const controller=new CharacterExpressionController(vrm,{seed:3});controller.setIdleLife(true);
   const apply=vi.spyOn(vrm.lookAt!.applier,'applyYawPitch'),update=vi.spyOn(vrm,'update');
   for(let i=0;i<120;i++){controller.update(characterBudgets.fixedStep);vrm.update(characterBudgets.fixedStep);}
   expect(update).toHaveBeenCalledTimes(120);expect(apply).toHaveBeenCalledTimes(120);
   expect(apply.mock.calls.some(([yaw,pitch])=>Math.abs(yaw)>2&&Math.abs(pitch)>.3)).toBe(true);
   controller.dispose();
  }finally{VRMUtils.deepDispose(vrm.scene);}
 });
 it('does not take over an explicit look target, and dispose stops all writes',()=>{
  const f=faceFixture();f.lookAt.target=new Group();f.lookAt.yaw=11;f.lookAt.pitch=4;
  const controller=new CharacterExpressionController(f.vrm,{seed:4});controller.setIdleLife(true);advance(controller,10);
  expect(f.lookAt.yaw).toBe(11);expect(f.lookAt.pitch).toBe(4);controller.dispose();
  const writes=vi.spyOn(f.expressionManager,'setValue');controller.update(3);controller.setIdleLife(true);expect(writes).not.toHaveBeenCalled();
 });
 it('animator enables life only for Idle, while gestures and Run retain ownership',()=>{
  const f=faceFixture();const clips=['Idle','Walk','Run','JumpStart','JumpLoop','Land','SitDown','Seated','Interact','Victory'].map(name=>new AnimationClip(name,1,[]));
  const animator=new HumanoidAnimator({vrm:f.vrm,clips,scale:1,floor:0,toonMaterialCount:0} as LoadedCharacter);
  const input={moving:false,sitting:false,celebrate:false,interactedAt:-Infinity,motion:createCharacterMotion()};
  let warmth=0;for(let i=0;i<720;i++){animator.update(characterBudgets.fixedStep,input,10000);warmth=Math.max(warmth,f.value('happy'));}expect(warmth).toBeGreaterThan(.015);
  input.moving=true;input.motion.running=true;for(let i=0;i<60;i++)animator.update(characterBudgets.fixedStep,input,10000);
  expect(animator.state).toBe('Run');expect(f.value('happy')).toBe(0);expect(Math.abs(f.lookAt.yaw)).toBeLessThan(.01);
  animator.playGesture('victory');animator.expressions.setExpression('happy',.55);for(let i=0;i<20;i++)animator.update(characterBudgets.fixedStep,input,10000);
  expect(f.value('happy')).toBe(.55);animator.dispose();
 });
});
