import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {GARDEN_COLLIDERS} from '../../features/common-ground/garden-decor';
const source=(file:string)=>readFileSync(new URL(`../../features/common-ground/${file}`,import.meta.url),'utf8');
describe('Common Ground decorative garden',()=>{
 it('adds authored flowers, pots, an open rose arch, bunting, lanterns and mosaic rather than an enclosed room',()=>{
  const s=source('garden-decor.tsx');for(const name of ['authored-colorful-flower-garden','terracotta-flower-pot','open-rose-and-ivy-arch','pastel-garden-pennants','warm-garden-lanterns','fountain-mosaic-apron','garden-path-stepping-stones'])expect(s).toContain(name);
  expect(s).not.toMatch(/fetch\(|wallet|mint|editor|HabitatApp/);
 });
 it('keeps the central entrance walkway clear and registers solid garden props for collision',()=>{
  expect(GARDEN_COLLIDERS.length).toBeGreaterThan(8);
  for(const c of GARDEN_COLLIDERS){expect(Number.isFinite(c.x+c.z+c.r)).toBe(true);expect(c.r).toBeGreaterThan(0);if(c.z>2)expect(Math.abs(c.x)-c.r).toBeGreaterThan(2);}
  expect(source('lobby-scene.tsx')).toContain('...GARDEN_COLLIDERS');
 });
 it('places meadow grass in side borders, leaving the main approach readable',()=>{
  const s=source('open-air-environment.tsx');expect(s).toContain('[-7,7].map');expect(s).toContain('<GardenDecor night={night}/>');
 });
});
