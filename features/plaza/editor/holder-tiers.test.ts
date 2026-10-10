import {describe,it,expect} from 'vitest';
import {BUILD_ASSETS} from '@/features/plaza/build-assets';
import {HOLDER_ASSET_TIERS,requiredAssetTier,resolveHolderAssetTier,canPlaceAsset,premiumAssetIds,lockedNewAssets} from './holder-tiers';
describe('Holder tier assets use real catalog IDs',()=>{
 const ids=new Set(BUILD_ASSETS.map(a=>a.id));
 it('all curated IDs exist in CTRL',()=>{expect(BUILD_ASSETS).toHaveLength(991);expect(premiumAssetIds.every(id=>ids.has(id))).toBe(true);expect(new Set(premiumAssetIds).size).toBe(premiumAssetIds.length);});
 it('matches exact balance tiers',()=>{
  expect(HOLDER_ASSET_TIERS).toHaveLength(5);
  const cases:[number|null,string][]=[[null,'basic'],[0,'basic'],[499999,'basic'],[500000,'studio'],[999999,'studio'],[1000000,'luxe'],[1999999,'luxe'],[2000000,'grand'],[3000000,'grand'],[3000001,'signature']];
  cases.forEach(([amount,tier])=>expect(resolveHolderAssetTier(amount)).toBe(tier));
 });
 it('client-tier bypass is disallowed by policy',()=>{
  expect(canPlaceAsset('furniture-kit/chair',null)).toBe(true);
  expect(canPlaceAsset('nature-kit/statue_ring',null)).toBe(false);
  expect(canPlaceAsset('nature-kit/statue_ring',3000001)).toBe(true);
  expect(requiredAssetTier('arbitrary.glb')).toBe('basic'); // Server still rejects unknown ID separately
 });
 it('higher tiers retain lower-tier furniture',()=>{expect(canPlaceAsset('furniture-kit/benchCushion',1000000)).toBe(true);expect(canPlaceAsset('nature-kit/statue_column',2000000)).toBe(true);});
 it('rejects adding extra premium after dropping token holdings',()=>{
  expect(lockedNewAssets([],[{assetId:'nature-kit/statue_ring'}],500000)).toEqual(['nature-kit/statue_ring']);
  const original=[{assetId:'nature-kit/statue_ring'}];
  expect(lockedNewAssets(original,original,0)).toEqual([]);
  expect(lockedNewAssets(original,[...original,...original],0)).toEqual(['nature-kit/statue_ring']);
  expect(lockedNewAssets(original,[],0)).toEqual([]);
 });
});
