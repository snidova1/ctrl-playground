import {describe,it,expect} from 'vitest';
import {accessoryStyles,applyAccessoryStyle,clearAvatarAccessories,matchesAccessoryStyle} from '@/features/plaza/characters/accessory-styles';
import {defaultAppearance,isCharacterAppearance,type CharacterAppearance} from '@/features/plaza/characters/catalog';
describe('curated accessory styles',()=>{
 const identity:CharacterAppearance={...defaultAppearance,gender:'female',lookId:'alternate',hairId:'auburn',eyeId:'jade',skinId:'warm',variantId:'slate',expressionId:'happy'};
 it('offers six distinct allowlisted loadouts, not new hair or costume claims',()=>{
  expect(accessoryStyles).toHaveLength(6);expect(new Set(accessoryStyles.map(s=>JSON.stringify(s.selection))).size).toBe(6);
  for(const style of accessoryStyles){const a=applyAccessoryStyle(identity,style.id);expect(isCharacterAppearance(a)).toBe(true);expect(matchesAccessoryStyle(a,style.id)).toBe(true);expect(a.neckwearId).not.toBe('pendant');}
 });
 it('preserves original identity, model, colors and expression when styling',()=>{
  for(const style of accessoryStyles){const a=applyAccessoryStyle(identity,style.id);for(const k of ['gender','lookId','hairId','eyeId','skinId','variantId','expressionId'] as const)expect(a[k]).toBe(identity[k]);}
 });
 it('clears accessories without resetting the character or expression',()=>{
  const dressed=applyAccessoryStyle(identity,'cozy'),a=clearAvatarAccessories(dressed);
  for(const k of ['headwearId','eyewearId','earringId','neckwearId','backwearId'] as const)expect(a[k]).toBe('none');
  expect(a.lookId).toBe('alternate');expect(a.expressionId).toBe('happy');expect(a.hairId).toBe('auburn');expect(a.accessoryColorId).toBe(dressed.accessoryColorId);
 });
 it('does not mutate the original appearance and rejects unknown preset IDs',()=>{
  const before={...identity};applyAccessoryStyle(identity,'artist');expect(identity).toEqual(before);expect(applyAccessoryStyle(identity,'unknown')).toEqual(identity);expect(matchesAccessoryStyle(identity,'unknown')).toBe(false);
 });
});
