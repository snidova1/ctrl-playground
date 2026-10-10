import type {VRMHumanBoneName} from '@pixiv/three-vrm';
export type CharacterQuality = 'low' | 'high';
export interface CharacterDefinition {
  id: string;
  name: string;
  assets: Record<CharacterQuality, string>;
  height: number;
  license: {name: string; author: string; source: string};
  customization: {
    hairstyle: string;
    outfit: string;
    bodyProfile: string;
    strategy: 'authored-vrm-variants';
    accessoryBones: readonly VRMHumanBoneName[];
  };
}
/** Approved female reference; retained export for preview compatibility. */
export const previewCharacter: CharacterDefinition = {
  id: 'vroid-victoria-preview', name: 'Victoria', height: 1.88,
  assets: {high: '/plaza/characters/victoria-desktop.vrm', low: '/plaza/characters/victoria-mobile.vrm'},
  license: {name: 'CC0', author: 'VRoid Project / pixiv', source: 'https://vroid.pixiv.help/hc/en-us/articles/360014900233'},
  customization: {hairstyle: 'wavy-blonde', outfit: 'victoria-original', bodyProfile: 'source-proportions', strategy: 'authored-vrm-variants', accessoryBones: ['head', 'chest', 'hips', 'leftHand', 'rightHand']},
};
export const maleCharacter: CharacterDefinition = {
  id: 'vroid-fumiriya', name: 'Fumiriya', height: 1.9,
  assets: {high: '/plaza/characters/fumiriya-desktop.vrm', low: '/plaza/characters/fumiriya-mobile.vrm'},
  license: {name: 'CC0', author: 'VRoid Project / pixiv', source: 'https://vroid.pixiv.help/hc/en-us/articles/360014788554'},
  customization: {hairstyle: 'blonde-layered', outfit: 'fumiriya-original', bodyProfile: 'source-proportions', strategy: 'authored-vrm-variants', accessoryBones: ['head', 'chest', 'hips', 'leftHand', 'rightHand']},
};
export type CharacterGender = 'female' | 'male';
export const characterCatalog: Readonly<Record<CharacterGender, CharacterDefinition>> = {
  female: previewCharacter, male: maleCharacter,
};
/** Colorways are intentionally named colorways, not different garment meshes. */
export const outfitVariants = [
  {id: 'original', name: 'Original', clothTint: '#ffffff'},
  {id: 'sage', name: 'Sage', clothTint: '#a7c5b3'},
  {id: 'clay', name: 'Clay', clothTint: '#dfa9a1'},
  {id: 'slate', name: 'Slate', clothTint: '#a7b5cf'},
] as const;
export type OutfitVariantId = typeof outfitVariants[number]['id'];
export interface CharacterAppearance {version: 1; gender: CharacterGender; variantId: OutfitVariantId}
export const defaultAppearance: CharacterAppearance = {version: 1, gender: 'female', variantId: 'original'};
export function isCharacterAppearance(value: unknown): value is CharacterAppearance {
  if (!value || typeof value !== 'object') return false;
  const appearance = value as Record<string, unknown>;
  return appearance.version === 1 && (appearance.gender === 'male' || appearance.gender === 'female') && outfitVariants.some(variant => variant.id === appearance.variantId);
}
/** Stable across server/client; persist this result instead of rerolling on login. */
export function seededAppearance(seed: string, gender: CharacterGender): CharacterAppearance {
  let hash = 2166136261;
  for (const character of seed) {hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619);}
  return {version: 1, gender, variantId: outfitVariants[(hash >>> 0) % outfitVariants.length].id};
}
export function resolveCharacter(appearance: CharacterAppearance): CharacterDefinition {
  return characterCatalog[appearance.gender];
}
export const characterBudgets = {maxAssetBytes: 20 * 1024 * 1024, maxDelta: .05, fixedStep: 1 / 60, maxSteps: 3} as const;
export interface CharacterMotion {
  running: boolean;
  airborne: boolean;
  jumpTime: number;
  height: number;
  landedAt: number;
}
export function createCharacterMotion(): CharacterMotion {
  return {running: false, airborne: false, jumpTime: 0, height: 0, landedAt: -Infinity};
}
export const JUMP_DURATION = .9;
export function advanceJump(motion: CharacterMotion, delta: number, requested: boolean, locked: boolean, now: number) {
  if (locked) {motion.airborne = false; motion.height = 0; motion.jumpTime = 0; return;}
  if (requested && !motion.airborne) {motion.airborne = true; motion.jumpTime = 0;}
  if (!motion.airborne) return;
  motion.jumpTime = Math.min(JUMP_DURATION, motion.jumpTime + Math.min(.05, Math.max(0, delta)));
  motion.height = .72 * Math.sin(Math.PI * motion.jumpTime / JUMP_DURATION);
  if (motion.jumpTime >= JUMP_DURATION) {motion.airborne = false; motion.height = 0; motion.landedAt = now;}
}
/** Future saved loadouts refer to reviewed exports; arbitrary meshes need fitting/weights. */
export interface CharacterLoadout {
  version: 1;
  characterId: string;
  variantId: string;
  accessories: ReadonlyArray<{assetId: string; bone: VRMHumanBoneName}>;
}

export function validVariant(id:string):OutfitVariantId{return outfitVariants.find(v=>v.id===id)?.id??'original';}
