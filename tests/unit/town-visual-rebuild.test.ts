import {expect,it} from 'vitest';
import {makeRoundedTree} from '../../features/habitat/town-rounded-trees';
import {makeBistroFurniture,BISTRO_FURNITURE} from '../../features/habitat/town-bistro-furniture';
import {createScenicPavingGeometry} from '../../features/habitat/town-paving';
import {getBuildAsset} from '../../features/plaza/build-assets';
import {makeMeadowFlowers} from '../../features/habitat/town-meadow-flowers';

it('keeps original rounded trees finite, smooth, grounded and below their normalized height budget',()=>{
 for(let i=0;i<3;i++){
  const {trunk,crown,foliage}=makeRoundedTree(i);
  expect(trunk.boundingBox!.min.y).toBeGreaterThanOrEqual(-.001);
  expect(crown.boundingBox!.max.y).toBeLessThan(1.12);
  expect(crown.boundingBox!.min.y).toBeGreaterThan(.3);
  expect(crown.getAttribute('color').count).toBe(crown.getAttribute('position').count);
  expect(foliage.getAttribute('color').count).toBe(foliage.getAttribute('position').count);
  expect(foliage.boundingBox!.max.y).toBeLessThan(1.12);
  for(const g of [trunk,crown,foliage]){expect([...g.getAttribute('position').array].every(Number.isFinite)).toBe(true);g.dispose();}
 }
});
it('authors all bistro replacements in the original normalized local units, not giant furniture',()=>{
 for(const id of BISTRO_FURNITURE){
  const parts=makeBistroFurniture(id);
  for(const geometry of Object.values(parts))if(geometry){
   expect(geometry.boundingBox!.min.y).toBeGreaterThan(-.005);
   expect(geometry.boundingBox!.max.y).toBeLessThan(.48);
   const bounds=getBuildAsset(id)!.bounds,b=geometry.boundingBox!;
   expect(Math.max(Math.abs(b.min.x),Math.abs(b.max.x))*2).toBeLessThanOrEqual(bounds[0]+.00001);
   expect(Math.max(Math.abs(b.min.z),Math.abs(b.max.z))*2).toBeLessThanOrEqual(bounds[2]+.00001);
   expect([...geometry.getAttribute('position').array].every(Number.isFinite)).toBe(true);geometry.dispose();
  }
 }
});
it('keeps long scenic road pavers in world-space at the same density as the plaza',()=>{
 for(const ends of [[-60,9,60,9],[0,-60,0,60],[-40,-20,30,50]]){
  const geometry=createScenicPavingGeometry(...ends as [number,number,number,number],4.8);
  const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  for(let i=0;i<position.count;i++){
   expect(uv.getX(i)*4.8).toBeCloseTo(position.getX(i),4);expect(uv.getY(i)*4.8).toBeCloseTo(position.getZ(i),4);
   expect(position.getY(i)).toBeCloseTo(0,5);expect(geometry.getAttribute('normal').getY(i)).toBeGreaterThan(.99);
  }
  geometry.dispose();
 }
});
it('keeps meadow flowers inside the old decorative flower patch footprint',()=>{
 for(const geometry of makeMeadowFlowers()){
  const bounds=geometry.boundingBox!;
  expect(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))).toBeLessThan(.77664/2);
  expect(Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))).toBeLessThan(.78565/2);
  expect(bounds.min.y).toBeGreaterThanOrEqual(0);geometry.dispose();
 }
});
