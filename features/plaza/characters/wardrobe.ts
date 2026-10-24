import {BufferGeometry,Group,Material,Matrix4,Mesh,Object3D,Skeleton,SkinnedMesh,Texture,type Bone} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {VRM} from '@pixiv/three-vrm';

/** Geometry choices are independent of existing outfit *colorways*. Only this rig
 * is supported; never silently dress signature female/male in a near-match skin. */
import {wardrobeStyles,type WardrobeStyleId} from './wardrobe-catalog';
export {wardrobeStyles,availableWardrobeStyles,type WardrobeStyleId} from './wardrobe-catalog';
const CLOTH=new Set(['F00_002_01_Tops_01_CLOTH','F00_002_01_Shoes_01_CLOTH']);
const active=new WeakMap<VRM,AppliedWardrobe>();
type GarmentId=Exclude<WardrobeStyleId,'source'>;
export interface LoadedWardrobe {id:GarmentId;scene:Group;disposed:boolean;applied:boolean;dispose:()=>void}
export interface AppliedWardrobe {id:GarmentId;meshes:readonly SkinnedMesh[];dispose:()=>void}

function disposeOwned(root:Object3D){
  const geometries=new Set<BufferGeometry>(),materials=new Set<Material>(),textures=new Set<Texture>(),skeletons=new Set<Skeleton>();
  root.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material]){materials.add(mat);for(const value of Object.values(mat))if(value instanceof Texture)textures.add(value);}}if(o instanceof SkinnedMesh)skeletons.add(o.skeleton);});
  skeletons.forEach(s=>s.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
/** Public seam also allows deterministic CPU tests with real geometry, no DOM. */
export function prepareLoadedWardrobe(scene:Group,id:GarmentId='darkness-studio'):LoadedWardrobe{
  const loaded:LoadedWardrobe={id,scene,disposed:false,applied:false,dispose(){if(loaded.disposed)return;if(loaded.applied)throw new Error('Dispose the applied wardrobe handle instead.');loaded.disposed=true;disposeOwned(scene);scene.removeFromParent();}};
  return loaded;
}
export async function loadWardrobe(signal?:AbortSignal,id:GarmentId='darkness-studio'):Promise<LoadedWardrobe>{
  const style=wardrobeStyles.find(item=>item.id===id&&'url' in item);
  if(!style||!('url' in style))throw new Error('Unknown wardrobe asset.');
  const response=await fetch(style.url,{signal});if(!response.ok)throw new Error(`Wardrobe download failed (${response.status}).`);
  const data=await response.arrayBuffer();signal?.throwIfAborted();
  if(data.byteLength<28||data.byteLength>3*1024*1024)throw new Error('Invalid wardrobe budget.');
  const v=new DataView(data),size=v.getUint32(12,true);
  if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==data.byteLength||v.getUint32(16,true)!==0x4e4f534a||size>data.byteLength-20)throw new Error('Invalid wardrobe GLB.');
  const doc=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,size)));
  if(doc.extras?.ctrlWardrobe?.id!==id||doc.extras.ctrlWardrobe.supportedCharacterId!==style.characterId||!doc.extras.ctrlWardrobe.targetRestBound||[...(doc.buffers??[]),...(doc.images??[])].some((r:{uri?:string})=>r.uri!==undefined))throw new Error('Unreviewed wardrobe asset.');
  const gltf=await new GLTFLoader().parseAsync(data,'');const loaded=prepareLoadedWardrobe(gltf.scene,id);
  try{signal?.throwIfAborted();return loaded;}catch(error){loaded.dispose();throw error;}
}
export function clearCharacterWardrobe(vrm:VRM){active.get(vrm)?.dispose();}

/** Transfers weighted vertices to ACTUAL target bones. Call after target skeleton
 * optimization/VRM0 rotation; no pose reset and no animation-controller ownership.
 * Existing inverse binds, not current animated matrices, supply target rest space.
 * On validation failure the original outfit is untouched. Owns loaded on success. */
export function applyWardrobe(vrm:VRM,characterId:string,loaded:LoadedWardrobe):AppliedWardrobe{
  const style=wardrobeStyles.find(item=>item.id===loaded.id&&'characterId' in item);
  if(!style||!('characterId' in style)||characterId!==style.characterId)throw new Error('Wardrobe unsupported for this character; keep source outfit.');

  if(loaded.disposed||loaded.applied)throw new Error('Wardrobe asset already consumed.');
  const targets=new Map<string,{bone:Bone;inverse:Matrix4}>();
  const clothing:Array<{mesh:Mesh;geometry:BufferGeometry;visible:boolean;replacement?:BufferGeometry}>=[];
  vrm.scene.traverse(o=>{
    if(o instanceof SkinnedMesh&&!o.userData.ctrlWardrobe)for(let i=0;i<o.skeleton.bones.length;i++){
      const bone=o.skeleton.bones[i];targets.set(bone.name,{bone,inverse:o.skeleton.boneInverses[i]});
    }
    if(!(o instanceof Mesh)||o.userData.ctrlWardrobe)return;
    const materials=Array.isArray(o.material)?o.material:[o.material],isCloth=materials.map(m=>CLOTH.has(m.name));
    if(!isCloth.some(Boolean))return;
    // Never hide a whole mixed body mesh. Preserve original groups/geometry for
    // source fallback; only exact reviewed cloth material groups are omitted.
    if(!isCloth.every(Boolean)&&!o.geometry.groups.length)throw new Error('Cannot safely isolate source cloth primitives.');
    clothing.push({mesh:o,geometry:o.geometry,visible:o.visible});
  });
  const meshes:SkinnedMesh[]=[];loaded.scene.traverse(o=>{if(o instanceof SkinnedMesh)meshes.push(o);});
  if(!meshes.length||!clothing.length)throw new Error('Missing garment skin or source cloth.');
  const bindings=meshes.map(mesh=>{
    const refs=mesh.skeleton.bones.map(b=>targets.get(b.name));
    if(refs.some(b=>!b))throw new Error('Target is missing reviewed garment bones.');
    // Bone names plus per-bone rest binds gate accidental wrong-body callers.
    for(let i=0;i<refs.length;i++)if(refs[i]!.inverse.elements.some((n,j)=>Math.abs(n-mesh.skeleton.boneInverses[i].elements[j])>1e-4))throw new Error('Target rest skeleton is not female-studio.');
    return new Skeleton(refs.map(b=>b!.bone),refs.map(b=>b!.inverse.clone()));
  });
  clearCharacterWardrobe(vrm);
  // Capture original state AFTER the previous handle restored its cloth.
  for(const item of clothing){item.geometry=item.mesh.geometry;item.visible=item.mesh.visible;}
  const root=new Group();root.name=`CTRL_Wardrobe_${loaded.id}`;root.userData.ctrlWardrobe=true;
  const donorSkeletons=new Set(meshes.map(m=>m.skeleton));
  meshes.forEach((mesh,i)=>{mesh.removeFromParent();mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);mesh.bind(bindings[i],new Matrix4());mesh.userData.ctrlWardrobe=true;mesh.frustumCulled=false;mesh.castShadow=true;root.add(mesh);});
  donorSkeletons.forEach(s=>s.dispose());
  for(const item of clothing){
    const materials=Array.isArray(item.mesh.material)?item.mesh.material:[item.mesh.material];
    if(materials.every(m=>CLOTH.has(m.name)))item.mesh.visible=false;
    else{const clone=item.geometry.clone();clone.groups=clone.groups.filter(g=>!CLOTH.has(materials[g.materialIndex??0].name));item.replacement=clone;item.mesh.geometry=clone;}
  }
  vrm.scene.add(root);vrm.scene.updateMatrixWorld(true);loaded.applied=true;
  let disposed=false;
  const handle:AppliedWardrobe={id:loaded.id,meshes,dispose(){
    if(disposed)return;disposed=true;
    for(const item of clothing){item.mesh.visible=item.visible;item.mesh.geometry=item.geometry;item.replacement?.dispose();}
    root.removeFromParent();disposeOwned(root);root.clear();loaded.disposed=true;loaded.applied=false;
    if(active.get(vrm)===handle)active.delete(vrm);
  }};
  active.set(vrm,handle);return handle;
}
/** Safe source/unsupported fallback without downloading the donor at all.
 * Download/rebind failure also leaves previous/source outfit intact. */
export async function loadCharacterWardrobe(vrm:VRM,characterId:string,id:string='source',signal?:AbortSignal){
  if(id==='source'){clearCharacterWardrobe(vrm);return {status:'source' as const};}
  const style=wardrobeStyles.find(item=>item.id===id&&'characterId' in item);
  if(!style||!('characterId' in style)||characterId!==style.characterId){clearCharacterWardrobe(vrm);return {status:'unsupported' as const};}
  const loaded=await loadWardrobe(signal,style.id as GarmentId);
  try{signal?.throwIfAborted();const handle=applyWardrobe(vrm,characterId,loaded);return {status:'applied' as const,handle};}
  catch(error){if(!loaded.applied)loaded.dispose();throw error;}
}
