'use client';
import {Text} from '@react-three/drei';
import type {TownLifeState} from '@/domain/town';
import {getTownRoute,TOWN_WORK_SITES} from '@/domain/town-routes';
import {TownAssetInstances} from './town-assets';

// All cleaned/tended states come from server receipts and are observed by peers.
export default function TownRouteWorld({town,x,z}:{town:TownLifeState;x:number;z:number}){
 const route=town.route&&getTownRoute(town.route.routeId),current=route?.stops[town.route!.step];
 return <group>{TOWN_WORK_SITES.filter(s=>Math.hypot(x-s.x,z-s.z)<65).map(site=>{
  const saved=town.visits.some(v=>v.siteId===site.id),active=site.id===current;
  const color=saved?'#a8c69a':'#d7b78d';
  return <group key={site.id} position={[site.x,0,site.z]}>
   {active&&<><mesh rotation-x={-Math.PI/2} position-y={.04}><ringGeometry args={[1.45,1.65,32]}/><meshBasicMaterial color='#d49b46'/></mesh><Text position={[0,2.35,0]} fontSize={.22} maxWidth={3} color='#463c31' anchorY='bottom'>{site.verb}</Text></>}
   {site.kind==='mail'?<group position={[1,.65,0]}><mesh position-y={-.3}><boxGeometry args={[.09,.7,.09]}/><meshStandardMaterial color='#9f8261'/></mesh><mesh position-y={.25}><boxGeometry args={[.5,.3,.3]}/><meshStandardMaterial color='#94b3af'/></mesh><mesh position={[.28,saved?.45:.25,0]}><boxGeometry args={[.03,.22,.18]}/><meshStandardMaterial color='#ca8873'/></mesh></group>:
    site.kind==='hedge'?<TownAssetInstances id='nature-kit/plant_bushSmall' placements={[-1,0,1].map(i=>({x:i*.65,z:1.2,y:0,size:saved?.6:1.1}))}/>:
    site.kind==='flowers'?<TownAssetInstances id='nature-kit/flower_yellowB' placements={[-1,0,1].map(i=>({x:i*.4,z:1.3,y:0,size:saved?.7:.3}))}/>:
    site.kind==='grass'?<mesh rotation-x={-Math.PI/2} position-y={.012}><circleGeometry args={[1.35,20]}/><meshStandardMaterial color={saved?'#99b57e':'#849b66'}/></mesh>:
    site.kind==='fruit'||site.kind==='wood'?<mesh position={[1.3,.2,1.3]}><boxGeometry args={[.6,saved?.55:.25,.6]}/><meshStandardMaterial color={color}/></mesh>:
    !saved&&[-1,0,1].map(i=><mesh key={i} position={[i*.35,.025,1.2+i*.2]} rotation-y={i*.8}><boxGeometry args={[.25,.04,.17]}/><meshStandardMaterial color={site.kind==='leaves'?'#c29a65':site.kind==='road'?'#a29176':'#d6c6ac'}/></mesh>)}
  </group>;
 })}</group>;
}
