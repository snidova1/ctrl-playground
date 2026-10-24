import {describe,it,expect} from 'vitest';
import {defaultAppearance,hairVariants,eyeVariants,skinVariants,outfitVariants} from '../../features/plaza/characters/catalog';
import {storybookPalette} from '../../features/plaza/characters/storybook-palette';
describe('Original avatar palette',()=>{
 it('maps original skin/hair/iris to authored natural colors, never white multiplicative VRM tints',()=>{
  const p=storybookPalette(defaultAppearance);
  expect(p.skin).toBe('#f1c9ad');expect(p.hair).toBe('#704735');expect(p.iris).toBe('#80613e');
 });
 it('every persisted appearance option produces complete valid colors',()=>{
  const all=[...hairVariants.map(v=>({...defaultAppearance,hairId:v.id})),...eyeVariants.map(v=>({...defaultAppearance,eyeId:v.id})),...skinVariants.map(v=>({...defaultAppearance,skinId:v.id})),...outfitVariants.map(v=>({...defaultAppearance,variantId:v.id}))];
  for(const a of all)for(const color of Object.values(storybookPalette(a)))expect(color).toMatch(/^#[0-9a-f]{6}$/i);
 });
 it('changing wardrobe does not change hair, eyes or skin',()=>{
  const original=storybookPalette(defaultAppearance),changed=storybookPalette({...defaultAppearance,variantId:'clay'});
  expect(changed.cloth).not.toBe(original.cloth);
  expect([changed.skin,changed.hair,changed.iris]).toEqual([original.skin,original.hair,original.iris]);
 });
});
