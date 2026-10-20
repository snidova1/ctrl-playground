import {Box3, Mesh, Vector3, Texture, SkinnedMesh, Material, BufferGeometry} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin, VRMUtils, MToonMaterial, type VRM} from '@pixiv/three-vrm';
import {characterBudgets, type CharacterDefinition, type CharacterQuality} from './catalog';
import {retargetHumanoid} from './retarget';
import {createCharacterBinaryCache} from './binary-cache';
import {adaptVrmToLilToon} from './liltoon-adapter';

/** Reject external references before GLTFLoader can perform secondary requests. */
export function validateVrmBuffer(data: ArrayBuffer) {
  if (data.byteLength<28 || data.byteLength>characterBudgets.maxAssetBytes) throw new Error('Character exceeds the file budget.');
  const view=new DataView(data);
  if (view.getUint32(0,true)!==0x46546c67 || view.getUint32(4,true)!==2 || view.getUint32(8,true)!==data.byteLength || view.getUint32(16,true)!==0x4e4f534a) throw new Error('Invalid VRM container.');
  const length=view.getUint32(12,true);
  if (length>data.byteLength-20) throw new Error('Invalid VRM manifest.');
  const json: {extensions?:Record<string,unknown>;buffers?:Array<{uri?:string}>;images?:Array<{uri?:string}>}=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,length)));
  if (!json.extensions?.VRM && !json.extensions?.VRMC_vrm) throw new Error('This file does not contain a VRM humanoid.');
  if ([...(json.buffers??[]),...(json.images??[])].some(item=>item.uri!==undefined)) throw new Error('Character assets must be self-contained.');
}
const binary=createCharacterBinaryCache();
export function disposeVrm(vrm:VRM) {
  const release=vrm.scene.userData.releaseLilToonBindings;if(typeof release==='function')release();
  const textures=new Set<Texture>();
  vrm.scene.traverse(o=>{if(o instanceof SkinnedMesh && o.skeleton.boneTexture)textures.add(o.skeleton.boneTexture);});
  for(const t of textures)t.dispose();
  VRMUtils.deepDispose(vrm.scene);
}
export async function loadCharacter(definition:CharacterDefinition,quality:CharacterQuality,signal?:AbortSignal,materialStyle:'mtoon'|'liltoon'='mtoon') {
  const [data,motionData]=await Promise.all([binary(definition.assets[quality],signal),binary('/plaza/characters/humanoid-motions.glb',signal)]);
  validateVrmBuffer(data);signal?.throwIfAborted();
  const lil=materialStyle==='liltoon'?await import('@mochiya/three-liltoon/vrm'):null;
  signal?.throwIfAborted();
  const loader=new GLTFLoader();loader.register(parser=>{
    const plugin=new VRMLoaderPlugin(parser);
    if(!lil)return plugin;
    // VRM 0 compatibility rewrites material definitions in beforeRoot.
    // Adapt AFTER that migration, but BEFORE any mesh/material dependencies load.
    const beforeRoot=plugin.beforeRoot.bind(plugin);
    plugin.beforeRoot=async()=>{await beforeRoot();adaptVrmToLilToon(parser.json,quality);};
    return lil.enableLilToonVRM(plugin);
  });
  const result=await loader.parseAsync(data,'');
  const vrm:VRM|undefined=result.userData.vrm;
  if (!vrm) throw new Error('Character has no valid humanoid.');
  if(lil)vrm.scene.userData.releaseLilToonBindings=()=>lil.uninstallLilToonExpressionBindings(vrm);
  try {
    signal?.throwIfAborted();
    VRMUtils.removeUnnecessaryVertices(vrm.scene);
    VRMUtils.combineSkeletons(vrm.scene);
    VRMUtils.combineMorphs(vrm);
    VRMUtils.rotateVRM0(vrm);
    if (vrm.lookAt) vrm.lookAt.autoUpdate=false;
    // Cosmetic chest physics never touches the torso/head animation chain.
    // Low profile removes secondary simulation; the skinned hairstyle remains.
    if (vrm.springBoneManager) for (const joint of [...vrm.springBoneManager.joints]) {
      if (quality==='low'||/Bust|Sleeve|Skirt/i.test(joint.bone.name)) vrm.springBoneManager.deleteJoint(joint);
      else {joint.settings.dragForce=Math.max(.8,joint.settings.dragForce);joint.settings.stiffness=Math.max(2,joint.settings.stiffness);}
    }
    const prepared=new Set<Material>();
    vrm.scene.traverse(o=>{
      if(o instanceof Mesh) {
        o.castShadow=true;o.frustumCulled=false;
        const materials=Array.isArray(o.material)?o.material:[o.material];
        if(quality==='low') {
          // Setting width=0 still draws an outline. Omit those draw groups.
          const geometry:BufferGeometry=o.geometry;
          const visibleGroups=geometry.groups.filter(g=>!(materials[g.materialIndex??0] instanceof MToonMaterial && (materials[g.materialIndex??0] as MToonMaterial).isOutline));
          if(geometry.groups.length && !visibleGroups.length)o.visible=false;
          else geometry.groups=visibleGroups;
        }
        for(const material of materials) {
          if(prepared.has(material))continue;prepared.add(material);
          if(material instanceof MToonMaterial) {
            if(quality==='low')material.outlineWidthMode='none';
            // Exposure compensation for the existing bright courtyard lighting.
            material.color.multiplyScalar(.72);material.shadeColorFactor.multiplyScalar(.72);
          }
        }
      }
    });
    vrm.scene.updateMatrixWorld(true);
    const bounds=new Box3().setFromObject(vrm.scene),height=bounds.getSize(new Vector3()).y;
    if (!Number.isFinite(height)||height<.3||height>4) throw new Error('Character scale is invalid.');
    const motion=await new GLTFLoader().parseAsync(motionData,'');
    signal?.throwIfAborted();
    const clips=retargetHumanoid(motion,vrm);
    const scale=definition.height/height;
    const toonMaterialCount=[...prepared].filter(m=>(m as Material&{isLilToonMaterial?:boolean}).isLilToonMaterial).length;
    return {vrm,clips,scale,floor:-bounds.min.y*scale,toonMaterialCount};
  } catch(error) {disposeVrm(vrm);throw error;}
}
export type LoadedCharacter=Awaited<ReturnType<typeof loadCharacter>>;
