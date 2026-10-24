import {describe,it,expect} from 'vitest';
import {createHouseCameraResolver,houseCutawayEnabled} from '@/features/habitat/house-camera';
import {DEFAULT_HOUSE,replaceHouse,HOUSE_DOOR_ASSET_ID,HOUSE_WALL_HEIGHT} from '@/features/habitat/modular-house';
// Preserve tight-room collision coverage even when the starter preset is spacious.
const objects=replaceHouse([],{...DEFAULT_HOUSE,cells:[{x:0,z:0},{x:0,z:1}]}),door=objects.find(o=>o.assetId===HOUSE_DOOR_ASSET_ID)!;
const distance=(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number})=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
describe('intact house with adaptive third-person camera',()=>{
 it('never uses a cutaway for gameplay, only an explicitly selected build floorplan',()=>{
  expect(houseCutawayEnabled(false,false)).toBe(false);expect(houseCutawayEnabled(false,true)).toBe(false);
  expect(houseCutawayEnabled(true,false)).toBe(true);expect(houseCutawayEnabled(true,true)).toBe(false);
 });
 it('leaves an unobstructed exterior camera unchanged',()=>{
  const desired={x:0,y:3.4,z:12};expect(createHouseCameraResolver(objects,{})({x:0,y:1.25,z:6},desired)).toEqual(desired);
 });
 it('shortens the camera boom inside, without removing walls or roof',()=>{
  const target={x:0,y:1.25,z:-3.5},next=createHouseCameraResolver(objects,{})(target,{x:0,y:4,z:5});
  expect(distance(target,next)).toBeGreaterThan(2.8);expect(distance(target,next)).toBeLessThanOrEqual(3.201);expect(next.y).toBeLessThan(HOUSE_WALL_HEIGHT-.2);
 });
 it('clips the camera against solid walls and window glazing',()=>{
  const target={x:0,y:1.25,z:-3.5},resolve=createHouseCameraResolver(objects,{});
  for(const sign of [-1,1]){const p=resolve(target,{x:sign*8,y:2,z:-3.5});expect(Math.abs(p.x)).toBeLessThan(1.3);expect(Math.abs(p.x)).toBeGreaterThan(.7);}
 });
 it('respects a closed door but can see through the same open doorway',()=>{
  const target={x:0,y:1.25,z:-.4},desired={x:0,y:3.4,z:7.4};
  const closed=createHouseCameraResolver(objects,{})(target,desired),open=createHouseCameraResolver(objects,{[door.id]:{active:true,usedAt:0}})(target,desired);
  expect(closed.z).toBeLessThan(.9);expect(open.z).toBeGreaterThan(1.1);
 });
 it('keeps an upward-pitched camera below the actual interior ceiling',()=>{
  const p=createHouseCameraResolver(objects,{})({x:0,y:1.25,z:-3.5},{x:0,y:10,z:-3.5});expect(p.y).toBeLessThanOrEqual(2.35);
 });
 it('adapts continuously across the doorway rather than switching house visibility',()=>{
  const resolve=createHouseCameraResolver(objects,{[door.id]:{active:true,usedAt:0}});
  const outside=resolve({x:0,y:1.25,z:1.05},{x:0,y:3.4,z:8.85}),inside=resolve({x:0,y:1.25,z:.95},{x:0,y:3.4,z:8.75});
  expect(distance(outside,inside)).toBeLessThan(.3);
 });
 it('is idempotent so resolving the smoothed camera cannot repeatedly shrink the boom',()=>{
  const resolve=createHouseCameraResolver(objects,{}),target={x:0,y:1.25,z:1.4};const once=resolve(target,{x:0,y:3.4,z:9.2});expect(resolve(target,once)).toEqual(once);
 });
 it('handles corner orbits, concave footprints and legacy fallback without NaN',()=>{
  const expanded=replaceHouse([], {...DEFAULT_HOUSE,cells:[{x:0,z:0},{x:0,z:1},{x:1,z:0}]});
  for(const layout of [objects,expanded,[]])for(let i=0;i<16;i++){
   const p=createHouseCameraResolver(layout,{})({x:0,y:1.25,z:-3.5},{x:Math.sin(i)*8,y:5,z:-3.5+Math.cos(i)*8});
   expect([p.x,p.y,p.z].every(Number.isFinite)).toBe(true);expect(p.y).toBeLessThanOrEqual(2.35);
  }
 });
});
