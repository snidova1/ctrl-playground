import {Material,Mesh,MeshStandardMaterial,type Object3D} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {attachTownWind} from './town-assets';

/** Diffuse stylized room assets: preserve source colors/maps, not accidental
 * exporter-wide metalness=1. Explicit metal/glass materials retain their finish. */
export function habitatMaterial(source:Material,wind=false){
 const material=source.clone();
 if(material instanceof MeshStandardMaterial&&!/metal|steel|chrome|glass/i.test(material.name)){
  material.metalness=0;material.roughness=Math.max(.75,material.roughness);
  if(wind&&/grass|leaf|green|flower|petal/i.test(material.name))attachTownWind(material);
 }
 return material;
}
/** Geometry/textures are shared read-only; only owned material copies dispose. */
export function cloneHabitatAsset(scene:Object3D,wind=false){
 const object=clone(scene),materials=new Map<Material,Material>();
 const own=(source:Material)=>{let material=materials.get(source);if(!material){material=habitatMaterial(source,wind);materials.set(source,material);}return material;};
 object.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);}});
 return {object,dispose:()=>materials.forEach(material=>material.dispose())};
}
