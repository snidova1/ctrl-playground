import {SkinnedMesh,Vector3,type Object3D} from 'three';
import type {VRM} from '@pixiv/three-vrm';

/** Vertical clearance between the actual skinned palm/fingers and thigh skin.
 * This is a load/test-time probe, never a per-frame vertex scan. */
export function seatedHandClearance(vrm:VRM,side:'left'|'right'){
 const hand=vrm.humanoid.getRawBoneNode(`${side}Hand`);if(!hand)return undefined;
 const handBones=new Set<Object3D>();hand.traverse(b=>handBones.add(b));
 const legs=new Set([vrm.humanoid.getRawBoneNode('leftUpperLeg'),vrm.humanoid.getRawBoneNode('rightUpperLeg')]);
 vrm.scene.updateWorldMatrix(true,true);vrm.scene.updateMatrixWorld(true);
 const palms:Vector3[]=[],triangles:Vector3[][]=[],components=['getX','getY','getZ','getW'] as const;
 vrm.scene.traverse(mesh=>{
  if(!(mesh instanceof SkinnedMesh)||!mesh.visible)return;
  const skin=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');if(!skin||!weights)return;
  mesh.skeleton.update();const legVertices=new Map<number,Vector3>();
  for(let i=0;i<skin.count;i++){
   let palm=0,leg=0;for(const c of components){const bone=mesh.skeleton.bones[skin[c](i)],w=weights[c](i);if(handBones.has(bone))palm+=w;if(legs.has(bone))leg+=w;}
   if(palm<.5&&leg<.5)continue;
   const p=mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld);
   if(palm>=.5)palms.push(p);if(leg>=.5)legVertices.set(i,p);
  }
  const index=mesh.geometry.index,count=index?.count??skin.count;
  for(let i=0;i<count;i+=3){const points=[0,1,2].map(j=>legVertices.get(index?index.getX(i+j):i+j));if(points.every((p):p is Vector3=>!!p))triangles.push(points);}
 });
 let clearance=Infinity,samples=0;
 for(const p of palms){
  let top=-Infinity;
  for(const [a,b,c] of triangles){
   if(p.x<Math.min(a.x,b.x,c.x)||p.x>Math.max(a.x,b.x,c.x)||p.z<Math.min(a.z,b.z,c.z)||p.z>Math.max(a.z,b.z,c.z))continue;
   const denominator=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(denominator)<1e-12)continue;
   const u=((b.z-c.z)*(p.x-c.x)+(c.x-b.x)*(p.z-c.z))/denominator,v=((c.z-a.z)*(p.x-c.x)+(a.x-c.x)*(p.z-c.z))/denominator,w=1-u-v;
   if(u>=-1e-6&&v>=-1e-6&&w>=-1e-6)top=Math.max(top,u*a.y+v*b.y+w*c.y);
  }
  if(Number.isFinite(top)){clearance=Math.min(clearance,p.y-top);samples++;}
 }
 return samples?{clearance,samples,handVertices:palms.length,thighTriangles:triangles.length}:undefined;
}
