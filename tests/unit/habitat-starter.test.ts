import {describe,it,expect} from 'vitest';
import {STARTER_TEMPLATE_ID,STARTER_WORLD_OBJECT_COUNT,createStarterWorld,inspectStarterSourceAssets,shouldSeedStarterWorld} from '@/features/habitat/starter-world';
import {layoutSchema} from '@/features/habitat/types';

describe('Editable starter home',()=>{
 it('ships a real, fully-editable starter world with unique IDs and valid transforms',()=>{
  const objects=createStarterWorld();
  expect(STARTER_TEMPLATE_ID).toBe('garden-courtyard-v1');
  expect(objects.length).toBe(STARTER_WORLD_OBJECT_COUNT);
  expect(objects.length).toBeGreaterThan(20);
  expect(objects.length).toBeLessThan(70);
  expect(layoutSchema.safeParse(objects).success).toBe(true);
  expect(new Set(objects.map(o=>o.id)).size).toBe(objects.length);
  expect(objects.some(o=>o.behavior==='seat')).toBe(true);
  expect(objects.some(o=>o.behavior==='light')).toBe(true);
  expect(objects.some(o=>o.assetId.includes('tree'))).toBe(true);
  expect(inspectStarterSourceAssets()).toEqual([]);
 });
 it('never reseeds edited/cleared, visited, or unauthorized worlds',()=>{
  const original=createStarterWorld(), base={id:crypto.randomUUID(),ownerId:'wallet-A',revision:0,objects:[]};
  expect(shouldSeedStarterWorld(base,'wallet-A',true,base.id)).toBe(true);
  expect(shouldSeedStarterWorld({...base,revision:1},'wallet-A',true,base.id)).toBe(false);
  expect(shouldSeedStarterWorld({...base,objects:original},'wallet-A',true,base.id)).toBe(false);
  expect(shouldSeedStarterWorld(base,'wallet-B',true,base.id)).toBe(false);
  expect(shouldSeedStarterWorld(base,'wallet-A',false,base.id)).toBe(false);
  expect(shouldSeedStarterWorld(base,'wallet-A',true,crypto.randomUUID())).toBe(false);
 });
});
