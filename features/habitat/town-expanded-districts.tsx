'use client';
import {useMemo,useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {InstancedMesh,Matrix4,Color,Group} from 'three';
import type {Pose} from '@/features/plaza/types';
import {TOWN_ACTIVITIES,TOWN_DISTRICTS,TOWN_DISTRICT_BUILDINGS,type TownDistrict,type TownDistrictBuilding} from './town-districts';
import {TownAssetInstances} from './town-assets';

/** Larger physical map composed of separately visible districts; not background billboards. */
type Quality='low'|'high';
function ScenicRoad({ax,az,bx,bz,width=4.8}:{ax:number;az:number;bx:number;bz:number;width?:number}){
 const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);
 return <group position={[(ax+bx)/2,.024,(az+bz)/2]} rotation-y={Math.atan2(dx,dz)}>
  <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={[width,length]}/><meshStandardMaterial color='#d8bea0' roughness={1}/></mesh>
  <mesh rotation-x={-Math.PI/2} position-y={.009}><planeGeometry args={[width*.72,length]}/><meshStandardMaterial color='#ead3b4' roughness={1}/></mesh>
 </group>;
}
const CONNECTIONS=[
 [0,9,78,9],[78,9,78,27],[0,22,-75,22],[-75,22,-75,46],
 [-1.5,-29,-1.5,-76],[-32,-12,-75,-12],[-75,-12,-75,-52],
 [78,27,76,80],[78,27,78,-73],[0,-76,78,-76],[0,34,0,98],
] as const;
function DistrictCottage({site}:{site:TownDistrictBuilding}){
 const {width:w,depth:d,levels,roof,wall}=site;
 return <group position={[site.x,0,site.z]}>
  <mesh castShadow receiveShadow position-y={levels===3?3.4:2.5}><boxGeometry args={[w,levels===3?6.8:5,d]}/><meshStandardMaterial color={wall} roughness={1}/></mesh>
  {[-1,1].map(side=><mesh castShadow key={side} rotation-z={side*.47} position={[side*w*.26,levels===3?7.35:5.48,0]}>
   <boxGeometry args={[w*.59,.25,d+.65]}/><meshStandardMaterial color={roof} roughness={1}/></mesh>)}
  <mesh position={[0,1.26,d/2+.14]}><boxGeometry args={[1,2.35,.22]}/><meshStandardMaterial color='#789e90'/></mesh>
  {[-w*.27,w*.27].map(x=><group key={x}>
    <mesh position={[x,2.4,d/2+.12]}><boxGeometry args={[1.05,1.2,.14]}/><meshStandardMaterial color='#e9f1d4' emissive='#f4d5a1' emissiveIntensity={.12}/></mesh>
    <mesh position={[x,2.4,d/2+.23]}><boxGeometry args={[.08,1.23,.08]}/><meshStandardMaterial color='#e6d9c3'/></mesh>
    <mesh position={[x,1.68,d/2+.27]}><boxGeometry args={[1.25,.12,.4]}/><meshStandardMaterial color='#bd9f7b'/></mesh>
  </group>)}
  <mesh position={[0,.12,d/2+1.1]} receiveShadow><boxGeometry args={[2.5,.14,2.1]}/><meshStandardMaterial color='#cbb395'/></mesh>
 </group>;
}
function DistrictTrees({district,quality}:{district:TownDistrict;quality:Quality}){
 const places=useMemo(()=>{
  const count=quality==='high'?24:12;
  return Array.from({length:count},(_,i)=>{
   const angle=i*2.3999,ring=25+(i%5)*6;
   return {x:district.x+Math.sin(angle)*ring,z:district.z+Math.cos(angle)*ring,yaw:angle,size:3.7+i%4*.4};
  }).filter(p=>!TOWN_DISTRICT_BUILDINGS.some(h=>Math.hypot(p.x-h.x,p.z-h.z)<6));
 },[district,quality]);
 return <TownAssetInstances id='nature-kit/tree_detailed' placements={places} castShadow={quality==='high'}/>;
}
function ActivityStation({type,x,z}:{type:string;x:number;z:number}){
 const base=type==='community-garden'?'#839d74':type==='harbor-cleanup'?'#82acb3':type==='festival-stage'?'#cb967d':'#bea786';
 return <group position={[x,0,z]}>
  <mesh receiveShadow position-y={.09}><cylinderGeometry args={[2.3,2.3,.18,12]}/><meshStandardMaterial color={base}/></mesh>
  <mesh castShadow position-y={.6}><boxGeometry args={[1.8,.8,1.3]}/><meshStandardMaterial color='#cfb28e'/></mesh>
  {[-.55,.55].map(px=><mesh key={px} position={[px,1.14,0]} castShadow>
    <icosahedronGeometry args={[.38,1]}/><meshStandardMaterial color={type==='community-garden'||type==='orchard-harvest'?'#dfab8c':'#f0d8aa'} roughness={1}/>
  </mesh>)}
  <mesh position-y={2.35}><cylinderGeometry args={[.055,.055,2,6]}/><meshStandardMaterial color='#88725e'/></mesh>
  <mesh position={[.55,3.2,0]}><boxGeometry args={[1.25,.55,.12]}/><meshStandardMaterial color='#f2e0b9'/></mesh>
 </group>;
}
function FestivalPlatform({x,z}:{x:number;z:number}){
 return <group position={[x,0,z-25]}>
  <mesh castShadow position-y={.4}><boxGeometry args={[16,.8,10]}/><meshStandardMaterial color='#ba856a'/></mesh>
  {[-6,6].map(v=><mesh key={v} castShadow position={[v,4,-4]}><boxGeometry args={[.45,7.5,.45]}/><meshStandardMaterial color='#7d8665'/></mesh>)}
  <mesh position={[0,7.5,-4]}><boxGeometry args={[14,.5,.5]}/><meshStandardMaterial color='#f3ddae'/></mesh>
  {[-4,0,4].map(v=><mesh key={v} position={[v,7.0,-3.95]}><coneGeometry args={[1.3,1.7,3]}/><meshStandardMaterial color='#dfb58a'/></mesh>)}
 </group>;
}
function RemoteZone({district,quality,pose}:{district:TownDistrict;quality:Quality;pose:MutableRefObject<Pose>}){
 const root=useRef<Group>(null);
 useFrame(()=>{if(root.current)root.current.visible=Math.hypot(pose.current.x-district.x,pose.current.z-district.z)<77;});
 const houses=TOWN_DISTRICT_BUILDINGS.filter(h=>h.district===district.id);
 const activity=TOWN_ACTIVITIES.find(a=>a.district===district.id);
 return <group ref={root}>
  <mesh rotation-x={-Math.PI/2} position={[district.x,-.082,district.z]} receiveShadow>
   <planeGeometry args={[110,105]}/><meshStandardMaterial color={district.id==='harbor'?'#b6cfc2':district.id==='garden'||district.id==='orchard'?'#a3c18b':'#b6c79a'} roughness={1}/></mesh>
  {/* Each region has its own through-street, not just scenic facades. */}
  <ScenicRoad ax={district.x-48} az={district.z} bx={district.x+48} bz={district.z} width={5.2}/>
  <ScenicRoad ax={district.x} az={district.z-44} bx={district.x} bz={district.z+44} width={4.4}/>
  {houses.map(h=><DistrictCottage key={h.id} site={h}/>)}
  <DistrictTrees district={district} quality={quality}/>
  {activity&&<ActivityStation x={activity.x} z={activity.z} type={activity.id}/>}
  {district.id==='festival'&&<FestivalPlatform x={district.x} z={district.z}/>}
  {district.id==='harbor'&&<group position={[district.x,0,district.z+20]}>
    <mesh position-y={.015} rotation-x={-Math.PI/2}><planeGeometry args={[95,13]}/><meshStandardMaterial color='#86b9c1' roughness={.2}/></mesh>
    {[-21,-7,7,21].map(x=><mesh key={x} position={[x,.2,3]}><boxGeometry args={[4,.42,17]}/><meshStandardMaterial color='#b6926d'/></mesh>)}
  </group>}
  {district.id==='garden'&&[-16,16].map(x=><group key={x} position={[district.x+x,0,district.z+20]}>
    <mesh position-y={.32}><cylinderGeometry args={[6,6,.32,16]}/><meshStandardMaterial color='#e0bc8e'/></mesh>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*4.2,.65,Math.cos(i*2.4)*4.2]}>
      <icosahedronGeometry args={[.65,0]}/><meshStandardMaterial color={i%2?'#e3a2a2':'#f0d08a'}/></mesh>)}
  </group>)}
 </group>;
}
/** Static links are always drawn; remote scenery is visibility-culled per player's current position. */
export default function TownExpandedDistricts({pose,quality}:{pose:MutableRefObject<Pose>;quality:Quality}){
 return <group>
  <mesh rotation-x={-Math.PI/2} position-y={-.13} receiveShadow><planeGeometry args={[248,228]}/><meshStandardMaterial color='#a7c395' roughness={1}/></mesh>
  {CONNECTIONS.map(([ax,az,bx,bz],i)=><ScenicRoad key={i} ax={ax} az={az} bx={bx} bz={bz}/>)}
  {TOWN_DISTRICTS.filter(d=>d.id!=='center').map(d=><RemoteZone key={d.id} district={d} quality={quality} pose={pose}/>)}
 </group>;
}
