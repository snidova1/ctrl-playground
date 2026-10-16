import {describe,expect,it} from 'vitest';
import {
 AVAILABLE_CHARACTER_DEFINITIONS,defaultAppearance,eyeVariants,hairVariants,getAvailableCharacter,isCharacterAppearance,normalizeAppearance,
 outfitVariants,resolveCharacter,seededAppearance,skinVariants,
} from '@/features/plaza/characters/catalog';

describe('VRoid appearance contract',()=>{
 it('generates deterministic allowlisted appearances',()=>{
  const first=seededAppearance('wallet:0x123','female');
  expect(seededAppearance('wallet:0x123','female')).toEqual(first);
  expect(isCharacterAppearance(first)).toBe(true);
  expect(outfitVariants.map(item=>item.id)).toContain(first.variantId);
  expect(hairVariants.map(item=>item.id)).toContain(first.hairId);
  expect(eyeVariants.map(item=>item.id)).toContain(first.eyeId);
  expect(skinVariants.map(item=>item.id)).toContain(first.skinId);
 });

 it('preserves valid saved appearance and repairs legacy profiles',()=>{
  const saved={...defaultAppearance,hairId:'auburn' as const,eyeId:'jade' as const};
  expect(normalizeAppearance(saved,'female','slate')).toEqual(saved);
  const repaired=normalizeAppearance(undefined,'male','clay');
  expect(repaired).toMatchObject({version:1,gender:'male',variantId:'clay'});
  expect(isCharacterAppearance(repaired)).toBe(true);
 });

 it('chooses real complete local VRMs through a stable wallet-linked character ID',()=>{
  expect(AVAILABLE_CHARACTER_DEFINITIONS.map(item=>item.id)).toEqual(['vroid-victoria-preview','vroid-fumiriya']);
  const female={...defaultAppearance,gender:'female' as const,characterId:'vroid-victoria-preview'};
  const male={...defaultAppearance,gender:'male' as const,characterId:'vroid-fumiriya'};
  expect(isCharacterAppearance(female)).toBe(true);
  expect(isCharacterAppearance(male)).toBe(true);
  expect(resolveCharacter(female).id).toBe('vroid-victoria-preview');
  expect(resolveCharacter(male).id).toBe('vroid-fumiriya');
  expect(normalizeAppearance(male,'male','original').characterId).toBe(male.characterId);
  expect(getAvailableCharacter('blender-rain')).toBeUndefined();
  expect(isCharacterAppearance({...female,characterId:'blender-rain'})).toBe(false);
 });
 it('rejects client-controlled IDs outside the catalog',()=>{
  expect(isCharacterAppearance({...defaultAppearance,hairId:'https://evil.invalid/hair.vrm'})).toBe(false);
  expect(isCharacterAppearance({...defaultAppearance,version:2})).toBe(false);
 });
});
