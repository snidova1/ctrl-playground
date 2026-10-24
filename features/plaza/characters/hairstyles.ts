import {Box3,Group,Matrix4,Mesh,SkinnedMesh,Vector3,type Object3D,type Texture} from 'three';
import {VRMUtils,type VRM} from '@pixiv/three-vrm';
import type {HairStyleId} from './catalog';

/** Only the two old VRoid HairSample heads have a reviewed fit. The signature
 * female has a different scalp/rig and is deliberately NOT a compatible target. */
export const hairDonors = {
 'vroid-short': {target:'ctrl-anime-female-studio',asset:'male'},
 'vroid-layered': {target:'ctrl-anime-male',asset:'female-studio'},
 'cc0-shino-long': {target:'ctrl-anime-female-studio',asset:'cc0-shino-long',directory:'hairstyles'},
 'cc0-shibu-bob': {target:['ctrl-anime-female-studio','ctrl-anime-male'],asset:'cc0-shibu-bob',directory:'hairstyles'},
} as const;
export function hairDonor(characterId:string,style:HairStyleId='source'){
 if(style==='source'||!Object.hasOwn(hairDonors,style))return null;
 const donor=hairDonors[style as keyof typeof hairDonors];return donor&&(typeof donor.target==='string'?donor.target===characterId:donor.target.some(id=>id===characterId))?donor:null;
}
function materials(mesh:Mesh){return Array.isArray(mesh.material)?mesh.material:[mesh.material];}
export function isAuthoredHair(mesh:Mesh){return materials(mesh).every(m=>/HAIR/i.test(m.name));}
function descendantOf(node:Object3D,ancestor:Object3D):boolean{
 for(let current:Object3D|null=node;current;current=current.parent)if(current===ancestor)return true;
 return false;
}
/** Indexed vertices only: VRoid primitives share POSITION arrays with other
 * primitives. Measuring the full attribute would measure unrelated surfaces. */
export function authoredFaceBounds(vrm:VRM):Box3{
 const head=vrm.humanoid.getRawBoneNode('head');if(!head)throw new Error('Hair fitting requires a raw head bone.');
 vrm.scene.updateMatrixWorld(true);const inverse=head.matrixWorld.clone().invert(),bounds=new Box3(),point=new Vector3();
 vrm.scene.traverse(o=>{
  if(!(o instanceof Mesh)||!materials(o).some(m=>/Face_00_SKIN/i.test(m.name)))return;
  if(o instanceof SkinnedMesh)o.skeleton.update();
  const index=o.geometry.index,count=index?.count??o.geometry.attributes.position.count;
  for(let i=0;i<count;i++)bounds.expandByPoint(o.getVertexPosition(index?index.getX(i):i,point).applyMatrix4(o.matrixWorld).applyMatrix4(inverse));
 });
 if(bounds.isEmpty())throw new Error('Hair fitting requires an authored face surface.');return bounds;
}
interface HairBinding {root:Group;donor:VRM;discarded:Group;hidden:Array<{mesh:Mesh;visible:boolean}>}
const bindings=new WeakMap<VRM,HairBinding>();
export function clearCharacterHair(vrm:VRM){
 const binding=bindings.get(vrm);if(!binding)return;
 binding.root.removeFromParent();for(const {mesh,visible} of binding.hidden)mesh.visible=visible;
 const textures=new Set<Texture>();binding.donor.scene.traverse(o=>{if(o instanceof SkinnedMesh&&o.skeleton.boneTexture)textures.add(o.skeleton.boneTexture);});
 for(const texture of textures)texture.dispose();
 VRMUtils.deepDispose(binding.donor.scene);VRMUtils.deepDispose(binding.discarded);bindings.delete(vrm);
 vrm.scene.userData.ctrlHairStyleId='source';
}
/** Reuses original geometry, UVs, material textures, source skeleton, inverse bind
 * matrices and weights. The donor rig is head-attached, not reweighted onto a
 * differently named target rig. Secondary donor hair motion is intentionally
 * static; it follows the animated target head. No donor body/face is rendered. */
export function attachAuthoredHair(target:VRM,donor:VRM,characterId:string,style:HairStyleId){
 if(!hairDonor(characterId,style))throw new Error('This authored hairstyle is not compatible with this body.');
 clearCharacterHair(target);
 const sourceHead=donor.humanoid.getRawBoneNode('head'),targetHead=target.humanoid.getRawBoneNode('head');
 if(!sourceHead||!targetHead)throw new Error('Hair fitting requires both head bones.');
 const from=authoredFaceBounds(donor),to=authoredFaceBounds(target),sourceSize=from.getSize(new Vector3()),targetSize=to.getSize(new Vector3());
 const scale=targetSize.clone().divide(sourceSize);
 // Fails closed if an asset revision invalidates this narrowly reviewed fit.
 if([scale.x,scale.y,scale.z].some(n=>!Number.isFinite(n)||n<.85||n>1.18))throw new Error('Authored hairstyle head proportions exceed the reviewed fit.');
 const hairs:SkinnedMesh[]=[];
 donor.scene.traverse(o=>{
  if(!(o instanceof Mesh)||!isAuthoredHair(o))return;
  if(!(o instanceof SkinnedMesh))throw new Error('Authored hair must retain its source skin.');
  const index=o.geometry.index,joints=o.geometry.attributes.skinIndex,weights=o.geometry.attributes.skinWeight;
  if(!joints||!weights)throw new Error('Authored hair has no skin weights.');
  for(let i=0;i<(index?.count??joints.count);i++){
   const vertex=index?index.getX(i):i;
   for(let k=0;k<4;k++)if(weights.getComponent(vertex,k)>0&&!descendantOf(o.skeleton.bones[joints.getComponent(vertex,k)],sourceHead))throw new Error('Hair includes non-head influences; this fit is unsafe.');
  }
  hairs.push(o);
 });
 if(!hairs.length)throw new Error('Donor has no isolated authored hair primitives.');
 const sourceInverse=sourceHead.matrixWorld.clone().invert();
 // Align actual face centers and axes in RAW head-local space (VRM0's root
 // rotation is already included in the matrix), not an arbitrary world offset.
 const shift=to.getCenter(new Vector3()).sub(from.getCenter(new Vector3()).multiply(scale));
 const fit=new Matrix4().makeScale(scale.x,scale.y,scale.z);fit.setPosition(shift);
 const root=new Group();root.name='CTRL authored hairstyle';root.userData.ctrlAuthoredHair=true;
 root.matrixAutoUpdate=false;root.matrix.copy(fit).multiply(sourceInverse).multiply(donor.scene.matrix);
 // The donor scene's original root transform is incorporated exactly once.
 donor.scene.matrixAutoUpdate=false;donor.scene.matrix.identity();
 const hidden:HairBinding['hidden']=[];
 target.scene.traverse(o=>{if(o instanceof Mesh&&isAuthoredHair(o)){hidden.push({mesh:o,visible:o.visible});o.visible=false;}});
 const hairSet=new Set<Mesh>(hairs);
 const discarded=new Group(),nonHair:Mesh[]=[];
 donor.scene.traverse(o=>{if(o instanceof Mesh){if(!hairSet.has(o))nonHair.push(o);else{o.castShadow=true;o.frustumCulled=false;}}});
 // Retain resource ownership for disposal, but do not carry hidden donor bodies
 // into the live avatar (bounds/picking must never see a second body).
 for(const mesh of nonHair)discarded.add(mesh);
 // AnimationMixer resolves tracks by node name across the entire scene. Donor
 // normalized bones must never shadow the live target rig (otherwise the body
 // remains in T-pose while its clips accidentally animate the static hair rig).
 donor.scene.traverse(node=>{node.name=`CTRLHairDonor::${node.uuid}`;});
 root.add(donor.scene);targetHead.add(root);target.scene.updateMatrixWorld(true);
 bindings.set(target,{root,donor,discarded,hidden});target.scene.userData.ctrlHairStyleId=style;
 target.scene.userData.ctrlHairFitScale=scale.toArray();target.scene.userData.ctrlHairMeshCount=hairs.length;
 return {root,hairs,scale};
}
