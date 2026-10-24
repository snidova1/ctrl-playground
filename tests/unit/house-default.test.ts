import {describe,it,expect} from 'vitest';
import {DEFAULT_HOUSE,HOUSE_CELL_SIZE,getHouseEdges,getHouseConfig,replaceHouse,houseBlocksAt} from '@/features/habitat/modular-house';
import {createStarterWorld} from '@/features/habitat/starter-world';
import {layoutSchema} from '@/features/habitat/types';
describe('spacious default house on a clear starter plot',()=>{
 it('starts with a centered 9 by 6 metre continuous footprint, not the old narrow two-cell strip',()=>{
  const edges=getHouseEdges(DEFAULT_HOUSE),xs=edges.map(e=>e.x),zs=edges.map(e=>e.z);
  expect(DEFAULT_HOUSE.cells).toHaveLength(6);expect(Math.max(...xs)-Math.min(...xs)).toBe(9);expect(Math.max(...zs)-Math.min(...zs)).toBe(6);
  expect(DEFAULT_HOUSE.cells.length*HOUSE_CELL_SIZE**2).toBe(54);
  const objects=replaceHouse([],DEFAULT_HOUSE);
  for(const x of [-3,0,3])expect(houseBlocksAt(x,-3.5,objects,{})).toBe(false);
  expect(layoutSchema.safeParse(objects).success).toBe(true);
 });
 it('does not expand or rescale an existing customized house or change its object IDs',()=>{
  const small={...DEFAULT_HOUSE,cells:[{x:0,z:0},{x:0,z:1}],wallColor:'#112233'},objects=replaceHouse([],small),before=JSON.stringify(objects);
  expect(getHouseConfig(objects)).toEqual(small);expect(JSON.stringify(objects)).toBe(before);expect(getHouseConfig(objects).cells).toHaveLength(2);
 });
 it('does not put patio slabs or outdoor vegetation in the new empty starter plot',()=>{
  const objects=createStarterWorld();expect(objects.some(o=>o.assetId==='building-kit/floor')).toBe(false);
  expect(objects.some(o=>o.assetId.startsWith('nature-kit/'))).toBe(false);
  expect(objects.some(o=>o.behavior==='seat')).toBe(true);expect(objects.some(o=>o.behavior==='light')).toBe(true);
 });
});
