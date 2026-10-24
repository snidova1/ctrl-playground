import {SkinnedMesh,Vector3,type Object3D} from 'three';

/** Measure the posed proximal pelvis/thigh support, not the pelvis joint center.
 * Skin weights exclude hair/props; a thigh-length-relative joint neighborhood
 * excludes knees, hanging skirt hems and lower legs. World-space measurements
 * include the actual VRM's normalization, scale, animation and floor transform.
 * Call after animation; cache per seated pose, never scan all vertices forever. */
export function sampleSeatedSupport(model:Object3D,hips:Object3D,upperLegs:readonly (Object3D|null)[],lowerLegs:readonly (Object3D|null)[]){
 model.updateWorldMatrix(true,true);
 // SkinnedMesh updates its attached bind inverse in updateMatrixWorld, not
 // Object3D.updateWorldMatrix. Refresh that override before CPU skinning.
 model.updateMatrixWorld(true);
 const hip=hips.getWorldPosition(new Vector3()),point=new Vector3();
 const legs=upperLegs.flatMap((bone,i)=>{const lower=lowerLegs[i];if(!bone||!lower)return [];const center=bone.getWorldPosition(new Vector3()),length=center.distanceTo(lower.getWorldPosition(new Vector3()));return length>0?[{center,length}]:[];});
 if(!legs.length)return undefined;
 const supportBones=new Set([hips,...upperLegs.filter((bone):bone is Object3D=>!!bone)]),components=['getX','getY','getZ','getW'] as const;
 let contactY=Infinity,vertices=0;
 model.traverse(mesh=>{
  if(!(mesh instanceof SkinnedMesh)||!mesh.visible)return;
  const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');if(!indices||!weights)return;
  const accepted=mesh.skeleton.bones.map(bone=>supportBones.has(bone));mesh.skeleton.update();
  for(let i=0;i<indices.count;i++){
   let weight=0;for(const component of components)if(accepted[indices[component](i)])weight+=weights[component](i);if(weight<.6)continue;
   mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
   if(!legs.some(leg=>point.distanceToSquared(leg.center)<=Math.pow(leg.length*.45,2)))continue;
   if(point.y>hip.y||!Number.isFinite(point.y))continue;
   contactY=Math.min(contactY,point.y);vertices++;
  }
 });
 return vertices>0?{contactY,hipToContactY:hip.y-contactY,vertices}:undefined;
}
