import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {Box3,Group,Mesh,SkinnedMesh,AnimationMixer,LoopOnce,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {headlessAuthoredVrm} from './helpers/authored-vrm';
import {retargetHumanoid} from '../../features/plaza/characters/retarget';
import {HumanoidAnimator, type AnimationInput} from '../../features/plaza/characters/animation';
import {authoredSeatedSupportY} from '../../features/plaza/characters/seated-support';
import {sampleSeatedSupport} from '../../features/plaza/characters/seat-contact';
import {relaxedIdle} from '../../features/plaza/characters/relaxed-idle';
import {fitSeatedHands} from '../../features/plaza/characters/seated-arms';
import {authoredStandingFootY} from '../../features/plaza/characters/standing-contact';
import {alignSitDownStandingPose} from '../../features/plaza/characters/seated-transition';
import {createHouseCameraResolver} from '../../features/habitat/house-camera';
import {createHabitatTestSnapshot} from '../../features/habitat/test-snapshot';

async function rig(){
 const vrm=await headlessAuthoredVrm('/plaza/characters/airi-reference/avatar-sample-a-mobile.vrm');
 const bytes=readFileSync('public/plaza/characters/humanoid-motions.glb');
 const source=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 return {vrm,clips:retargetHumanoid(source,vrm)};
}
function posedBox(scene:Group){
 scene.updateWorldMatrix(true,true);const box=new Box3(),part=new Box3();
 scene.traverse(node=>{if(!(node instanceof Mesh)||!node.visible)return;if(node instanceof SkinnedMesh)node.computeBoundingBox();else node.geometry.computeBoundingBox();const b=node instanceof SkinnedMesh?node.boundingBox:node.geometry.boundingBox;if(b)box.union(part.copy(b).applyMatrix4(node.matrixWorld));});return box;
}

describe('continuous home enter/sit/stand/exit',()=>{
 it('grounds the actual relaxed standing skin instead of the bind-pose box',async()=>{
  const {vrm,clips}=await rig(),standing=clips.map(c=>c.name==='Idle'?relaxedIdle(c,vrm):c);
  const before=JSON.stringify(vrm.humanoid.getNormalizedPose()),initial=new Box3().setFromObject(vrm.scene),scale=1.7/initial.getSize(new Vector3()).y;
  const fitted=fitSeatedHands(alignSitDownStandingPose(standing),vrm);authoredSeatedSupportY(vrm,fitted);
  const footY=authoredStandingFootY(vrm,fitted)!;expect(Number.isFinite(footY)).toBe(true);
  expect(JSON.stringify(vrm.humanoid.getNormalizedPose())).toBe(before);
  const root=new Group();root.scale.setScalar(scale);root.position.y=-footY*scale;root.add(vrm.scene);
  const mixer=new AnimationMixer(vrm.scene);mixer.clipAction(standing.find(c=>c.name==='Idle')!).play();
  for(const t of [0,.25,3,6,9,11.9]){mixer.setTime(t);vrm.update(0);root.updateMatrixWorld(true);const min=posedBox(vrm.scene).min.y;expect(min,`standing sole at ${t}`).toBeGreaterThanOrEqual(-.002);expect(min).toBeLessThan(.003);}
  mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);
  const animator=new HumanoidAnimator({vrm,clips:fitted,scale,floor:-footY*scale,toonMaterialCount:0});
  for(let i=0;i<250;i++){
   animator.update(1/60,{moving:false,sitting:i<110,celebrate:false,interactedAt:-Infinity},i*1000/60);
   root.updateMatrixWorld(true);
   if(i>110&&animator.state==='Idle')expect(posedBox(vrm.scene).min.y,`sole during standing blend frame ${i}`).toBeGreaterThanOrEqual(-.002);
  }
  animator.dispose();
 });
 it('matches the standing endpoint without touching the shared clips or seated endpoint',async()=>{
  const {vrm,clips}=await rig(),standing=clips.map(c=>c.name==='Idle'?relaxedIdle(c,vrm):c),before=JSON.stringify(standing.map(c=>c.toJSON()));
  const aligned=alignSitDownStandingPose(standing),sit=aligned.find(c=>c.name==='SitDown')!,source=standing.find(c=>c.name==='SitDown')!,idle=standing.find(c=>c.name==='Idle')!;
  expect(JSON.stringify(standing.map(c=>c.toJSON()))).toBe(before);expect(sit.duration).toBe(source.duration);
  for(const track of sit.tracks){const original=source.tracks.find(t=>t.name===track.name)!;expect(Array.from(track.values.slice(-track.getValueSize()))).toEqual(Array.from(original.values.slice(-original.getValueSize())));const neutral=idle.tracks.find(t=>t.name===track.name);if(neutral&&['vector','quaternion'].includes(track.ValueTypeName))expect(Array.from(track.values.slice(0,track.getValueSize()))).toEqual(Array.from(neutral.values.slice(0,track.getValueSize())));}
 });
 it('plays the authored sitting motion backwards before idle without changing shared source tracks',async()=>{
  const {vrm,clips}=await rig(),before=JSON.stringify(clips.map(c=>c.toJSON()));
  const a=new HumanoidAnimator({vrm,clips,scale:1,floor:0,toonMaterialCount:0});
  const input:AnimationInput={moving:false,sitting:true,celebrate:false,interactedAt:-Infinity};
  const tick=(n:number)=>{for(let i=0;i<n;i++)a.update(1/60,input,10000+i*1000/60);};
  tick(110);expect(a.state).toBe('Seated');input.sitting=false;tick(1);
  expect(a.state).toBe('StandUp');expect(a.playGesture('interact')).toBe(false);expect(a.seatProgress).toBeLessThan(.1);
  tick(30);expect(a.state).toBe('StandUp');expect(a.seatProgress).toBeGreaterThan(.1);
  tick(110);expect(a.state).toBe('Idle');expect(JSON.stringify(clips.map(c=>c.toJSON()))).toBe(before);a.dispose();
 });
 it('reverses partial sit/stand intentions at the current pose and still allows immediate walk cancellation',async()=>{
  const {vrm,clips}=await rig(),a=new HumanoidAnimator({vrm,clips,scale:1,floor:0,toonMaterialCount:0});
  const input:AnimationInput={moving:false,sitting:true,celebrate:false,interactedAt:-Infinity};
  const tick=(n:number)=>{for(let i=0;i<n;i++)a.update(1/60,input,10000+i*1000/60);};
  tick(35);expect(a.state).toBe('SitDown');input.sitting=false;tick(1);expect(a.state).toBe('StandUp');
  tick(8);const before=vrm.humanoid.getRawBoneNode('hips')!.getWorldPosition(new Vector3()).y;
  input.sitting=true;tick(1);expect(a.state).toBe('SitDown');expect(a.actions.get('SitDown')!.time).toBeGreaterThan(.2);
  const after=vrm.humanoid.getRawBoneNode('hips')!.getWorldPosition(new Vector3()).y;expect(Math.abs(after-before)).toBeLessThan(.04);
  input.sitting=false;input.moving=true;tick(1);expect(a.state).toBe('Walk');a.dispose();
 });
 it('measures posed skin before use, restores the rig and keeps sit transitions above the floor',async()=>{
  const {vrm,clips}=await rig(),before=JSON.stringify(vrm.humanoid.getNormalizedPose());
  const supportY=authoredSeatedSupportY(vrm,clips);expect(Number.isFinite(supportY)).toBe(true);expect(JSON.stringify(vrm.humanoid.getNormalizedPose())).toBe(before);
  const initial=new Box3().setFromObject(vrm.scene),scale=1.7/initial.getSize(new Vector3()).y,floor=-initial.min.y*scale;
  const root=new Group(),scaled=new Group();scaled.scale.setScalar(scale);scaled.position.y=floor;root.add(scaled);scaled.add(vrm.scene);
  const surface=.528,seatRoot=surface-floor-supportY!*scale,mixer=new AnimationMixer(vrm.scene),clip=clips.find(c=>c.name==='SitDown')!;
  const action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
  for(const t of [0,.1,.25,.5,.75,.9,1]){
   mixer.setTime(clip.duration*t);vrm.update(0);root.position.y=seatRoot*t*t*(3-2*t);
   expect(posedBox(vrm.scene).min.y,`posed skin at SitDown ${t}`).toBeGreaterThan(-.015);
  }
  mixer.stopAllAction();mixer.clipAction(clips.find(c=>c.name==='Seated')!).play();mixer.setTime(clips.find(c=>c.name==='Seated')!.duration*.48);vrm.update(0);root.position.y=seatRoot;root.updateWorldMatrix(true,true);
  const hips=vrm.humanoid.getRawBoneNode('hips')!,sample=sampleSeatedSupport(vrm.scene,hips,['leftUpperLeg','rightUpperLeg'].map(b=>vrm.humanoid.getRawBoneNode(b as 'leftUpperLeg'|'rightUpperLeg')),['leftLowerLeg','rightLowerLeg'].map(b=>vrm.humanoid.getRawBoneNode(b as 'leftLowerLeg'|'rightLowerLeg')))!;
  expect(hips.getWorldPosition(new Vector3()).y-sample.hipToContactY).toBeCloseTo(surface,4);mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);
 });
 it('uses available room depth for comfortable body framing while keeping structural boundaries',()=>{
  const s=createHabitatTestSnapshot(),target={x:0,y:1.25,z:-2.2};
  const next=createHouseCameraResolver(s.objects,{})(target,{x:0,y:3.4,z:5.6});
  expect(Math.hypot(next.x-target.x,next.y-target.y,next.z-target.z)).toBeGreaterThan(2.8);expect(next.y).toBeLessThan(2.35);
 });
});
