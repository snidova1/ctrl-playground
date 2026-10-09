import {AnimationClip, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack} from 'three';
import type {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {VRM, VRMHumanBoneName} from '@pixiv/three-vrm';

const boneMap: Record<string, VRMHumanBoneName> = {
  pelvis:'hips',spine_01:'spine',spine_02:'chest',spine_03:'upperChest',neck_01:'neck',Head:'head',
  clavicle_l:'leftShoulder',upperarm_l:'leftUpperArm',lowerarm_l:'leftLowerArm',hand_l:'leftHand',
  clavicle_r:'rightShoulder',upperarm_r:'rightUpperArm',lowerarm_r:'rightLowerArm',hand_r:'rightHand',
  thigh_l:'leftUpperLeg',calf_l:'leftLowerLeg',foot_l:'leftFoot',ball_l:'leftToes',
  thigh_r:'rightUpperLeg',calf_r:'rightLowerLeg',foot_r:'rightFoot',ball_r:'rightToes',
};
for (const side of ['left','right'] as const) {
  const suffix=side==='left'?'l':'r';
  for (const [source,target] of [['index','Index'],['middle','Middle'],['ring','Ring'],['pinky','Little'],['thumb','Thumb']] as const) {
    for (const [i,part] of ['Proximal','Intermediate','Distal'].entries()) {
      const name=target==='Thumb' ? ['Metacarpal','Proximal','Distal'][i] : part;
      boneMap[`${source}_0${i+1}_${suffix}`]=`${side}${target}${name}` as VRMHumanBoneName;
    }
  }
}

/** Based on pixiv's rest-space retargeting example. Never mutate cached source tracks. */
export function retargetHumanoid(source: GLTF, vrm: VRM): AnimationClip[] {
  source.scene.updateMatrixWorld(true);
  const hip=source.scene.getObjectByName('pelvis');
  if (!hip) throw new Error('Animation skeleton is missing hips.');
  const restHip=hip.getWorldPosition(new Vector3());
  const targetHip=vrm.humanoid.normalizedRestPose.hips?.position?.[1];
  if (!targetHip || restHip.y <= 0) throw new Error('Invalid humanoid rest height.');
  const ratio=targetHip/restHip.y, legacy=vrm.meta?.metaVersion==='0';
  return source.animations.map(clip=>{
    const tracks: Array<QuaternionKeyframeTrack|VectorKeyframeTrack> = [];
    for (const track of clip.tracks) {
      const dot=track.name.lastIndexOf('.'), name=track.name.slice(0,dot), property=track.name.slice(dot+1);
      const human=boneMap[name]; if (!human) continue;
      const target=vrm.humanoid.getNormalizedBoneNode(human), bone=source.scene.getObjectByName(name);
      if (!target || !bone) continue;
      if (property==='quaternion') {
        const inverse=bone.getWorldQuaternion(new Quaternion()).invert();
        const parent=bone.parent?.getWorldQuaternion(new Quaternion())??new Quaternion();
        const values=new Float32Array(track.values.length), q=new Quaternion(), previous=new Quaternion();
        for (let i=0;i<values.length;i+=4) {
          q.fromArray(track.values,i).premultiply(parent).multiply(inverse).normalize();
          if (legacy) {q.x=-q.x;q.z=-q.z;}
          if (i>0 && q.dot(previous)<0) q.set(-q.x,-q.y,-q.z,-q.w);
          q.toArray(values,i);previous.copy(q);
        }
        tracks.push(new QuaternionKeyframeTrack(`${target.name}.quaternion`,track.times.slice(),values));
      } else if (property==='position' && human==='hips') {
        const values=new Float32Array(track.values.length), v=new Vector3();
        for (let i=0;i<values.length;i+=3) {
          v.fromArray(track.values,i);
          if (bone.parent) v.applyMatrix4(bone.parent.matrixWorld);
          // The controller alone moves the avatar through the courtyard.
          // Seated clips retain the authored pelvis offset within the avatar.
          const seated=clip.name==='SitDown'||clip.name==='Seated';
          values[i]=seated?(v.x-restHip.x)*ratio*(legacy?-1:1):0;
          values[i+1]=targetHip+(v.y-restHip.y)*ratio;
          values[i+2]=seated?(v.z-restHip.z)*ratio*(legacy?-1:1):0;
          // Jump trajectory belongs to the existing movement controller too.
          if (clip.name.startsWith('Jump')) values[i+1]=targetHip;
        }
        tracks.push(new VectorKeyframeTrack(`${target.name}.position`,track.times.slice(),values));
      }
    }
    return new AnimationClip(clip.name,clip.duration,tracks);
  });
}
