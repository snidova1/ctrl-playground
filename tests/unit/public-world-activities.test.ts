import {describe,it,expect} from 'vitest';
import base from '../../public/worlds/neighborhood/navigation.json';
import {withPublicDistricts} from '../../features/worldgacha/public-districts';
import {groundAt,worldPath} from '../../features/worldgacha/navigation';
import {createNeighborhood,interact,nearestInteraction} from '../../features/worldgacha/neighborhood-state';
import {PUBLIC_ACTIVITIES,standFromSeat} from '../../features/worldgacha/public-world-activities';
const nav=withPublicDistricts(base);
describe('public places have little things to do',()=>{
 it('every activity is reachable without entering a stall or flower bed',()=>{for(const a of PUBLIC_ACTIVITIES){expect(groundAt(nav,a.x,a.z),a.id).not.toBeNull();expect(worldPath(nav,base.spawn,a).length,a.id).toBeGreaterThan(1);}});
 it('nearby prompts are genuinely spatial, not a fake always-on interaction',()=>{const s=createNeighborhood();for(const a of PUBLIC_ACTIVITIES){Object.assign(s.player,{x:a.x,z:a.z});expect(nearestInteraction(s)?.id).toBe(a.id);}Object.assign(s.player,{x:0,z:16});expect(nearestInteraction(s)).toBeNull();});
 it('herb tending visibly changes local state and tea uses actual held-cup action',()=>{const s=createNeighborhood();interact(s,'garden-tend');expect(s.springTended).toBe(true);expect(s.player.action).toBe('garden');interact(s,'market-tea');expect(s.coffees).toBe(1);expect(s.player.action).toBe('coffee');expect(s.publicPulse?.sequence).toBe(2);expect(s.residents).toHaveLength(6);});
 it('bell reactions can be replayed, without adding NPCs or modifying saved profiles',()=>{const s=createNeighborhood();interact(s,'market-bell');expect(s.publicPulse).toMatchObject({id:'market-bell',sequence:1,x:43,z:5.5,until:3});s.time=2;interact(s,'market-bell');expect(s.publicPulse).toMatchObject({sequence:2,until:5});expect(s.residents).toHaveLength(6);expect(s.coffees).toBe(0);});
 it('standing from a garden seat stays in the garden, including movement cancel',()=>{const s=createNeighborhood();interact(s,'garden-rest');expect(s.player.action).toBe('sit');expect(s.player.x).toBe(-39);standFromSeat(s);expect(s.player).toMatchObject({x:-39,z:8.65,action:'idle',moving:false,running:false});expect(groundAt(nav,s.player.x,s.player.z)).not.toBeNull();});
 it('original Willow bench retains its own exit',()=>{const s=createNeighborhood();interact(s,'bench');standFromSeat(s);expect(s.player).toMatchObject({x:-5,z:3,action:'idle'});});
});
