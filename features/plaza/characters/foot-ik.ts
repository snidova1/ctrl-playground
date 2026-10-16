/** Adapted analytic solver from norio/vrm-game-starter (MIT), commit
 * b14c236fd8150855348ad085b7820c298eac4b30, src/character/FootIK.ts.
 * Copyright (c) 2026 norio; (c) 2025 Erdong Chen.
 * Full required notice: docs/licenses/vrm-game-starter-MIT.txt.
 * CTRL integration uses the shared deterministic ground, not Ecctrl/BVH or a
 * second controller. It restores the animation baseline before EVERY frame,
 * including frames where the existing fixed-step mixer does not advance. */
import {MathUtils,Matrix4,Object3D,Quaternion,Vector3} from 'three';
import type {VRM} from '@pixiv/three-vrm';

export type GroundHeight=(x:number,z:number)=>number;
const UP=new Vector3(0,1,0),hip=new Vector3(),knee=new Vector3(),ankle=new Vector3(),toTarget=new Vector3(),kneeToHip=new Vector3(),kneeToAnkle=new Vector3(),bend=new Vector3(),currentDir=new Vector3(),targetDir=new Vector3(),deltaQuat=new Quaternion(),parentQuat=new Quaternion(),localDelta=new Quaternion(),footWorld=new Quaternion(),world=new Vector3(),parentInverse=new Matrix4();
const EPS=1e-4;
function rotateWorld(bone:Object3D,delta:Quaternion){
 if(!bone.parent)return;
 bone.parent.getWorldQuaternion(parentQuat);
 localDelta.copy(parentQuat).invert().multiply(delta).multiply(parentQuat);
 bone.quaternion.premultiply(localDelta);bone.updateWorldMatrix(false,true);
}
/** Preserves segment lengths, knee bend plane and animated ankle orientation. */
export function solveTwoBoneIK(upper:Object3D,lower:Object3D,foot:Object3D,target:Vector3,fallback:Vector3){
 hip.setFromMatrixPosition(upper.matrixWorld);knee.setFromMatrixPosition(lower.matrixWorld);ankle.setFromMatrixPosition(foot.matrixWorld);
 const a=hip.distanceTo(knee),b=knee.distanceTo(ankle);toTarget.subVectors(target,hip);
 if(a<EPS||b<EPS||toTarget.lengthSq()<EPS*EPS)return false;
 foot.getWorldQuaternion(footWorld);
 const distance=MathUtils.clamp(toTarget.length(),Math.abs(a-b)+EPS,a+b-EPS);
 const desired=Math.acos(MathUtils.clamp((a*a+b*b-distance*distance)/(2*a*b),-1,1));
 kneeToHip.subVectors(hip,knee);kneeToAnkle.subVectors(ankle,knee);
 const previous=kneeToHip.angleTo(kneeToAnkle);bend.crossVectors(kneeToAnkle,kneeToHip);
 if(bend.lengthSq()<1e-10)bend.copy(fallback);bend.normalize();
 if(Math.abs(previous-desired)>1e-6){deltaQuat.setFromAxisAngle(bend,previous-desired);rotateWorld(lower,deltaQuat);ankle.setFromMatrixPosition(foot.matrixWorld);}
 currentDir.subVectors(ankle,hip).normalize();targetDir.copy(toTarget).normalize();deltaQuat.setFromUnitVectors(currentDir,targetDir);rotateWorld(upper,deltaQuat);
 if(foot.parent){foot.parent.getWorldQuaternion(parentQuat);foot.quaternion.copy(parentQuat).invert().multiply(footWorld);foot.updateWorldMatrix(false,true);}
 return true;
}
type SavedBone={bone:Object3D;position:Vector3;quaternion:Quaternion};
type Leg={upper:Object3D;lower:Object3D;foot:Object3D;animated:Vector3;normal:Vector3;offset:number};
export class CharacterFootIK {
 private readonly hips:Object3D|null;
 private readonly legs:Leg[]=[];
 private readonly saved:SavedBone[]=[];
 private readonly rootPosition=new Vector3();
 private readonly fallback=new Vector3(1,0,0);
 private readonly target=new Vector3();
 private readonly normalTarget=new Vector3();
 private readonly rootRotation=new Quaternion();
 private weight=0;
 private restFootHeight=0;
 constructor(private readonly vrm:Pick<VRM,'humanoid'|'nodeConstraintManager'>,private readonly root:Object3D){
  this.hips=vrm.humanoid.getRawBoneNode('hips');
  for(const side of ['left','right'] as const){
   const upper=vrm.humanoid.getRawBoneNode(`${side}UpperLeg`),lower=vrm.humanoid.getRawBoneNode(`${side}LowerLeg`),foot=vrm.humanoid.getRawBoneNode(`${side}Foot`);
   if(upper&&lower&&foot)this.legs.push({upper,lower,foot,animated:new Vector3(),normal:UP.clone(),offset:0});
  }
  for(const bone of [...(this.hips?[this.hips]:[]),...this.legs.flatMap(l=>[l.upper,l.lower,l.foot])])this.saved.push({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone()});
  root.updateWorldMatrix(true,true);root.getWorldPosition(this.rootPosition);
  for(const l of this.legs)this.restFootHeight+=l.foot.getWorldPosition(this.target).y-this.rootPosition.y;
  if(this.legs.length)this.restFootHeight/=this.legs.length;
 }
 restore(){for(const s of this.saved){s.bone.position.copy(s.position);s.bone.quaternion.copy(s.quaternion);}}
 apply(delta:number,ground:GroundHeight,active:boolean){
  // Capture the raw animated pose AFTER mixer + vrm.update and BEFORE solving.
  for(const s of this.saved){s.position.copy(s.bone.position);s.quaternion.copy(s.bone.quaternion);}
  if(!this.hips||this.legs.length!==2||!Number.isFinite(delta)||delta<0)return;
  if(!active){this.weight=0;for(const l of this.legs){l.offset=0;l.normal.copy(UP);}return;}
  const dt=Math.min(delta,.1);this.weight=MathUtils.damp(this.weight,1,8,dt);
  this.root.updateWorldMatrix(true,true);this.root.getWorldPosition(this.rootPosition);this.root.getWorldQuaternion(this.rootRotation);this.fallback.set(1,0,0).applyQuaternion(this.rootRotation);
  const rootY=ground(this.rootPosition.x,this.rootPosition.z);
  for(const l of this.legs){
   l.foot.getWorldPosition(l.animated);
   const x=l.animated.x,z=l.animated.z,e=.04;
   const offset=ground(x,z)-rootY;
   this.normalTarget.set((ground(x-e,z)-ground(x+e,z))/(e*2),1,(ground(x,z-e)-ground(x,z+e))/(e*2)).normalize();
   const conformable=Number.isFinite(offset)&&Math.abs(offset)<=.35&&this.normalTarget.angleTo(UP)<.85;
   l.offset=MathUtils.damp(l.offset,conformable?offset:0,14,dt);
   if(!conformable)this.normalTarget.copy(UP);
   l.normal.lerp(this.normalTarget,1-Math.exp(-12*dt)).normalize();
  }
  const pelvis=Math.min(0,...this.legs.map(l=>l.offset))*this.weight;
  if(Math.abs(pelvis)>EPS&&this.hips.parent){
   this.hips.getWorldPosition(world);world.y+=pelvis;parentInverse.copy(this.hips.parent.matrixWorld).invert();this.hips.position.copy(world.applyMatrix4(parentInverse));this.hips.updateWorldMatrix(false,true);
  }
  for(const l of this.legs){
   this.target.copy(l.animated);this.target.y+=l.offset*this.weight;
   l.foot.getWorldPosition(ankle);
   if(ankle.distanceToSquared(this.target)>EPS*EPS)solveTwoBoneIK(l.upper,l.lower,l.foot,this.target,this.fallback);
   const lift=l.animated.y-this.rootPosition.y-this.restFootHeight,planted=1-MathUtils.smoothstep(lift,.04,.16);
   const angle=Math.min(l.normal.angleTo(UP),.5)*this.weight*planted;
   bend.crossVectors(UP,l.normal);if(angle>1e-3&&bend.lengthSq()>1e-10){deltaQuat.setFromAxisAngle(bend.normalize(),angle);rotateWorld(l.foot,deltaQuat);}
  }
  this.vrm.nodeConstraintManager?.update();
 }
}
