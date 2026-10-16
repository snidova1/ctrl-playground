'use client';
import {useEffect,useState,type MutableRefObject} from 'react';
import type {Pose} from '@/features/plaza/types';
import {getTownVenue,TOWN_VENUES} from '@/domain/town-venues';
import {PUBLIC_WORLD_ID} from './public-world';
export default function TownVenueGuide({worldId,pose,busy,onTravel}:{worldId:string;pose:MutableRefObject<Pose>;busy:boolean;onTravel:(id:string,mode:'venue'|'exit')=>void}){
 const [position,setPosition]=useState({x:0,z:6});useEffect(()=>{const tick=setInterval(()=>setPosition({...pose.current}),400);return()=>clearInterval(tick);},[pose]);
 const inside=getTownVenue(worldId),near=worldId===PUBLIC_WORLD_ID?TOWN_VENUES.find(v=>Math.hypot(position.x-v.x,position.z-v.z)<=4.25):null;
 if(!inside&&!near)return null;
 return <aside className='hb-venue-guide' aria-label='Public building entrance'>
  {inside?<><strong>{inside.name}</strong><button disabled={busy||Math.hypot(position.x,position.z-6)>4.25} onClick={()=>onTravel(inside.id,'exit')}>Return through entrance</button><small>Walk to the front entrance to return to Public World.</small></>:<><strong>{near!.name}</strong><button disabled={busy} onClick={()=>onTravel(near!.id,'venue')}>Enter {near!.name}</button></>}
 </aside>;
}
