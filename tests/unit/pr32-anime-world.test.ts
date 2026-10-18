import {describe,expect,it} from 'vitest';
import {MeshStandardMaterial,MeshToonMaterial} from 'three';
import {scenicRoadOutsideSquare} from '../../domain/town-scenic-roads';
import {townContactFootprints} from '../../features/habitat/town-anime-grounding';
import {storybookPlantings} from '../../features/habitat/town-anime-garden';
import {animeMaterial,makeAnimeLightRamp} from '../../features/habitat/town-anime-material';
import {makeAnimePath,makeAnimeRoof,ANIME_WORLD_PALETTE} from '../../features/habitat/town-anime-village';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_SHOPS,isPublicWorldWalkable} from '../../features/habitat/public-world-geography';

describe('PR32 painted-anime Public World foundation',()=>{
 it('grounds every authored cottage with instanced watercolor contact shade instead of costly GTAO',()=>{
  const low=townContactFootprints('low'),high=townContactFootprints('high');
  expect(low.length).toBe(12); // eight buildings + four near willows
  expect(high.length).toBe(16); // eight buildings + eight scene trees
  for(const shade of high){
   expect(shade.width).toBeGreaterThan(1);
   expect(shade.depth).toBeGreaterThan(1);
   expect(shade.strength).toBeGreaterThan(0);
   expect(Number.isFinite(shade.x+shade.z)).toBe(true);
  }
 });

 it('plants actual instanced CC0 flower groups in designed garden islands, never a road or fountain',()=>{
  const high=storybookPlantings('high'),low=storybookPlantings('low');
  for(const kind of ['red','yellow','purple','grass'] as const){
   expect(high[kind].length).toBeGreaterThan(10);
   expect(low[kind].length).toBeGreaterThan(4);
   expect(high[kind].length).toBeGreaterThanOrEqual(low[kind].length);
   for(const plant of high[kind]){
    expect(Number.isFinite(plant.x+plant.z)).toBe(true);
    if(Math.abs(plant.x)<3.7)expect(plant.z< -17||plant.z>=38).toBe(true);
    expect(Math.hypot(plant.x,plant.z+3)).toBeGreaterThanOrEqual(5.8);
   }
  }
 });

 it('clips old brick road segments out of the authored village while retaining walkable outskirts',()=>{
  const roads=scenicRoadOutsideSquare([-78,9,78,9],34);
  expect(roads.length).toBe(2);
  for(const [ax,az,bx,bz] of roads){
   const mx=(ax+bx)/2,mz=(az+bz)/2;
   expect(Math.hypot(mx,mz)).toBeGreaterThanOrEqual(34);
  }
  expect(scenicRoadOutsideSquare([-8,4,8,4],34)).toEqual([]);
  expect(scenicRoadOutsideSquare([60,8,85,8],34)).toEqual([[60,8,85,8]]);
 });

 it('keeps original GLB textures while applying a warm illustration light ramp to buildings',()=>{
  const original=new MeshStandardMaterial({color:'#ead4ae',roughness:.3,metalness:.6});
  const painted=animeMaterial(original,false);
  expect(painted).toBeInstanceOf(MeshToonMaterial);
  expect(painted).not.toBe(original);
  expect(original.metalness).toBe(.6);
  expect((painted as MeshToonMaterial).gradientMap).toBeDefined();
  const tree=animeMaterial(original,true);
  expect(tree).toBeInstanceOf(MeshStandardMaterial);
  expect((tree as MeshStandardMaterial).metalness).toBe(0);
  painted.dispose();tree.dispose();original.dispose();
  const ramp=makeAnimeLightRamp();
  expect(ramp.image.width).toBeGreaterThanOrEqual(8);
  ramp.dispose();
 });

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
