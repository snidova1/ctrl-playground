'use client';
import {TOWN_PROJECTS,type TownProjectState} from '@/domain/town-projects';
import {TownAssetInstances} from './town-assets';

/** Construction is derived exclusively from the server's durable civic stages. */
export default function TownCivicWorld({projects,x,z}:{projects:TownProjectState[];x:number;z:number}){
 return <group>{TOWN_PROJECTS.filter(p=>Math.hypot(x-p.x,z-p.z)<75).map(p=>{
  const stage=projects?.find(s=>s.id===p.id)?.stage??0;
  if(!stage)return null;
  if(p.id==='tidewater-lanterns')return <group key={p.id} position={[p.x,0,p.z]}>
   {[-25,-15,-5,5,15,25].map(dx=><group key={dx} position-x={dx}>
    <mesh position-y={1.45} castShadow><cylinderGeometry args={[.09,.13,2.9,8]}/><meshStandardMaterial color='#786c55'/></mesh>
    <mesh position-y={3.1}><boxGeometry args={[.55,.55,.55]}/><meshStandardMaterial color={stage>=2?'#ffe3a8':'#adc1b2'} emissive='#ffbd59' emissiveIntensity={stage>=2?1:0}/></mesh>
    <mesh position-y={3.5}><coneGeometry args={[.48,.35,4]}/><meshStandardMaterial color='#537566'/></mesh>
   </group>)}
  </group>;
  return <group key={p.id} position={[p.x,0,p.z]}>
   <mesh position-y={.14} receiveShadow><cylinderGeometry args={[5.1,5.1,.28,8]}/><meshStandardMaterial color='#d1b28d'/></mesh>
   {[-3.6,3.6].flatMap(dx=>[-2.7,2.7].map(dz=><mesh key={`${dx}:${dz}`} position={[dx,stage>=2?2:.45,dz]} castShadow><boxGeometry args={[.24,stage>=2?4:.7,.24]}/><meshStandardMaterial color='#b39d73'/></mesh>))}
   {stage>=2&&<>
    <mesh position-y={4.1} castShadow><boxGeometry args={[8.2,.22,6.4]}/><meshStandardMaterial color='#c4b493'/></mesh>
    <mesh position-y={4.6} castShadow><coneGeometry args={[5.8,1.3,4]}/><meshStandardMaterial color='#779281'/></mesh>
    {[-2.5,2.5].map(dx=><group key={dx} position={[dx,.28,0]}><mesh position-y={.28}><boxGeometry args={[1.25,.5,3.7]}/><meshStandardMaterial color='#c7ae86'/></mesh><mesh position={[dx<0?-.5:.5,.72,0]}><boxGeometry args={[.15,.9,3.7]}/><meshStandardMaterial color='#b2a17e'/></mesh></group>)}
   </>}
   {stage>=3&&<TownAssetInstances id='nature-kit/flower_purpleC' placements={Array.from({length:24},(_,i)=>({x:Math.sin(i*Math.PI/12)*6,z:Math.cos(i*Math.PI/12)*6,y:0,size:.7}))}/>}
  </group>;
 })}</group>;
}
