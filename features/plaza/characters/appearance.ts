import {Color, Mesh, MeshBasicMaterial, type ColorRepresentation} from 'three';
import {MToonMaterial, type VRM} from '@pixiv/three-vrm';
import {applyCharacterAccessories,applyCharacterExpression} from './accessories';
import {getModularRuntime} from './modular-runtime';
import {eyeVariants,hairVariants,outfitVariants,skinVariants,type CharacterAppearance,type OutfitVariantId} from './catalog';

const materialBase=new WeakMap<MToonMaterial|MeshBasicMaterial,{color:Color;shade?:Color}>();

/** Apply once to each freshly loaded VRM. Does not recolor skin/hair or mutate shared assets. */
export function applyCharacterColorway(vrm: VRM, variantId: OutfitVariantId): void {
  applyCharacterAppearance(vrm,{version:1,gender:'female',variantId,hairId:'source',eyeId:'source',skinId:'source'});
}

/** Apply the persisted, allowlisted appearance to one freshly loaded VRM instance. */
export function applyCharacterAppearance(vrm:VRM,appearance:CharacterAppearance):void{
  applyCharacterAccessories(vrm,appearance);
  applyCharacterExpression(vrm,appearance);
  const outfit=outfitVariants.find(item=>item.id===appearance.variantId)??outfitVariants[0];
  const hair=hairVariants.find(item=>item.id===appearance.hairId)??hairVariants[0];
  const eye=eyeVariants.find(item=>item.id===appearance.eyeId)??eyeVariants[0];
  const skin=skinVariants.find(item=>item.id===appearance.skinId)??skinVariants[0];
  const visited = new Set<MToonMaterial|MeshBasicMaterial>();
  const native=getModularRuntime(vrm),roles=new Map<object,string>();
  for(const part of native?.parts??[])part.vrm.scene.traverse(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])roles.set(material,part.slot);});
  vrm.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof MToonMaterial)&&!(material instanceof MeshBasicMaterial&&/CLOTH/i.test(material.name)))continue;
      if(visited.has(material))continue;
      visited.add(material);
      const base=materialBase.get(material)??{color:material.color.clone(),shade:material instanceof MToonMaterial?material.shadeColorFactor.clone():undefined};
      materialBase.set(material,base);
      material.color.copy(base.color);
      if(material instanceof MToonMaterial&&base.shade)material.shadeColorFactor.copy(base.shade);
      const role=roles.get(material);
      const source=native&&/^(skin|face)$/i.test(material.name)?skin.tint:role==='eyes'?eye.tint:role==='hair'?hair.tint:role&&['top','bottom','shoes','outer'].includes(role)?outfit.clothTint:/EyeIris/i.test(material.name)?eye.tint:/HAIR/i.test(material.name)?hair.tint:/SKIN/i.test(material.name)?skin.tint:/CLOTH/i.test(material.name)?outfit.clothTint:null;
      if(!source||source==='#ffffff')continue;
      const tint = new Color(source as ColorRepresentation);
      material.color.multiply(tint);
      if(material instanceof MToonMaterial)material.shadeColorFactor.multiply(tint);
    }
  });
}
