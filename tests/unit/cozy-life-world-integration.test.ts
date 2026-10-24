import {describe,it,expect} from 'vitest';
import {createLifeState} from '../../domain/cozy-life';
import {collideHabitatLife} from '../../features/habitat/cozy-life-collision';
import {collideWorld} from '../../features/habitat/types';
const view={beds:createLifeState(0).beds,gardenAnchor:{x:8,z:5},decorations:[]};
describe('physical garden movement integration',()=>{
 it('adds no invisible obstacle to untouched plots',()=>{expect(collideHabitatLife({x:8,z:0},{x:8,z:8},[],{},null)).toEqual(collideWorld({x:8,z:0},{x:8,z:8},[],{}));});
 it('prevents a long frame from walking through raised beds',()=>{const next=collideHabitatLife({x:8,z:0},{x:8,z:10},[],{},view);expect(next.z).toBeLessThan(3.3);});
 it('allows lateral movement beside the beds',()=>{const next=collideHabitatLife({x:11,z:1},{x:11,z:10},[],{},view);expect(next.z).toBeCloseTo(10);});
 it('lets a player exit if a saved garden is placed around them',()=>{const next=collideHabitatLife({x:8,z:5},{x:12,z:5},[],{},view);expect(next.x).toBeGreaterThan(10);});
});
