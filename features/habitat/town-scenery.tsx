'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Object3D} from 'three';
import type {Pose} from '@/features/plaza/types';
import type {WorldState} from './types';
import {createCharacterMotion,resolveCharacter,seededAppearance} from '@/features/plaza/characters/catalog';
import VrmAvatar from '@/features/plaza/characters/vrm-avatar';
import {TownFootShadow,paintedTexture} from './town-surfaces';
import {PUBLIC_WORLD_BRIDGES,PUBLIC_WORLD_BRIDGE} from './public-world-geography';
import {nearbyResidents,residentPose,TOWN_RESIDENT_NAMES} from './town-residents';
import {townCenterDetailed} from './town-lod';
import {assignOcclusionTarget} from './town-occlusion';
import {townSurfaceHeight as townGroundHeight} from '@/domain/town-walk-surface';
import TownSign from './town-sign';
import TownExpandedDistricts from './town-expanded-districts';
import AnimeVillageCenter from './town-anime-village';

/**
 * New PR32 scene orchestrator. Public World gameplay continues to use its
 * unchanged signed position, activity state, interaction and room services.
 * The six outlying regions stay accessible while their future authored visual
 * replacements are built, one region at a time.
 */
function AnimeBridge({x}:{x:number}){
 const grain=useMemo(()=>paintedTexture('wood'),[]);
 return <group position={[x,0,-19.5]}>
  <mesh position-y={-.18} receiveShadow castShadow>
   <boxGeometry args={[PUBLIC_WORLD_BRIDGE.halfWidth*2,.34,PUBLIC_WORLD_BRIDGE.halfLength*2]}/>
   <meshStandardMaterial color='#a48767' map={grain} roughness={1}/>
  </mesh>
  {Array.from({length:12},(_,i)=><mesh key={i} position={[0,.017,-3.14+i*.57]}>
   <boxGeometry args={[6.45,.066,.49]}/>
   <meshStandardMaterial color={i%3===0?'#e8d5af':'#d5bc97'} roughness={1}/>
  </mesh>)}
  {[-PUBLIC_WORLD_BRIDGE.railX,PUBLIC_WORLD_BRIDGE.railX].map(side=><group key={side}>
   <mesh position={[side,1.1,0]}>
    <boxGeometry args={[.16,.17,6.9]}/>
    <meshStandardMaterial color='#8f775c'/></mesh>
   {[-2.7,-.9,.9,2.7].map(z=><mesh key={z} position={[side,.67,z]}>
    <cylinderGeometry args={[.085,.09,1.28,8]}/>
    <meshStandardMaterial color='#947b5b'/></mesh>)}
  </group>)}
 </group>;
}
function LocalResident({index}:{index:number}){
 const appearance=useMemo(()=>seededAppearance('town-resident-'+index,index%2?'male':'female'),[index]);
 const initial=useMemo<Pose>(()=>residentPose(index,0),[index]);
 const [waving,setWaving]=useState(false),wavingRef=useRef(false);
 const [working,setWorking]=useState(0),workingRef=useRef(false);
 const pose=useRef({...initial}),motion=useRef(createCharacterMotion());
 useFrame(()=>{
  const next=residentPose(index,Date.now()/1000);
  Object.assign(pose.current,next);
  if(wavingRef.current!==next.waving){wavingRef.current=next.waving;setWaving(next.waving);}
  if(workingRef.current!==next.working){workingRef.current=next.working;setWorking(next.working?Date.now()+4000:0);}
 });
 return <><TownFootShadow pose={pose}/><VrmAvatar groundAt={townGroundHeight}
  definition={resolveCharacter(appearance)} appearance={appearance}
  name={TOWN_RESIDENT_NAMES[index]+' · NPC'} local={false} pose={initial}
  poseRef={pose} motion={motion} quality='low' sitting={index===1}
  workUntil={working} celebrate={waving} interactedAt={0} seatLift={0}/></>;
}
export default function TownScenery({quality,onDirectory,pose,states}:{
 quality:'low'|'high';onDirectory:()=>void;pose:MutableRefObject<Pose>;states:WorldState['states']
}){
 const [residents,setResidents]=useState(()=>nearbyResidents(pose.current.x,pose.current.z,quality));
 const [centerDetail,setCenterDetail]=useState(()=>townCenterDetailed(pose.current.x,pose.current.z,false));
 const empty=useMemo(()=>new Object3D(),[]),directory=useRef(empty);
 const mount=useCallback((object:Object3D|null)=>assignOcclusionTarget(directory,object,empty),[empty]);
 useEffect(()=>{
  const timer=setInterval(()=>{
   const near=nearbyResidents(pose.current.x,pose.current.z,quality);
   setResidents(old=>old.join(',')===near.join(',')?old:near);
   setCenterDetail(old=>townCenterDetailed(pose.current.x,pose.current.z,old));
  },500);
  return()=>clearInterval(timer);
 },[pose,quality]);
 return <group name="CTRL-Public-World-PR32">
  <TownExpandedDistricts pose={pose} quality={quality} states={states}/>
  {centerDetail&&<AnimeVillageCenter quality={quality}/>}
  {PUBLIC_WORLD_BRIDGES.map(bridge=><AnimeBridge key={bridge.x} x={bridge.x}/>)}
  <group visible={centerDetail} ref={mount} position={[2.4,0,6]}>
   <mesh position-y={.8}><cylinderGeometry args={[.08,.1,1.6,7]}/>
    <meshStandardMaterial color='#8b745d'/></mesh>
   <mesh position-y={1.66}><boxGeometry args={[1.85,.58,.16]}/>
    <meshStandardMaterial color='#f3e6c8'/></mesh>
   <TownSign visible={centerDetail} occlude={[directory]}
    position={[0,1.66,.10]} distanceFactor={5}
    onClick={onDirectory} text='Visit habitats ↗'/>
  </group>
  {residents.map(i=><LocalResident key={i} index={i}/>)}
 </group>;
}
