'use client';
import {useEffect,useState,type MutableRefObject} from 'react';
import type {Pose} from '@/features/plaza/types';
import {CROP_GROW_MS,TOWN_GARDEN_BEDS,type TownLifeState} from '@/domain/town';
import {TOWN_ACTIVITIES} from './town-districts';
import {TownAssetInstances} from './town-assets';
import TownCivicWorld from './town-civic-world';
import TownRouteWorld from './town-route-world';

/** Replicated, durable garden growth and visible completed community projects. */
export default function TownSharedLife({town,pose}:{town:TownLifeState|undefined;pose:MutableRefObject<Pose>}){
 const [now,setNow]=useState(0),[location,setLocation]=useState({x:0,z:6});
 useEffect(()=>{const timer=setInterval(()=>{setNow(Date.now());setLocation({...pose.current});},500);return()=>clearInterval(timer);},[pose]);
 if(!town)return null;
 const near=TOWN_ACTIVITIES.filter(a=>Math.hypot(a.x-location.x,a.z-location.z)<65);
 return <group>
  <TownRouteWorld town={town} x={location.x} z={location.z}/>
  <TownCivicWorld projects={town.projects} x={location.x} z={location.z}/>
  {Math.hypot(location.x+75,location.z-46)<65&&TOWN_GARDEN_BEDS.map(place=>{
   const bed=town.garden.find(b=>b.id===place.id),watered=!!bed?.wateredAt;
   const growth=bed?.crop?watered?Math.min(1,Math.max(.18,(now-bed.wateredAt)/CROP_GROW_MS)):.14:0;
   const plants=Array.from({length:8},(_,i)=>({x:place.x+(i%4-.5)*.32-.3,z:place.z+(Math.floor(i/4)-.5)*.48,y:.12,size:.15+growth*.52,yaw:i*.7}));
   return <group key={place.id}>
    <mesh position={[place.x,.05,place.z]} receiveShadow><boxGeometry args={[2,.16,1.5]}/><meshStandardMaterial color={watered?'#7f6650':'#a88c6c'}/></mesh>
    {[-1,1].map(side=><mesh key={side} position={[place.x+side*1.04,.12,place.z]}><boxGeometry args={[.08,.28,1.66]}/><meshStandardMaterial color='#c6a778'/></mesh>)}
    {[-1,1].map(side=><mesh key={side} position={[place.x,.12,place.z+side*.8]}><boxGeometry args={[2.16,.28,.08]}/><meshStandardMaterial color='#c6a778'/></mesh>)}
    {growth>0&&<TownAssetInstances id={growth>.8?'nature-kit/flower_yellowB':'nature-kit/plant_bushSmall'} placements={plants}/>}
   </group>;
  })}
  {near.map(a=>{
   const saved=town.contributions[a.id]?.count??0;
   if(!saved)return null;
   const flowerPositions=Array.from({length:Math.min(16,4+saved*2)},(_,i)=>{const theta=i*2.399;return {x:a.x+Math.sin(theta)*2.7,z:a.z+Math.cos(theta)*2.7,y:.02,size:.42+Math.abs(Math.sin(i*3))*.18};});
   return <group key={a.id}>
    <TownAssetInstances id='nature-kit/flower_purpleC' placements={flowerPositions}/>
    {saved>=3&&<group position={[a.x,4.2,a.z]}>{[-1,1].map(side=><mesh key={side} position={[side*2.8,-.25,0]}><cylinderGeometry args={[.045,.045,3,6]}/><meshStandardMaterial color='#b79b77'/></mesh>)}<mesh><boxGeometry args={[5.6,.025,.025]}/><meshStandardMaterial color='#998168'/></mesh>{[-2,-1,0,1,2].map((x,i)=><mesh key={x} position={[x,-.27,0]} rotation-z={Math.PI}><coneGeometry args={[.22,.52,3]}/><meshStandardMaterial color={i%2?'#e4b7a1':'#d2c79a'}/></mesh>)}</group>}
   </group>;
  })}
 </group>;
}
