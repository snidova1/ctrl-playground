import {Mesh, SkinnedMesh, type Object3D, type Texture} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MToonMaterial, VRMLoaderPlugin, VRMUtils, type VRM, type VRMHumanBoneName} from '@pixiv/three-vrm';
import type {CharacterQuality} from './catalog';
import {createCharacterBinaryCache} from './binary-cache';
import {modularLayers,modularPart, type ModularAppearance, type ModularSlot as CatalogModularSlot} from './modular-catalog';

export const modularSlots=['eyes','hair','top','bottom','shoes'] as const;
export type ModularSlot=Exclude<CatalogModularSlot,'body'>;
interface NativePart {
  slot:ModularSlot;
  id:string;
  vrm:VRM;
  bones:Array<{source:Object3D;target:Object3D}>;
  expressions:Array<{source:string;target:string}>;
}
export interface ModularRuntime {
  family:ModularAppearance['family'];
  parts:NativePart[];
}
const runtimes=new WeakMap<VRM,ModularRuntime>();
const binary=createCharacterBinaryCache();

export function getModularRuntime(base:VRM):ModularRuntime|undefined {return runtimes.get(base);}

/** A part owns its original scene, rig, materials, metadata and spring manager.
 * Only node names change: otherwise duplicate Normalized_* names can steal mixer bindings.
 * Humanoid/expression objects keep their original node references (never reconstructed).
 */
export function attachNativeModularPart(base:VRM,donor:VRM,family:ModularAppearance['family'],slot:ModularSlot,id:string):void {
  let runtime=runtimes.get(base);
  if(runtime&&runtime.family!==family)throw new Error('Modular parts must use the native body family.');
  if(!runtime){runtime={family,parts:[]};runtimes.set(base,runtime);}
  if(runtime.parts.some(part=>part.slot===slot))throw new Error(`Duplicate modular slot: ${slot}`);
  const prefix=`ctrl_modular_${family}_${slot}_${donor.scene.uuid}_`;
  let index=0;
  donor.scene.traverse(node=>{
    node.userData.ctrlModularOriginalName=node.name;
    node.name=`${prefix}${index++}`;
  });
  const bones:NativePart['bones']=[];
  for(const name of Object.keys(base.humanoid.normalizedHumanBones) as VRMHumanBoneName[]){
    const source=base.humanoid.getNormalizedBoneNode(name),target=donor.humanoid.getNormalizedBoneNode(name);
    if(source&&target)bones.push({source,target});
  }
  const sourceExpressions=new Map(base.expressionManager?.expressions.map(expression=>[expression.expressionName.toLowerCase(),expression.expressionName]));
  const expressions:NativePart['expressions']=[];
  for(const expression of donor.expressionManager?.expressions??[]){
    const source=sourceExpressions.get(expression.expressionName.toLowerCase());
    if(source)expressions.push({source,target:expression.expressionName});
  }
  base.scene.add(donor.scene);
  runtime.parts.push({slot,id,vrm:donor,bones,expressions});
  base.scene.userData.ctrlAvatarModularFamily=family;
  base.scene.userData.ctrlAvatarModularParts=runtime.parts.map(part=>`${part.slot}/${part.id}`);
}

/** Called only by the shared fixed-step animator, after the base mixer/face owner.
 * No timers, extra mixers, cross-rig fitting, mesh extraction or material recoloring.
 */
export function updateModularParts(base:VRM,delta:number):void {
  for(const part of runtimes.get(base)?.parts??[]){
    for(const {source,target} of part.bones){target.quaternion.copy(source.quaternion);target.position.copy(source.position);}
    for(const expression of part.expressions){
      part.vrm.expressionManager!.setValue(expression.target,base.expressionManager!.getValue(expression.source)??0);
    }
    part.vrm.update(delta);
  }
}
export function resetModularSprings(base:VRM):void {
  for(const part of runtimes.get(base)?.parts??[])part.vrm.springBoneManager?.reset();
}
function disposeNativePart(vrm:VRM):void {
  const textures=new Set<Texture>();
  vrm.scene.traverse(node=>{if(node instanceof SkinnedMesh&&node.skeleton.boneTexture)textures.add(node.skeleton.boneTexture);});
  for(const texture of textures)texture.dispose();
  VRMUtils.deepDispose(vrm.scene);
}
/** Detach before base deepDispose: no donor resource is disposed twice. */
export function clearModularParts(base:VRM):void {
  const runtime=runtimes.get(base);if(!runtime)return;
  runtimes.delete(base);
  delete base.scene.userData.ctrlAvatarModularFamily;delete base.scene.userData.ctrlAvatarModularParts;
  for(const part of runtime.parts){part.vrm.scene.removeFromParent();disposeNativePart(part.vrm);}
  runtime.parts.length=0;
}
function prepareNativePart(vrm:VRM,quality:CharacterQuality):void {
  VRMUtils.removeUnnecessaryVertices(vrm.scene);VRMUtils.combineSkeletons(vrm.scene);VRMUtils.combineMorphs(vrm);VRMUtils.rotateVRM0(vrm);
  if(vrm.lookAt)vrm.lookAt.autoUpdate=false;
  if(vrm.springBoneManager)for(const joint of [...vrm.springBoneManager.joints]){
    if(quality==='low'||/Bust|Sleeve|Skirt/i.test(joint.bone.name))vrm.springBoneManager.deleteJoint(joint);
    else {joint.settings.dragForce=Math.max(.8,joint.settings.dragForce);joint.settings.stiffness=Math.max(2,joint.settings.stiffness);}
  }
  vrm.scene.traverse(node=>{
    if(!(node instanceof Mesh))return;
    node.castShadow=true;node.frustumCulled=false;
    for(const material of Array.isArray(node.material)?node.material:[node.material]){material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;}
    if(quality!=='low')return;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    const visibleGroups=node.geometry.groups.filter((group:{materialIndex?:number})=>!(materials[group.materialIndex??0] instanceof MToonMaterial&&(materials[group.materialIndex??0] as MToonMaterial).isOutline));
    if(node.geometry.groups.length&&!visibleGroups.length)node.visible=false;
    else node.geometry.groups=visibleGroups;
    for(const material of materials)if(material instanceof MToonMaterial)material.outlineWidthMode='none';
  });
}

/** Approved same-origin catalog URLs only. Sequential parse bounds peak memory, and
 * ownership transfers only AFTER cancellation checks. In-flight parsed VRMs are
 * disposed even if an abort occurs during GLTFLoader.parseAsync (not abortable).
 */
export async function loadModularParts(base:VRM,characterId:string,selection:ModularAppearance,quality:CharacterQuality,validateBuffer:(data:ArrayBuffer)=>void,signal?:AbortSignal):Promise<void> {
  signal?.throwIfAborted();
  if(characterId!==`ctrl-modular-${selection.family}`)throw new Error('Modular parts must use the native body family.');
  const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
  try{
    for(const {slot,id} of modularLayers(selection)){
      const url=modularPart(selection.family,slot,id,quality);
      if(!url.startsWith(`/plaza/characters/modular/${selection.family}/`))throw new Error('Modular source is not approved.');
      const data=await binary(url,signal);validateBuffer(data);signal?.throwIfAborted();
      const parsed=await loader.parseAsync(data,''),donor=parsed.userData.vrm as VRM|undefined;
      if(!donor){VRMUtils.deepDispose(parsed.scene);throw new Error('Modular source has no valid humanoid.');}
      let attached=false;
      try{
        signal?.throwIfAborted();prepareNativePart(donor,quality);signal?.throwIfAborted();
        attachNativeModularPart(base,donor,selection.family,slot,id);attached=true;
      }finally{if(!attached)disposeNativePart(donor);}
    }
  }catch(error){clearModularParts(base);throw error;}
}
