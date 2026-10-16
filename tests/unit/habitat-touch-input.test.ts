import {describe,it,expect} from 'vitest';
import {createTouchInput} from '@/features/habitat/touch-input';
import type {ControlInput} from '@/features/plaza/scene';
describe('owned touch movement and run contacts',()=>{
 it('releases run independently without stopping a held direction',()=>{
  const input:ControlInput={x:0,z:0},held=createTouchInput(input);held.direction(1,-1,0);held.run(2);
  expect(input).toMatchObject({x:-1,z:0,run:true});held.release(2);expect(input).toMatchObject({x:-1,z:0,run:false});held.release(1);expect(input).toMatchObject({x:0,z:0,run:false});
 });
 it('releases either of two directions without wiping the other',()=>{
  const input:ControlInput={x:0,z:0},held=createTouchInput(input);held.direction(10,-1,0);held.direction(11,0,-1);held.run(12);
  held.release(10);expect(input).toMatchObject({x:0,z:-1,run:true});held.release(10);expect(input.z).toBe(-1);held.release(11);expect(input).toMatchObject({x:0,z:0,run:true});held.release(12);expect(input.run).toBe(false);
 });
 it('clear removes all contacts/jump on blur; old capture-loss cannot clear a new press',()=>{
  const input:ControlInput={x:0,z:0,jump:true},held=createTouchInput(input);held.direction(4,1,0);held.run(5);held.clear();
  expect(input).toEqual({x:0,z:0,run:false,jump:false});held.direction(6,-1,0);held.release(4);held.release(5);expect(input.x).toBe(-1);
 });
});
