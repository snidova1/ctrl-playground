'use client';
import {TOWN_VENUES} from '@/domain/town-venues';
import {WorkLabel} from './town-route-world';
export default function TownVenueWorld({x,z}:{x:number;z:number}){
 return <group>{TOWN_VENUES.filter(v=>Math.hypot(x-v.x,z-v.z)<65).map(v=><group key={v.id} position={[v.x,0,v.z]}>
  <WorkLabel label={v.name}/>
  <mesh position-y={.025} rotation-x={-Math.PI/2}><ringGeometry args={[.65,.75,24]}/><meshStandardMaterial color='#d4ae78'/></mesh>
 </group>)}</group>;
}
