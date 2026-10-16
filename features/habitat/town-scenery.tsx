'use client';
import {TOWN_PLANTING_MODELS} from './town-planting-models';
import {TOWN_PALETTE as P} from './town-palette';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import TownSign from './town-sign';
import {TownGardens} from './town-gardens';
import {paintedTexture,TownFootShadow,TreeContactShadows} from './town-surfaces';
import {Group,Object3D} from 'three';
import {TownAssetInstances} from './town-assets';
import {TownHouse,MarketFront} from './town-architecture';
import {TownDailyProps} from './town-daily-props';
import {TownPaving,FountainInlay} from './town-paving';
import {TownFountain,CanalBoat} from './town-waterfront';
import {TOWN_HILLS} from './town-terrain';
import {townSurfaceHeight as townGroundHeight} from '@/domain/town-walk-surface';
import {createCharacterMotion,resolveCharacter,seededAppearance} from '@/features/plaza/characters/catalog';
import VrmAvatar from '@/features/plaza/characters/vrm-avatar';
import type {Pose} from '@/features/plaza/types';
import type {WorldState} from './types';
import type {MutableRefObject} from 'react';
import TownExpandedDistricts from './town-expanded-districts';
import TownStylizedWater from './town-stylized-water';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_BRIDGES,PUBLIC_WORLD_BRIDGE} from './public-world-geography';
import {nearbyResidents,residentPose,TOWN_RESIDENT_NAMES} from './town-residents';
import {townCenterDetailed} from './town-lod';
import {assignOcclusionTarget} from './town-occlusion';

/** An authored neighborhood made from reusable, lightweight Three geometry.
 * This is visual scenery, not player-created Habitat objects or fake online users.
 * All walkable geography matches public-world-geography.ts server/client collision.
 */
const ROADS=[
 {x:0,z:12,w:5.2,d:39},         // south promenade into the central plaza
 {x:0,z:-11.9,w:5.2,d:10},       // waterfront connection
 {x:0,z:-26.5,w:5.2,d:9},       // beyond the west bridge
 {x:20,z:-11.9,w:4.5,d:10},      // east bridge approach
 {x:20,z:-26.5,w:4.5,d:9},
 {x:0,z:9,w:64,d:4.6},         // lively east-west shopping street
 {x:0,z:-13.4,w:64,d:3.2},     // quay
 {x:-23,z:12,w:3.2,d:36},      // bakery quarter
 {x:23,z:12,w:3.2,d:36},       // makers quarter
 {x:0,z:28,w:54,d:3.2},       // park loop
] as const;
const LAMPS:[number,number][]= [
 [-15,9],[-7,9],[7,9],[15,9],[-27,9],[27,9],
 [-24,-12],[-12,-12],[12,-12],[25,-12],
 [-3,23],[3,23],[-20,28],[20,28],
];
const leafSeeds=[...Array.from({length:72},(_,i)=>{
 const side=i%4;
 const p=i%18;
 const x=side<2?(side===0?-37:37):(-39+p*4.5);
 const z=side<2?(-36+p*4.2):(side===2?-39:38);
 return {x:x+Math.sin(i*19)*1.6,z:z+Math.cos(i*23)*2.4,h:3+(i%5)*.7};
}),...[[-11,-6],[11,-6],[-12,8],[12,8],[-4,-7],[4,-7]].map(([x,z])=>({x,z,h:4.1}))];
function GreenBorder({quality}:{quality:'low'|'high'}){
 const selected=useMemo(()=>(quality==='low'?leafSeeds.filter((_,i)=>i>=72||i%2===0):leafSeeds).map((p,i)=>({x:p.x,z:p.z,y:townGroundHeight(p.x,p.z),size:p.h,yaw:i*.73})),[quality]);
 return <group><TreeContactShadows trees={selected}/>{TOWN_PLANTING_MODELS.center.map((id,index,models)=><TownAssetInstances key={id} id={id} placements={selected.filter((_,i)=>i%models.length===index)} castShadow={quality==='high'}/>)}</group>;
}
function RaisedGround(){
 const quays=useMemo(()=>{
  const edges=[-37.5,...PUBLIC_WORLD_BRIDGES.flatMap(b=>[b.x-PUBLIC_WORLD_BRIDGE.halfWidth,b.x+PUBLIC_WORLD_BRIDGE.halfWidth]),37.5];
  return edges.filter((_,i)=>i%2===0).map((x,i)=>({x:(x+edges[i*2+1])/2,width:edges[i*2+1]-x}));
 },[]);
 return <>
  <TownStylizedWater x={0} y={-.065} z={-19.5} width={78} depth={5}/>
  {/* Both quays have visible stone retaining walls and a safe road behind them. */}
  {[-16.7,-22.3].flatMap(z=>quays.map(quay=><group key={`${z}:${quay.x}`}>
   <mesh position={[quay.x,-.05,z]} receiveShadow><boxGeometry args={[quay.width,.38,.65]}/><meshStandardMaterial color='#c9b9a0'/></mesh>
   <mesh position={[quay.x,.14,z]}><boxGeometry args={[quay.width,.09,.18]}/><meshStandardMaterial color='#eee1cb'/></mesh>
  </group>))}
  {ROADS.map((road,i)=><TownPaving key={i} x={road.x} z={road.z} w={road.w} d={road.d}/>)}
  {/* A clear, generous market square in the middle of the town. */}
  <TownPaving x={0} z={1.5} w={15.6} d={15.6} round height={.025}/>
  {/* Slightly raised riverside grass behind the cottages makes the silhouette non-flat. */}
  {TOWN_HILLS.map(([x,z,w,h],i)=>
   <mesh key={i} position={[x,-h*.32,z]} scale={[w,h,w*.6]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={i%2?P.shutter:P.sage} roughness={1}/></mesh>)}
  {/* The old z=-66 ridge crossed the expanded Harbor and occluded its camera. */}
  {[-55,-37,-18,5,25,49].map((x,i)=>
   <mesh key={i} position={[x,-7,-154]} scale={[20,14+(i%3)*3,14]}><sphereGeometry args={[1,16,10]}/><meshStandardMaterial color={i%2?P.shutter:P.grass} roughness={1}/></mesh>)}
 </>;
}
function Bridge({x}:{x:number}){
 const grain=useMemo(()=>paintedTexture('wood'),[]);
 return <group position={[x,0,-19.5]}>
  <mesh position-y={-.14} receiveShadow castShadow><boxGeometry args={[PUBLIC_WORLD_BRIDGE.halfWidth*2,.3,PUBLIC_WORLD_BRIDGE.halfLength*2]}/><meshStandardMaterial color='#a27850'/></mesh>
  {Array.from({length:11},(_,i)=><mesh key={i} position={[0,.045,-3.1+i*.62]}><boxGeometry args={[6.5,.055,.5]}/><meshStandardMaterial color={i%2?P.wood:P.pot} map={grain}/></mesh>)}
  {[-PUBLIC_WORLD_BRIDGE.railX,PUBLIC_WORLD_BRIDGE.railX].map(side=><group key={side}>
   <mesh position={[side,1.15,0]}><boxGeometry args={[.16,.15,6.8]}/><meshStandardMaterial color='#926b4e'/></mesh>
   {[-2.7,-.9,.9,2.7].map(z=><mesh key={z} position={[side,.69,z]}><boxGeometry args={[.16,1.15,.17]}/><meshStandardMaterial color='#987350'/></mesh>)}
  </group>)}
 </group>;
}
function TownLantern({x,z}:{x:number;z:number}){
 return <group position={[x,0,z]}>
  <mesh castShadow position-y={1.55}><cylinderGeometry args={[.065,.1,3.1,7]}/><meshStandardMaterial color={P.forest}/></mesh>
  <mesh position-y={3.22}><boxGeometry args={[.75,.54,.75]}/><meshStandardMaterial color='#f9dba0' emissive='#e6b974' emissiveIntensity={.32}/></mesh>
  {[-.35,.35].flatMap(dx=>[-.35,.35].map(dz=><mesh key={`${dx}:${dz}`} position={[dx,3.22,dz]}><boxGeometry args={[.055,.62,.055]}/><meshStandardMaterial color={P.forest}/></mesh>))}
  <mesh position-y={2.94}><boxGeometry args={[.79,.07,.79]}/><meshStandardMaterial color={P.forest}/></mesh>
  <mesh position-y={3.62}><coneGeometry args={[.57,.46,4]}/><meshStandardMaterial color={P.forest}/></mesh>
 </group>;
}
function LifestyleProps({quality}:{quality:'low'|'high'}){
 return <>{LAMPS.filter((_,i)=>quality==='high'||i%2===0).map(([x,z],i)=><TownLantern key={i} x={x} z={z}/>)}<TownDailyProps/></>;
}
function Resident({index}:{index:number}){
 const appearance=useMemo(()=>seededAppearance('town-resident-'+index,index%2?'male':'female'),[index]);
 const initial=useMemo<Pose>(()=>residentPose(index,0),[index]);
 const [waving,setWaving]=useState(false);
 const wavingRef=useRef(false);
 const [working,setWorking]=useState(0),workingRef=useRef(false);
 const pose=useRef({...initial}),motion=useRef(createCharacterMotion());
 useFrame(()=>{
  const next=residentPose(index,Date.now()/1000);
  Object.assign(pose.current,next);
  if(wavingRef.current!==next.waving){wavingRef.current=next.waving;setWaving(next.waving);}
  if(workingRef.current!==next.working){workingRef.current=next.working;setWorking(next.working?Date.now()+4000:0);}
 });
 return <><TownFootShadow pose={pose}/><VrmAvatar groundAt={townGroundHeight} definition={resolveCharacter(appearance)} appearance={appearance} name={TOWN_RESIDENT_NAMES[index]+' · NPC'} local={false} pose={initial} poseRef={pose} motion={motion} quality='low' sitting={index===1} workUntil={working} celebrate={waving} interactedAt={0} seatLift={0}/></>;
}
function WaterfrontRipples(){
 const water=useRef<Group>(null);
 useFrame(({clock})=>{if(water.current)water.current.position.x=Math.sin(clock.elapsedTime*.3)*.28;});
 return <group ref={water}>{Array.from({length:18},(_,i)=><mesh key={i} rotation-x={-Math.PI/2} position={[-34+i*4,-.058,-18-(i%3)*1.1]}>
  <planeGeometry args={[1.2+(i%3)*.4,.065]}/><meshBasicMaterial color='#d4eeea' transparent opacity={.45} depthWrite={false}/>
 </mesh>)}</group>;
}
export default function TownScenery({quality,onDirectory,pose,states}:{quality:'low'|'high';onDirectory:()=>void;pose:MutableRefObject<Pose>;states:WorldState['states']}){
 const [residents,setResidents]=useState(()=>nearbyResidents(pose.current.x,pose.current.z,quality));
 const empty=useMemo(()=>new Object3D(),[]),directory=useRef(empty);
 const mountDirectory=useCallback((object:Object3D|null)=>assignOcclusionTarget(directory,object,empty),[empty]);
 const [centerDetail,setCenterDetail]=useState(()=>townCenterDetailed(pose.current.x,pose.current.z,false));
 useEffect(()=>{const tick=setInterval(()=>{const next=nearbyResidents(pose.current.x,pose.current.z,quality);setResidents(old=>old.join(',')===next.join(',')?old:next);},500);return()=>clearInterval(tick);},[pose,quality]);
 useEffect(()=>{const tick=setInterval(()=>setCenterDetail(old=>townCenterDetailed(pose.current.x,pose.current.z,old)),500);return()=>clearInterval(tick);},[pose]);
 return <group>
  <TownExpandedDistricts pose={pose} quality={quality} states={states}/>
  <RaisedGround/>
  <WaterfrontRipples/>
  {centerDetail&&<TownGardens quality={quality}/>}
  <GreenBorder quality={quality}/>
  {PUBLIC_WORLD_BRIDGES.map(bridge=><Bridge key={bridge.x} x={bridge.x}/>)}
  {PUBLIC_WORLD_BUILDINGS.map(site=><TownHouse key={site.name} site={site} detailed={centerDetail}/>)}
  {centerDetail&&<><FountainInlay/><TownFountain/>
  <CanalBoat x={-12} color='#b78c70'/><CanalBoat x={12} color='#82a495'/></>}
  <MarketFront x={-8} name='WILLOW CAFÉ' base={P.cream} roof={P.sage} detailed={centerDetail}/>
  <MarketFront x={8} name='FLOWER MARKET' base={P.wall} roof={P.terracotta} detailed={centerDetail}/>
  {centerDetail&&<LifestyleProps quality={quality}/>}
  {/* Existing server-owned models provide the interactable fountain and shops.
      This facade surrounds them with streets, districts and actual landmarks. */}
  {<group visible={centerDetail} ref={mountDirectory} position={[2.4,0,6]}>
   <mesh position-y={.8}><boxGeometry args={[.12,1.6,.12]}/><meshStandardMaterial color='#86745c'/></mesh>
   <mesh position-y={1.65}><boxGeometry args={[1.7,.55,.14]}/><meshStandardMaterial color={P.cream}/></mesh>
   <TownSign visible={centerDetail} occlude={[directory]} position={[0,1.65,.09]} distanceFactor={5} onClick={onDirectory} text='Visit habitats ↗'/>
  </group>}
  {residents.map(i=><Resident key={i} index={i}/>)}
 </group>;
}
