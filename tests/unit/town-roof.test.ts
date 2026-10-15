import {it,expect} from 'vitest';
import {makeTownRoof,type TownRoofKind} from '@/features/habitat/town-roof';
it('keeps original roof variants finite, closed at the ends and inside the existing eave footprint',()=>{
 for(const kind of ['hip','gambrel','clerestory'] as TownRoofKind[]){
  const geometry=makeTownRoof(7,6,1.6,kind);geometry.computeBoundingBox();
  const box=geometry.boundingBox!;
  expect(box.min.x).toBeCloseTo(-3.85);expect(box.max.x).toBeCloseTo(3.85);
  expect(box.min.z).toBeCloseTo(-3.35);expect(box.max.z).toBeCloseTo(3.35);
  expect(box.min.y).toBe(0);expect(box.max.y).toBeCloseTo(1.6);
  for(const name of ['position','normal','uv'])expect([...geometry.getAttribute(name).array].every(Number.isFinite)).toBe(true);
  expect(geometry.getAttribute('position').count/3).toBeLessThan(30);
  geometry.dispose();
 }
});
