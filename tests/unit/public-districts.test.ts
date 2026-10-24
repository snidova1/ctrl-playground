import {describe,it,expect} from 'vitest';
import base from '../../public/worlds/neighborhood/navigation.json';
import {PUBLIC_DISTRICTS,GARDEN_BEDS,MARKET_STALLS,withPublicDistricts,districtAt} from '../../features/worldgacha/public-districts';
import {groundAt,pointAt,worldPath,moveOnWorld} from '../../features/worldgacha/navigation';
const expanded=withPublicDistricts(base);
describe('connected Public World districts',()=>{
 it('retains every original Recast cell and does not mutate its navigation',()=>{expect(expanded.heights.length).toBe(expanded.width*expanded.depth);for(let i=0;i<base.heights.length;i++){const p=pointAt(base,i);expect(groundAt(expanded,p.x,p.z)).toBe(base.heights[i]);}expect(expanded.heights).not.toBe(base.heights);});
 it('has actual traversable connections from Willow to both additional areas',()=>{for(const d of PUBLIC_DISTRICTS){expect(groundAt(expanded,d.x,d.z)).toBe(0);if(d.id!=='willow-common'){const path=worldPath(expanded,base.spawn,d);expect(path.length).toBeGreaterThan(20);const end=path.at(-1)!;expect(end.x).toBe(d.x);expect(end.z).toBe(d.z);}}expect(expanded.walkableCells).toBeGreaterThan(base.walkableCells);});
 it('blocks solid beds, stalls, and space beyond the authored ground',()=>{for(const [x,z] of [...GARDEN_BEDS,...MARKET_STALLS])expect(groundAt(expanded,x,z)).toBeNull();expect(groundAt(expanded,49,0)).toBeNull();expect(groundAt(expanded,39,14)).toBeNull();const from={x:39,y:0,z:0};expect(moveOnWorld(expanded,from,{x:50,z:0}).x).toBeLessThan(49);});
 it('tracks distinct locations and keeps real scene landmark definitions',()=>{expect(districtAt(-39).id).toBe('spring-garden');expect(districtAt(39).id).toBe('lantern-market');expect(districtAt(0).id).toBe('willow-common');expect(new Set(PUBLIC_DISTRICTS.map(d=>d.id)).size).toBe(3);});
});
