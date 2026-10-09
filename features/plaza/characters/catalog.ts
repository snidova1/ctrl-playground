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
/** Candidate only. The default Playground continues to use MIO. */
export const previewCharacter: CharacterDefinition = {
  id: 'vroid-victoria-preview', name: 'Victoria · VRoid study', height: 1.88,
  assets: {high: '/plaza/characters/victoria-desktop.vrm', low: '/plaza/characters/victoria-mobile.vrm'},
  license: {name: 'CC0', author: 'VRoid Project / pixiv', source: 'https://vroid.pixiv.help/hc/en-us/articles/360014900233'},
  customization: {hairstyle: 'wavy-blonde', outfit: 'victoria-original', bodyProfile: 'source-proportions', strategy: 'authored-vrm-variants', accessoryBones: ['head', 'chest', 'hips', 'leftHand', 'rightHand']},
};
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
