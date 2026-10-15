'use client';
import {useMemo,useEffect,useState,type MutableRefObject} from 'react';
import type {Pose} from '@/features/plaza/types';
import type {WorldState} from './types';
import {TOWN_ACTIVITIES,TOWN_DISTRICTS,type TownDistrict} from './town-districts';
import TownRegionDressing from './town-region-dressing';
import {TownWindGrass} from './town-stylized-grass';
import TownStylizedWater from './town-stylized-water';
import TownRegionArchitecture from './town-region-architecture';
import {GroundShadow,paintedTexture} from './town-surfaces';
import {HARBOR_WATER} from './town-harbor-geography';
import {TownAsset} from './town-assets';
import {CanvasTexture,SRGBColorSpace} from 'three';
import {TOWN_ROAD_CONNECTIONS} from '@/domain/town-terrain';
import TownGround from './town-ground';
import {FESTIVAL_DECK} from '@/domain/town-walk-surface';
import TownActivityCounter from './town-activity-counter';

/** Larger physical map composed of separately visible districts; not background billboards. */
type Quality='low'|'high';
function ScenicRoad({ax,az,bx,bz,width=4.8}:{ax:number;az:number;bx:number;bz:number;width?:number}){
 const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);
 const texture=useMemo(()=>paintedTexture('stone'),[]);
 return <group position={[(ax+bx)/2,.024,(az+bz)/2]} rotation-y={Math.atan2(dx,dz)}>
  <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={[width,length]}/><meshStandardMaterial color='#d8bea0' roughness={1}/></mesh>
  <mesh rotation-x={-Math.PI/2} position-y={.009}><planeGeometry args={[width*.72,length]}/><meshStandardMaterial color='#ead3b4' map={texture} roughness={1}/></mesh>
 </group>;
}
function ActivityStation({type,x,z,usedAt,cooldownMs}:{type:string;x:number;z:number;usedAt:number;cooldownMs:number}){
 const [now,setNow]=useState(0);
 const sign=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Cannot draw town station sign');
  ctx.fillStyle='#f2e0b9';ctx.fillRect(0,0,512,256);ctx.fillStyle='#354a3e';ctx.font='bold 68px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(({ 'community-garden':'Garden','neighborhood-post':'Post','harbor-cleanup':'Harbor','artisan-project':'Workshop','festival-stage':'Stage','orchard-harvest':'Orchard'} as Record<string,string>)[type]??'Town',256,128);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
 },[type]);
 useEffect(()=>()=>sign.dispose(),[sign]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),950);return()=>clearInterval(t);},[]);
 const recent=usedAt>0&&now-usedAt<cooldownMs;
 const base=recent?'#95b98c':type==='community-garden'?'#839d74':type==='harbor-cleanup'?'#82acb3':type==='festival-stage'?'#cb967d':'#bea786';
 return <group position={[x+2.4,0,z]}>
  <GroundShadow width={4.2} depth={4.2}/>
  <mesh receiveShadow position-y={.01}><cylinderGeometry args={[2.3,2.3,.02,12]}/><meshStandardMaterial color={base}/></mesh>
  <TownActivityCounter type={type}/>
  {[-.55,.55].map(px=><group key={px} position={[px,1.02,0]}>
   <TownAsset id={type==='community-garden'?'nature-kit/pot_small':type==='harbor-cleanup'?'furniture-kit/trashcan':'platformer-kit/crate'} size={.48}/>
   {type==='orchard-harvest'&&usedAt>0&&<TownAsset id='food-kit/apple' size={.23} y={.4}/>}
  </group>)}
  {recent&&Array.from({length:8},(_,i)=><mesh key={i} position={[Math.sin(i*Math.PI/4)*1.75,.5+Math.abs(Math.sin(i*2))*1.6,Math.cos(i*Math.PI/4)*1.75]}><icosahedronGeometry args={[.18,0]}/><meshBasicMaterial color={i%2?'#f2cf8e':'#e7b1ba'}/></mesh>)}
  <mesh position-y={2.35}><cylinderGeometry args={[.055,.055,2,6]}/><meshStandardMaterial color='#88725e'/></mesh>
  <mesh position={[.55,3.2,0]}><boxGeometry args={[1.25,.55,.12]}/><meshStandardMaterial color='#f2e0b9'/></mesh>
  <mesh position={[.55,3.2,.066]}><planeGeometry args={[1.21,.51]}/><meshBasicMaterial map={sign} toneMapped={false}/></mesh>
 </group>;
}
function FestivalPlatform({x,z}:{x:number;z:number}){
 return <group position={[x,0,z-25]}>
  <mesh castShadow position-y={.4}><boxGeometry args={[16,.8,10]}/><meshStandardMaterial color='#ba856a'/></mesh>
  <mesh receiveShadow position={[0,.4,7]} rotation-x={-Math.PI/2+Math.atan(FESTIVAL_DECK.height/FESTIVAL_DECK.rampLength)}><planeGeometry args={[5.2,Math.hypot(4,.8)]}/><meshStandardMaterial color='#d8b78e' side={2}/></mesh>
  {[-8,8].map(side=><group key={side} position={[side,.8,0]}><mesh position-y={.7}><boxGeometry args={[.08,.12,10]}/><meshStandardMaterial color='#7d8665'/></mesh>{[-5,0,5].map(p=><mesh key={p} position={[0,.35,p]}><boxGeometry args={[.1,.7,.1]}/><meshStandardMaterial color='#7d8665'/></mesh>)}</group>)}
  <mesh position={[0,1.5,-5]}><boxGeometry args={[16,.12,.08]}/><meshStandardMaterial color='#7d8665'/></mesh>
  {[-5.3,5.3].map(side=><group key={side}><mesh position={[side,1.5,5]}><boxGeometry args={[5.4,.12,.08]}/><meshStandardMaterial color='#7d8665'/></mesh>{[-2.6,2.6].map(p=><mesh key={p} position={[side+p,1.15,5]}><boxGeometry args={[.1,.7,.1]}/><meshStandardMaterial color='#7d8665'/></mesh>)}</group>)}
  {[-6,6].map(v=><mesh key={v} castShadow position={[v,4,-4]}><boxGeometry args={[.45,7.5,.45]}/><meshStandardMaterial color='#7d8665'/></mesh>)}
  <mesh position={[0,7.5,-4]}><boxGeometry args={[14,.5,.5]}/><meshStandardMaterial color='#f3ddae'/></mesh>
  {[-4,0,4].map(v=><mesh key={v} position={[v,7.0,-3.95]}><coneGeometry args={[1.3,1.7,3]}/><meshStandardMaterial color='#dfb58a'/></mesh>)}
 </group>;
}
function RemoteZone({district,quality,pose,states}:{district:TownDistrict;quality:Quality;pose:MutableRefObject<Pose>;states:WorldState['states']}){
 const [visible,setVisible]=useState(()=>Math.hypot(pose.current.x-district.x,pose.current.z-district.z)<82);
 useEffect(()=>{const timer=setInterval(()=>setVisible(Math.hypot(pose.current.x-district.x,pose.current.z-district.z)<90),200);return()=>clearInterval(timer);},[pose,district]);
 const activity=TOWN_ACTIVITIES.find(a=>a.district===district.id);
 if(!visible)return null;
 return <group>
  {/* Each region has its own through-street, not just scenic facades. */}
  <ScenicRoad ax={district.x-48} az={district.z} bx={district.x+48} bz={district.z} width={5.2}/>
  <ScenicRoad ax={district.x} az={district.z-44} bx={district.x} bz={district.z+44} width={4.4}/>
  <TownRegionArchitecture district={district.id}/>
  <TownRegionDressing district={district.id} quality={quality}/>
  <TownWindGrass district={district} quality={quality}/>
  {activity&&<ActivityStation x={activity.x} z={activity.z} type={activity.id} usedAt={states[activity.objectId]?.usedAt??0} cooldownMs={activity.cooldownMs}/>}
  {district.id==='festival'&&<FestivalPlatform x={district.x} z={district.z}/>}
  {district.id==='harbor'&&<group position={[district.x,0,district.z+20]}>
    <group position-x={HARBOR_WATER.bridgeX-district.x}>
     <mesh position-y={.033} receiveShadow><boxGeometry args={[4.8,.06,14]}/><meshStandardMaterial color='#c1a17c'/></mesh>
     {[-2.4,2.4].map(side=><group key={side} position-x={side}><mesh position-y={.85}><boxGeometry args={[.08,.09,14]}/><meshStandardMaterial color='#9b8869'/></mesh>{[-6,-3,0,3,6].map(z=><mesh key={z} position={[0,.45,z]}><boxGeometry args={[.09,.9,.09]}/><meshStandardMaterial color='#9b8869'/></mesh>)}</group>)}
    </group>
    <TownStylizedWater x={0} y={.015} z={0} width={95} depth={13}/>
    {[-21,-7,7,21].map((x,i)=><group key={x}>
      <mesh castShadow position={[x,.033,3]}><boxGeometry args={[4,.06,19]}/><meshStandardMaterial color='#d7b996' emissive='#624d36' emissiveIntensity={.16}/></mesh>
      {[-5,0,5].map(z=><group key={z}>
        <mesh castShadow position={[x-1.8,-.65,z+3]}><cylinderGeometry args={[.17,.17,1.9,7]}/><meshStandardMaterial color='#9e806b'/></mesh>
        <mesh castShadow position={[x+1.8,-.65,z+3]}><cylinderGeometry args={[.17,.17,1.9,7]}/><meshStandardMaterial color='#9e806b'/></mesh>
      </group>)}
      <group position={[x,i%2===0?0:0,12]}>
        <mesh castShadow position={[0,.52,0]}><boxGeometry args={[2.7,.65,4.3]}/><meshStandardMaterial color={i%2?'#ecc7ad':'#e0d8bc'}/></mesh>
        <mesh castShadow position={[0,1.15,0]} rotation-z={i%2?.08:-.06}><boxGeometry args={[3.3,.14,4.7]}/><meshStandardMaterial color={i%2?'#b37c71':'#86aaa0'}/></mesh>
        <mesh position={[0,2.55,0]}><cylinderGeometry args={[.05,.05,3,6]}/><meshStandardMaterial color='#bda183'/></mesh>
        <mesh position={[.1,2.45,0]} rotation-y={Math.PI/2}><coneGeometry args={[1.3,2.2,3]}/><meshStandardMaterial color='#fff1d3' side={2}/></mesh>
      </group>
    </group>)}
    {[-35,-27,-12,1,17,30,38].map((x,i)=><group key={x} position={[x,.04,-7.5]}>
      <mesh position-y={.7} castShadow><cylinderGeometry args={[.12,.15,1.4,6]}/><meshStandardMaterial color='#856e58'/></mesh>
      <mesh position-y={1.58}><sphereGeometry args={[.3,8,6]}/><meshBasicMaterial color={i%2===0?'#ffe3a6':'#ffd0b5'}/></mesh>
    </group>)}
  </group>}
  {district.id==='garden'&&[-16,16].map(x=><group key={x} position={[district.x+x,0,district.z+20]}>
    <mesh position-y={.32}><cylinderGeometry args={[6,6,.32,16]}/><meshStandardMaterial color='#e0bc8e'/></mesh>
    {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*4.2,.65,Math.cos(i*2.4)*4.2]}>
      <icosahedronGeometry args={[.65,0]}/><meshStandardMaterial color={i%2?'#e3a2a2':'#f0d08a'}/></mesh>)}
  </group>)}
 </group>;
}
/** Static links are always drawn; remote scenery is visibility-culled per player's current position. */
export default function TownExpandedDistricts({pose,quality,states}:{pose:MutableRefObject<Pose>;quality:Quality;states:WorldState['states']}){
 return <group>
  <TownGround/>
  {TOWN_ROAD_CONNECTIONS.map(([ax,az,bx,bz],i)=><ScenicRoad key={i} ax={ax} az={az} bx={bx} bz={bz}/>)}
  {TOWN_DISTRICTS.filter(d=>d.id!=='center').map(d=><RemoteZone key={d.id} district={d} quality={quality} pose={pose} states={states}/>)}
 </group>;
}
