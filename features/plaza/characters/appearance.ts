import {Color, Mesh, type ColorRepresentation} from 'three';
import {MToonMaterial, type VRM} from '@pixiv/three-vrm';
import {outfitVariants, type OutfitVariantId} from './catalog';

/** Apply once to each freshly loaded VRM. Does not recolor skin/hair or mutate shared assets. */
export function applyCharacterColorway(vrm: VRM, variantId: OutfitVariantId): void {
  const variant = outfitVariants.find(item => item.id === variantId) ?? outfitVariants[0];
  if (variant.id === 'original') return;
  const tint = new Color(variant.clothTint as ColorRepresentation);
  const visited = new Set<MToonMaterial>();
  vrm.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof MToonMaterial) || visited.has(material) || !/CLOTH/i.test(material.name)) continue;
      visited.add(material);
      material.color.multiply(tint);
      material.shadeColorFactor.multiply(tint);
    }
  });
}
