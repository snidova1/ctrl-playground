import {AnimationClip,Euler,Quaternion,QuaternionKeyframeTrack,VectorKeyframeTrack} from 'three';
import type {VRM,VRMHumanBoneName} from '@pixiv/three-vrm';

/** Periodic upper-body offsets only: pelvis/legs/feet never move in Idle.
 * Integer harmonics share a 12s period, with three quiet breaths per loop.
 * Bake into the existing clip so there is still exactly one bone writer. */
function life(bone:string,phase:number):[number,number,number]{
 const breath=Math.sin(phase*3),settle=Math.sin(phase),slow=Math.sin(phase*2);
 switch(bone){
  case 'spine':return [.004*breath,.003*settle,0];
  case 'chest':return [.012*breath,.003*settle,.002*slow];
  case 'upperChest':return [.004*breath,0,0];
  case 'neck':return [.003*slow,.006*settle,0];
  case 'head':return [.008*slow,.028*settle,.004*slow];
  case 'leftShoulder':return [.003*breath,0,.004*breath];
  case 'rightShoulder':return [.003*breath,0,-.004*breath];
  case 'leftUpperArm':return [.008*breath+.006*settle,.003*slow,.006*settle];
  case 'rightUpperArm':return [.008*breath-.006*settle,-.003*slow,-.006*settle];
  case 'leftLowerArm':return [.004*slow,0,.005*breath];
  case 'rightLowerArm':return [-.004*slow,0,-.005*breath];
  case 'leftHand':return [.003*slow,0,.003*settle];
  case 'rightHand':return [-.003*slow,0,-.003*settle];
  default:return [0,0,0];
 }
}

/** Authored relaxed idle in normalized humanoid space. Only Idle is replaced;
 * source locomotion/gesture clips and the single mixer keep owning animation. */
export function relaxedIdle(source:AnimationClip,vrm:VRM,gender:'female'|'male'='female'):AnimationClip{
 const duration=12,times=Array.from({length:49},(_,i)=>i*.25);
 const tracks=source.tracks.filter(t=>/Thumb|Index|Middle|Ring|Little/.test(t.name)).map(t=>t.clone());
 const pose:Partial<Record<VRMHumanBoneName,[number,number,number]>>={hips:[0,0,0],spine:[0,0,0],chest:[.008,0,0],upperChest:[0,0,0],neck:[0,0,0],head:[0,0,0],leftShoulder:[0,0,0],rightShoulder:[0,0,0],leftUpperArm:[.05,0,-1.34],rightUpperArm:[.05,0,1.34],leftLowerArm:[0,0,-.12],rightLowerArm:[0,0,.12],leftHand:[0,0,.035],rightHand:[0,0,-.035],leftUpperLeg:[0,0,-.025],rightUpperLeg:[0,0,.025],leftLowerLeg:[0,0,0],rightLowerLeg:[0,0,0],leftFoot:[0,-.035,.025],rightFoot:[0,.035,-.025],leftToes:[0,0,0],rightToes:[0,0,0]};
 // Keep the reviewed wider neutral male stance and opposing foot compensation.
 if(gender==='male')Object.assign(pose,{leftUpperArm:[.015,0,-1.28],rightUpperArm:[.015,0,1.28],leftLowerArm:[0,0,-.08],rightLowerArm:[0,0,.08],leftHand:[0,0,0],rightHand:[0,0,0],leftUpperLeg:[0,0,.125],rightUpperLeg:[0,0,-.125],leftFoot:[0,-.045,-.125],rightFoot:[0,.045,.125]});
 for(const [bone,angles]of Object.entries(pose)){
  const node=vrm.humanoid.getNormalizedBoneNode(bone as VRMHumanBoneName);if(!node)continue;
  const values:number[]=[];
  for(const t of times){
   // Use phase zero at both ends, including bit-exact quaternion endpoints.
   const offset=life(bone,t===duration?0:t/duration*Math.PI*2);
   const q=new Quaternion().setFromEuler(new Euler(angles[0]+offset[0],angles[1]+offset[1],angles[2]+offset[2],'XYZ'));
   if(vrm.meta?.metaVersion==='0'){q.x=-q.x;q.z=-q.z;}
   q.toArray(values,values.length);
  }
  tracks.push(new QuaternionKeyframeTrack(`${node.name}.quaternion`,times,values));
 }
 const hips=vrm.humanoid.getNormalizedBoneNode('hips'),rest=vrm.humanoid.normalizedRestPose.hips?.position;
 if(hips&&rest)tracks.push(new VectorKeyframeTrack(`${hips.name}.position`,times,times.flatMap(()=>[...rest])));
 return new AnimationClip('Idle',duration,tracks);
}
