import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils,MToonMaterial,type VRM} from '@pixiv/three-vrm';
import {Mesh} from 'three';
import {createCharacterBinaryCache} from './binary-cache';
import {attachAuthoredHair,hairDonor} from './hairstyles';
import type {CharacterQuality,HairStyleId} from './catalog';
const binary=createCharacterBinaryCache();
/** Fixed local allowlist only; never arbitrary avatar uploads or external assets. */
export async function loadCharacterHair(target:VRM,characterId:string,quality:CharacterQuality,style:HairStyleId='source',signal?:AbortSignal){
 const source=hairDonor(characterId,style);
 target.scene.userData.ctrlHairStyleId='source';
 if(!source)return;
 const directory='directory' in source?source.directory:'anime';
 const path=`/plaza/characters/${directory}/${source.asset}${quality==='low'?'-mobile':''}.vrm`;
 const data=await binary(path,signal);signal?.throwIfAborted();
 const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
 const result=await loader.parseAsync(data,''),donor=result.userData.vrm as VRM|undefined;
 if(!donor)throw new Error('Authored hairstyle source has no valid humanoid.');
 try{
  signal?.throwIfAborted();VRMUtils.removeUnnecessaryVertices(donor.scene);VRMUtils.combineSkeletons(donor.scene);VRMUtils.rotateVRM0(donor);
  if(quality==='low')donor.scene.traverse(o=>{
   if(!(o instanceof Mesh))return;
   const materials=Array.isArray(o.material)?o.material:[o.material];
   const visible=o.geometry.groups.filter((g:{materialIndex?:number})=>!(materials[g.materialIndex??0] instanceof MToonMaterial&&(materials[g.materialIndex??0] as MToonMaterial).isOutline));
   if(o.geometry.groups.length&&!visible.length)o.visible=false;
   else o.geometry.groups=visible;
   for(const material of materials)if(material instanceof MToonMaterial)material.outlineWidthMode='none';
  });
  // Static donor bones intentionally retain the authored rest shape. No second
  // humanoid animation or uncoordinated spring simulation is installed.
  attachAuthoredHair(target,donor,characterId,style);
 }catch(error){VRMUtils.deepDispose(donor.scene);throw error;}
}
