import {expect,it} from 'vitest';
import {makeShopCanopy,makeShopJoinery} from '../../features/habitat/town-storefront-detail';
import {makeFountainInlay} from '../../features/habitat/town-paving';

it('batches sewn storefront canopy into two finite meshes above pedestrian headroom',()=>{
 const geometry=makeShopCanopy();expect(geometry).toHaveLength(2);
 for(const part of geometry){
  part.computeBoundingBox();const box=part.boundingBox!;
  expect(box.min.y).toBeGreaterThan(2.7);expect(box.max.y).toBeLessThan(3.65);
  expect(box.min.x).toBeGreaterThanOrEqual(-4.75);expect(box.max.x).toBeLessThanOrEqual(4.75);
  expect(box.max.z).toBeLessThan(3.71);
  expect([...part.getAttribute('position').array].every(Number.isFinite)).toBe(true);part.dispose();
 }
});
it('keeps wall joinery inside the existing storefront and batches it into two materials',()=>{
 const geometry=makeShopJoinery();expect(geometry).toHaveLength(2);
 for(const part of geometry){part.computeBoundingBox();expect(part.boundingBox!.max.z).toBeLessThan(2.3);part.dispose();}
});
it('keeps the fountain inlay flush, finite and outside the unchanged solid basin',()=>{
 const geometry=makeFountainInlay(),positions=geometry.getAttribute('position');
 for(let i=0;i<positions.count;i++){
  const radius=Math.hypot(positions.getX(i),positions.getZ(i)+3);
  expect(radius).toBeGreaterThan(2.29);expect(radius).toBeLessThan(2.99);
  expect(positions.getY(i)).toBeCloseTo(.029,5);
  expect(geometry.getAttribute('normal').getY(i)).toBeGreaterThan(.99);
 }
 geometry.dispose();
});
