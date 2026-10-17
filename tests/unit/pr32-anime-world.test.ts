import {describe,expect,it} from 'vitest';
import {makeAnimePath,makeAnimeRoof,ANIME_WORLD_PALETTE} from '../../features/habitat/town-anime-village';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_SHOPS,isPublicWorldWalkable} from '../../features/habitat/public-world-geography';

describe('PR32 painted-anime Public World foundation',()=>{
 it('replaces giant rectangular streets with drawable upward-facing curved footpaths',()=>{
  const road=makeAnimePath([[-35,8],[-14,9],[7,8],[35,10]],4.3,2);
  const p=road.getAttribute('position'),n=road.getAttribute('normal'),c=road.getAttribute('color');
  expect(p.count).toBeGreaterThan(150);
  expect(c.count).toBe(p.count);
  expect(road.getAttribute('uv').count).toBe(p.count);
  for(let i=0;i<p.count;i++){
   expect(p.getY(i)).toBeCloseTo(.065,4);
   expect(n.getY(i)).toBeGreaterThan(.99);
   expect(Number.isFinite(p.getX(i)+p.getZ(i))).toBe(true);
  }
  road.dispose();
 });
 it('uses genuinely modeled curved roof profiles instead of a box shell',()=>{
  const w=7,d=6,roof=makeAnimeRoof(w,d,2.1,0),p=roof.getAttribute('position');
  expect(p.count).toBeGreaterThan(35);
  expect(roof.getAttribute('color').count).toBe(p.count);
  expect(roof.getAttribute('uv').count).toBe(p.count);
  const levels=new Set<number>();
  for(let i=0;i<p.count;i++){
   levels.add(Math.round(p.getY(i)*100));
   expect(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i))).toBe(true);
   expect(Math.abs(p.getX(i))).toBeLessThan(w/2+1);
   expect(Math.abs(p.getZ(i))).toBeLessThan(d/2+1);
  }
  expect(levels.size).toBeGreaterThan(4);
  roof.dispose();
 });
 it('preserves the original physical town footprint while rebuilding its renderer',()=>{
  expect(PUBLIC_WORLD_BUILDINGS.length).toBe(6);
  expect(PUBLIC_WORLD_SHOPS.length).toBe(2);
  for(const house of [...PUBLIC_WORLD_BUILDINGS,...PUBLIC_WORLD_SHOPS]){
   expect(isPublicWorldWalkable(house.x,house.z)).toBe(false);
  }
  expect(isPublicWorldWalkable(0,6)).toBe(true);
  expect(ANIME_WORLD_PALETTE.grass).toMatch(/^#[\da-f]{6}$/i);
 });
});
