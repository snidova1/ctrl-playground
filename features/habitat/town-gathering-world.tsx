'use client';
import type {TownGathering} from '@/domain/town-gatherings';
import {TownAssetInstances} from './town-assets';
export default function TownGatheringWorld({events,worldId}:{events:TownGathering[];worldId:string}){
 return <group>{events.filter(e=>e.worldId===worldId).map(e=><group key={e.id} position={[e.x,0,e.z]}>
  {e.kind==='picnic'?<><mesh rotation-x={-Math.PI/2} position-y={.018} receiveShadow><planeGeometry args={[3.2,2.4]}/><meshStandardMaterial color='#d6b49c'/></mesh>{[-1,0,1].map(i=><mesh key={i} position={[i*.8,.03,0]} rotation-x={-Math.PI/2}><planeGeometry args={[.25,2.4]}/><meshStandardMaterial color='#eee0c3'/></mesh>)}<TownAssetInstances id='food-kit/croissant' placements={[{x:.4,z:0,y:.08,size:.7},{x:-.4,z:.3,y:.08,size:.7}]}/></>:<mesh rotation-x={-Math.PI/2} position-y={.018}><ringGeometry args={[2.2,2.3,40]}/><meshStandardMaterial color={e.kind==='dance'?'#d9aa8c':'#98b1a1'}/></mesh>}
 </group>)}</group>;
}
