import {describe,it,expect} from 'vitest';
import {getPlacementShortcut,placementHeading} from '../../features/habitat/placement-shortcuts';
const event=(code:string,extra={})=>({code,repeat:false,altKey:false,ctrlKey:false,metaKey:false,...extra});
describe('placement keyboard safety',()=>{
 it('confirms only a currently valid placement',()=>{expect(getPlacementShortcut(event('Enter'),false,true)).toBe('place');expect(getPlacementShortcut(event('Enter'),false,false)).toBe(null);});
 it('rotates and cancels without requiring a valid target',()=>{expect(getPlacementShortcut(event('KeyR'),false,false)).toBe('rotate');expect(getPlacementShortcut(event('Escape'),false,false)).toBe('cancel');});
 it('never captures editor controls or repeated/modifier shortcuts',()=>{for(const code of ['Enter','Escape','KeyR']){expect(getPlacementShortcut(event(code),true,true)).toBe(null);for(const flag of ['repeat','altKey','ctrlKey','metaKey'])expect(getPlacementShortcut(event(code,{[flag]:true}),false,true)).toBe(null);}});
 it('shows a stable wrapped compass heading',()=>{expect(placementHeading(0)).toBe(0);expect(placementHeading(Math.PI/4)).toBe(45);expect(placementHeading(-Math.PI/2)).toBe(270);expect(placementHeading(2*Math.PI)).toBe(0);});
});
