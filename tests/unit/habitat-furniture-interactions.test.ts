import {describe,expect,it} from 'vitest';
import {inferFurnitureBehavior,nearestUsableObject,seatPoseFor,interactionLabel} from '@/features/habitat/furniture-interactions';
import type {WorldObject} from '@/features/habitat/types';
const piece=(assetId:string,behavior:WorldObject['behavior'],x=0,z=0):WorldObject=>({id:crypto.randomUUID(),assetId,behavior,x,z,y:0,rotation:0,scale:1,name:'Cozy piece',target:''});
describe('actual furniture affordances in a walk-through home',()=>{
 it('new real chair/sofa/bench models are seats and lamps are switchable without changing generic decorations',()=>{
  for(const id of ['furniture-kit/chair','furniture-kit/chairCushion','furniture-kit/benchCushionLow','furniture-kit/loungeChair','furniture-kit/loungeSofa','furniture-kit/loungeDesignSofa','furniture-kit/stoolBar'])expect(inferFurnitureBehavior(id)).toBe('seat');
  expect(inferFurnitureBehavior('furniture-kit/lampRoundFloor')).toBe('light');
  expect(inferFurnitureBehavior('furniture-kit/tableRound')).toBe('decoration');
  expect(inferFurnitureBehavior('nature-kit/tree_default')).toBe('decoration');
 });
 it('decorative rugs and house anchors never steal the E/touch action from furniture',()=>{
  const rug=piece('furniture-kit/rugRectangle','decoration'),anchor=piece('habitat-house','decoration'),chair=piece('furniture-kit/chair','seat',0,1);
  expect(nearestUsableObject({x:0,z:0},[rug,anchor,chair])?.id).toBe(chair.id);
  expect(nearestUsableObject({x:0,z:8},[chair])).toBeUndefined();
 });
 it('sit pose belongs to the selected seat and follows furniture rotation, never another nearer seat',()=>{
  const chair=piece('furniture-kit/chair','seat',2,-2);chair.rotation=Math.PI/2;
  const pose=seatPoseFor(chair);expect(pose.x).toBeCloseTo(2.12);expect(pose.z).toBeCloseTo(-2);expect(pose.angle).toBe(chair.rotation);expect(pose.moving).toBe(false);
 });
 it('door/window/light affordances reflect the real shared state',()=>{
  const window=piece('habitat-house-window','door'),door=piece('habitat-house-door','door'),lamp=piece('ctrl-lamp','light'),chair=piece('ctrl-seat','seat');
  expect(interactionLabel(window,false,false)).toBe('Open window');expect(interactionLabel(window,true,false)).toBe('Close window');
  expect(interactionLabel(door,false,false)).toBe('Open door');expect(interactionLabel(lamp,true,false)).toBe('Turn off light');
  expect(interactionLabel(chair,false,false)).toBe('Sit down');expect(interactionLabel(chair,false,true)).toBe('Stand up');
 });
});
