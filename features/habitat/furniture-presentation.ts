import {Color,Material,MeshStandardMaterial,Object3D} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';

type Renderable=Object3D&{material?:Material|Material[]};
type LitMaterial={material:MeshStandardMaterial;emissive:Color;intensity:number};

/**
 * Creates private per-instance materials while retaining the cached GLTF geometry and textures.
 * This lets interactive lamps glow without recolouring every copy of the same source model.
 */
export function createFurniturePresentation(source:Object3D){
 const scene=clone(source),copies=new Map<Material,Material>(),lit:LitMaterial[]=[];
 const copyMaterial=(original:Material)=>{
  let material=copies.get(original);
  if(!material){
   material=original.clone();copies.set(original,material);
   if(material instanceof MeshStandardMaterial)lit.push({material,emissive:material.emissive.clone(),intensity:material.emissiveIntensity});
  }
  return material;
 };
 scene.traverse(node=>{
  node.castShadow=true;node.receiveShadow=true;
  const renderable=node as Renderable;
  if(renderable.material)renderable.material=Array.isArray(renderable.material)?renderable.material.map(copyMaterial):copyMaterial(renderable.material);
 });
 return {
  scene,
  setLampActive(active:boolean){
   for(const entry of lit){
    entry.material.emissive.copy(active?new Color('#ffc879'):entry.emissive);
    entry.material.emissiveIntensity=active?Math.max(1.35,entry.intensity):entry.intensity;
    entry.material.needsUpdate=true;
   }
  },
  dispose(){copies.forEach(material=>material.dispose());},
 };
}

/** Local-space emitter height aligned to the visible shade, not a generic 1m point. */
export function furnitureLightEmitter(assetId:string,bounds:readonly [number,number,number]):[number,number,number]{
 const ratio=/Floor/i.test(assetId)?.79:/Table/i.test(assetId)?.77:/Ceiling/i.test(assetId)?.28:/Wall/i.test(assetId)?.65:.72;
 return [0,Math.max(.08,bounds[1]*ratio),0];
}

/** Keep real-time point lights deliberately bounded on mobile while all active lamps still glow. */
export function shouldRenderFurnitureLight(activeIndex:number,quality:'low'|'high'){
 return activeIndex>=0&&activeIndex<(quality==='high'?4:2);
}
