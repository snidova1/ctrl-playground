import {describe,it,expect} from 'vitest';
import {STARTER_TEMPLATE_ID,STARTER_WORLD_OBJECT_COUNT,createStarterWorld,inspectStarterSourceAssets,shouldSeedStarterWorld} from '@/features/habitat/starter-world';
import {collideWorld,layoutSchema} from '@/features/habitat/types';

describe('Playable cozy cottage starter home',()=>{
 it('ships an editable furnished home plus garden within the mobile scene budget',()=>{
  const objects=createStarterWorld();
  expect(STARTER_TEMPLATE_ID).toBe('cozy-cottage-v1');
  expect(objects.length).toBe(STARTER_WORLD_OBJECT_COUNT);
  expect(objects.length).toBeGreaterThan(45);
  expect(objects.length).toBeLessThan(70);
  expect(layoutSchema.safeParse(objects).success).toBe(true);
  expect(new Set(objects.map(o=>o.id)).size).toBe(objects.length);
  expect(objects.some(o=>o.behavior==='seat')).toBe(true);
  expect(objects.some(o=>o.behavior==='light')).toBe(true);
  expect(objects.some(o=>o.assetId.includes('tree'))).toBe(true);
  expect(objects.some(o=>o.assetId==='furniture-kit/loungeSofa')).toBe(true);
  expect(objects.some(o=>o.assetId==='furniture-kit/rugRounded')).toBe(true);
  expect(objects.filter(o=>o.assetId==='building-kit/wall-window-square')).toHaveLength(3);
  expect(objects.filter(o=>o.assetId==='building-kit/roof-flat-center')).toHaveLength(3);
  expect(inspectStarterSourceAssets()).toEqual([]);
 });
 it('keeps the entrance walkable, with solid exterior walls and no solid roof collision',()=>{
  const home=createStarterWorld();
  const walk=collideWorld({x:0,z:.8},{x:0,z:-3},home,{});
  expect(walk.z).toBeLessThan(-2.8);
  const closedWall=collideWorld({x:2,z:.8},{x:2,z:-3},home,{});
  expect(closedWall.z).toBeGreaterThan(-1);
  expect(home.filter(o=>o.assetId.startsWith('building-kit/roof')).every(o=>o.behavior==='decoration'&&o.y>2)).toBe(true);
 });
 it('never reseeds edited/cleared, visited, or unauthorized worlds',()=>{
  const original=createStarterWorld(),base={id:crypto.randomUUID(),ownerId:'wallet-A',revision:0,objects:[]};
  expect(shouldSeedStarterWorld(base,'wallet-A',true,base.id)).toBe(true);
  expect(shouldSeedStarterWorld({...base,revision:1},'wallet-A',true,base.id)).toBe(false);
  expect(shouldSeedStarterWorld({...base,objects:original},'wallet-A',true,base.id)).toBe(false);
  expect(shouldSeedStarterWorld(base,'wallet-B',true,base.id)).toBe(false);
  expect(shouldSeedStarterWorld(base,'wallet-A',false,base.id)).toBe(false);
  expect(shouldSeedStarterWorld(base,'wallet-A',true,crypto.randomUUID())).toBe(false);
 });
});
