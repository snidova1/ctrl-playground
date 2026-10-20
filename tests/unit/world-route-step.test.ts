import {describe,it,expect} from 'vitest';
import {nextWorldPathPoint,type GroundPoint} from '../../features/worldgacha/navigation';
const point=(x:number):GroundPoint=>({x,y:0,z:0});
describe('world route frame advancement',()=>{
 it('moves toward the next cell in the same frame as reaching the previous cell',()=>{const route=[point(0),point(.5)];expect(nextWorldPathPoint(route,point(0))).toEqual(point(.5));expect(route).toEqual([point(.5)]);});
 it('discards all already-reached points without idle frames',()=>{const route=[point(0),point(.01),point(.5)];expect(nextWorldPathPoint(route,point(0))).toEqual(point(.5));});
 it('retains an unreached target and handles completed routes',()=>{const route=[point(.5)];expect(nextWorldPathPoint(route,point(0))).toEqual(point(.5));expect(route).toHaveLength(1);expect(nextWorldPathPoint([],point(0))).toBeUndefined();});
});
