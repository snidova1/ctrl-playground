import {AnimationClip,AnimationMixer,LoopOnce,Quaternion,QuaternionKeyframeTrack,Vector3,type Object3D} from 'three';
import type {VRM} from '@pixiv/three-vrm';
import {seatedHandClearance} from './seated-hand-contact';

/** Small analytic arm solve. Preserve the authored elbow bend plane and hand
 * world orientation; change the reach, never translate a detached hand bone. */
function liftHand(vrm:VRM,side:'left'|'right',lift:number){
 const upper=vrm.humanoid.getNormalizedBoneNode(`${side}UpperArm`),lower=vrm.humanoid.getNormalizedBoneNode(`${side}LowerArm`),hand=vrm.humanoid.getNormalizedBoneNode(`${side}Hand`);
 if(!upper||!lower||!hand||lift<=0)return;
 vrm.scene.updateWorldMatrix(true,true);
 const shoulder=upper.getWorldPosition(new Vector3()),elbow=lower.getWorldPosition(new Vector3()),wrist=hand.getWorldPosition(new Vector3()),orientation=hand.getWorldQuaternion(new Quaternion());
 const target=wrist.clone().add(new Vector3(0,lift,0)),a=shoulder.distanceTo(elbow),b=elbow.distanceTo(wrist),direction=target.clone().sub(shoulder),distance=Math.max(Math.abs(a-b)+1e-5,Math.min(a+b-1e-5,direction.length()));
 if(a<1e-6||b<1e-6)return;
 direction.normalize();const pole=elbow.clone().sub(shoulder);pole.addScaledVector(direction,-pole.dot(direction));if(pole.lengthSq()<1e-10)return;pole.normalize();
 const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along)),desiredElbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,height),reachable=shoulder.clone().addScaledVector(direction,distance);
 const rotate=(bone:Object3D,from:Vector3,to:Vector3)=>{const delta=new Quaternion().setFromUnitVectors(from.normalize(),to.normalize()),world=bone.getWorldQuaternion(new Quaternion()).premultiply(delta),parent=bone.parent?.getWorldQuaternion(new Quaternion())??new Quaternion();bone.quaternion.copy(parent.invert().multiply(world));bone.updateWorldMatrix(false,true);};
 rotate(upper,elbow.clone().sub(shoulder),desiredElbow.sub(shoulder));
 const movedElbow=lower.getWorldPosition(new Vector3()),movedWrist=hand.getWorldPosition(new Vector3());rotate(lower,movedWrist.sub(movedElbow),reachable.sub(movedElbow));
 const parent=hand.parent?.getWorldQuaternion(new Quaternion())??new Quaternion();hand.quaternion.copy(parent.invert().multiply(orientation));
}

/** Bake body-proportion-aware arm clearance into copied existing clips at load.
 * Skin probing/IK are not run in the gameplay frame loop. No hips/legs/fingers,
 * original assets, or shared cached source tracks are modified. */
export function fitSeatedHands(clips:AnimationClip[],vrm:VRM):AnimationClip[]{
 const seated=clips.find(c=>c.name==='Seated');if(!seated)return clips;
 const saved=vrm.humanoid.getNormalizedPose(),mixer=new AnimationMixer(vrm.scene),lifts={left:0,right:0};
 try{
  const action=mixer.clipAction(seated).play();
  const thigh=vrm.humanoid.getRawBoneNode('leftUpperLeg'),knee=vrm.humanoid.getRawBoneNode('leftLowerLeg');
  for(const fraction of [.18,.48,.84]){
   mixer.setTime(seated.duration*fraction);vrm.update(0);
   const margin=thigh&&knee?thigh.getWorldPosition(new Vector3()).distanceTo(knee.getWorldPosition(new Vector3()))*.025:.008;
   for(const side of ['left','right'] as const){const contact=seatedHandClearance(vrm,side);if(contact)lifts[side]=Math.max(lifts[side],margin-contact.clearance);}
  }
  action.stop();
  if(lifts.left===0&&lifts.right===0)return clips;
  return clips.map(clip=>{
   if(clip.name!=='Seated'&&clip.name!=='SitDown')return clip;
   const bones=(['leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand'] as const).map(name=>({name,node:vrm.humanoid.getNormalizedBoneNode(name)})).filter((entry):entry is {name:typeof entry.name;node:Object3D}=>!!entry.node);
   const times=Array.from(new Set([0,clip.duration,...clip.tracks.filter(track=>bones.some(b=>track.name===`${b.node.name}.quaternion`)).flatMap(track=>Array.from(track.times))])).sort((a,b)=>a-b),values=bones.map(()=>[] as number[]),sample=mixer.clipAction(clip).play();
   sample.setLoop(LoopOnce,1);sample.clampWhenFinished=true;
   for(const time of times){
    mixer.setTime(time);vrm.update(0);
    const progress=clip.name==='Seated'?1:time/clip.duration,strength=progress*progress*(3-2*progress);
    for(const side of ['left','right'] as const)liftHand(vrm,side,lifts[side]*strength);
    bones.forEach((bone,i)=>{const q=bone.node.quaternion.clone(),previous=values[i].slice(-4);if(previous.length&&q.dot(new Quaternion().fromArray(previous))<0)q.set(-q.x,-q.y,-q.z,-q.w);q.toArray(values[i],values[i].length);});
   }
   sample.stop();
   const retained=clip.tracks.filter(track=>!bones.some(b=>track.name===`${b.node.name}.quaternion`)).map(track=>track.clone());
   return new AnimationClip(clip.name,clip.duration,[...retained,...bones.map((bone,i)=>new QuaternionKeyframeTrack(`${bone.node.name}.quaternion`,times,values[i]))]);
  });
 }finally{mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);vrm.humanoid.setNormalizedPose(saved);vrm.update(0);}
}
