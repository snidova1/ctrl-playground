import {Color, Mesh, type ColorRepresentation} from 'three';
import {MToonMaterial, type VRM} from '@pixiv/three-vrm';
import {eyeVariants,hairVariants,outfitVariants,skinVariants,type CharacterAppearance,type OutfitVariantId} from './catalog';

/** Apply once to each freshly loaded VRM. Does not recolor skin/hair or mutate shared assets. */
export function applyCharacterColorway(vrm: VRM, variantId: OutfitVariantId): void {
  applyCharacterAppearance(vrm,{version:1,gender:'female',variantId,hairId:'source',eyeId:'source',skinId:'source'});
}

/** Apply the persisted, allowlisted appearance to one freshly loaded VRM instance. */
export function applyCharacterAppearance(vrm:VRM,appearance:CharacterAppearance):void{
  const outfit=outfitVariants.find(item=>item.id===appearance.variantId)??outfitVariants[0];
  const hair=hairVariants.find(item=>item.id===appearance.hairId)??hairVariants[0];
  const eye=eyeVariants.find(item=>item.id===appearance.eyeId)??eyeVariants[0];
  const skin=skinVariants.find(item=>item.id===appearance.skinId)??skinVariants[0];
  const visited = new Set<MToonMaterial>();
  vrm.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof MToonMaterial) || visited.has(material)) continue;
      visited.add(material);
      const source=/EyeIris/i.test(material.name)?eye.tint:/HAIR/i.test(material.name)?hair.tint:/SKIN/i.test(material.name)?skin.tint:/CLOTH/i.test(material.name)?outfit.clothTint:null;
      if(!source||source==='#ffffff')continue;
      const tint = new Color(source as ColorRepresentation);
      material.color.multiply(tint);
      material.shadeColorFactor.multiply(tint);
    }
  });
}
