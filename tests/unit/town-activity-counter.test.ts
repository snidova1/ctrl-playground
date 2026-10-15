import {it,expect} from 'vitest';
import {makeActivityCounter} from '@/features/habitat/town-activity-counter';
it('batches station joinery inside the existing solid counter footprint',()=>{
 const parts=makeActivityCounter();expect(parts).toHaveLength(3);
 for(const geometry of parts){
  geometry.computeBoundingBox();const box=geometry.boundingBox!;
  expect(box.min.x).toBeGreaterThanOrEqual(-.901);expect(box.max.x).toBeLessThanOrEqual(.901);
  expect(box.min.z).toBeGreaterThanOrEqual(-.651);expect(box.max.z).toBeLessThanOrEqual(.651);
  expect(box.min.y).toBeGreaterThanOrEqual(0);expect(box.max.y).toBeLessThanOrEqual(1.021);
  expect([...geometry.getAttribute('position').array].every(Number.isFinite)).toBe(true);geometry.dispose();
 }
});
