import {AnimationMixer,Vector3,type AnimationClip} from 'three';
import type {VRM} from '@pixiv/three-vrm';
import {sampleSeatedSupport} from './seat-contact';

/** Measure the actual posed skin once at load, before any live animator owns it.
 * The result is in model units (before avatar scale/floor), not a guessed hip height.
 * It lets SitDown approach the same support as Seated instead of sinking first.
 */
export function authoredSeatedSupportY(vrm:VRM,clips:AnimationClip[]):number|undefined{
 const clip=clips.find(c=>c.name==='Seated'),hips=vrm.humanoid.getRawBoneNode('hips');if(!clip||!hips)return undefined;
 const saved=vrm.humanoid.getNormalizedPose(),mixer=new AnimationMixer(vrm.scene);
 try{
  mixer.clipAction(clip).play();mixer.setTime(clip.duration*.48);vrm.update(0);
  const sample=sampleSeatedSupport(vrm.scene,hips,['leftUpperLeg','rightUpperLeg'].map(b=>vrm.humanoid.getRawBoneNode(b as 'leftUpperLeg'|'rightUpperLeg')),['leftLowerLeg','rightLowerLeg'].map(b=>vrm.humanoid.getRawBoneNode(b as 'leftLowerLeg'|'rightLowerLeg')));
  if(!sample)return undefined;
  const y=hips.getWorldPosition(new Vector3()).y-sample.hipToContactY;return Number.isFinite(y)?y:undefined;
 }finally{mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);vrm.humanoid.setNormalizedPose(saved);vrm.update(0);}
}
