import {describe,it,expect} from 'vitest';
import {grassSamples,meadowPoint,pathDistance} from '@/features/worldgacha/ghibli-layout';
import {GRASS_VERTEX,GRASS_FRAGMENT,CANOPY_VERTEX,CANOPY_FRAGMENT} from '@/features/worldgacha/ghibli-shaders';
describe('Ghibli visual integration',()=>{
 it('reclaims the oversized bare plaza edges for meadow while retaining the fountain square',()=>{expect(meadowPoint(6,6)).toBe(true);expect(meadowPoint(0,0)).toBe(false);});
 it('terminates shader include directives before GLSL closing braces',()=>{for(const shader of [GRASS_VERTEX,GRASS_FRAGMENT,CANOPY_VERTEX,CANOPY_FRAGMENT]){expect(shader).not.toMatch(/#include\s+<[^>]+>[ \t]*\}/);}});
 it('scatters deterministic grass away from paths, buildings and activity obstacles',()=>{const a=grassSamples(6500);expect(a).toHaveLength(6500);expect(a).toEqual(grassSamples(6500));for(const p of a){expect(meadowPoint(p.x,p.z)).toBe(true);expect(pathDistance(p.x,p.z)).toBeGreaterThanOrEqual(.4);expect(p.height).toBeGreaterThan(0);}});
 it('keeps the central square and main walkways free of meadow',()=>{for(const [x,z]of [[0,16],[0,-5],[5,-3],[-4,2]])expect(meadowPoint(x,z)).toBe(false);});
});
