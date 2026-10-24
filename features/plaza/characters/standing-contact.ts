import {AnimationMixer,Box3,Mesh,SkinnedMesh,type AnimationClip} from 'three';
import type {VRM} from '@pixiv/three-vrm';

/** Load-time ground calibration from the shipped standing skin, not the export
 * bind pose. Idle has fixed hips/legs/feet; sample its upper-body life too.
 * Scale remains the original body scale. No per-frame mesh scan or asset edits. */
export function authoredStandingFootY(vrm:VRM,clips:AnimationClip[]):number|undefined{
 const clip=clips.find(c=>c.name==='Idle');if(!clip)return undefined;
 const saved=vrm.humanoid.getNormalizedPose(),mixer=new AnimationMixer(vrm.scene),bounds=new Box3(),part=new Box3();
 try{
  mixer.clipAction(clip).play();
  for(const fraction of [0,.25,.5,.75]){
   mixer.setTime(clip.duration*fraction);vrm.update(0);
   vrm.scene.updateWorldMatrix(true,true);vrm.scene.updateMatrixWorld(true);
   vrm.scene.traverse(mesh=>{
    if(!(mesh instanceof Mesh)||!mesh.visible)return;
    if(mesh instanceof SkinnedMesh)mesh.computeBoundingBox();else mesh.geometry.computeBoundingBox();
    const box=mesh instanceof SkinnedMesh?mesh.boundingBox:mesh.geometry.boundingBox;
    if(box)bounds.union(part.copy(box).applyMatrix4(mesh.matrixWorld));
   });
  }
  return Number.isFinite(bounds.min.y)?bounds.min.y:undefined;
 }finally{
  mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);vrm.humanoid.setNormalizedPose(saved);vrm.update(0);vrm.scene.updateMatrixWorld(true);
  // A posed box must not survive as an apparently current cached bind box.
  vrm.scene.traverse(mesh=>{if(mesh instanceof SkinnedMesh)mesh.computeBoundingBox();});
 }
}
