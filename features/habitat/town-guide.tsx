'use client';
import {useEffect,useState,type MutableRefObject} from 'react';
import type {Pose} from '@/features/plaza/types';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_BRIDGES} from './public-world-geography';
import {TOWN_ACTIVITIES,TOWN_DISTRICTS,getNearestTownActivity,getTownDistrict,type TownActivityId,type TownDistrictKind} from './town-districts';

type SharedStates=Record<string,{active:boolean;usedAt:number}>;
export default function TownGuide({pose,onDirectory,onActivity,onTravel,states,busy=false}:{pose:MutableRefObject<Pose>;onDirectory:()=>void;onActivity:(id:TownActivityId)=>void;onTravel:(id:TownDistrictKind)=>void;states:SharedStates;busy?:boolean}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({x:0,z:6}),[now,setNow]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>{setPosition({x:pose.current.x,z:pose.current.z});setNow(Date.now());},400);return()=>clearInterval(timer);},[pose]);
 const nearest=getNearestTownActivity(position.x,position.z);
 const district=getTownDistrict(position.x,position.z);
 const recent=TOWN_ACTIVITIES.filter(a=>!!states[a.objectId]?.usedAt&&now-states[a.objectId].usedAt<a.cooldownMs).length;
 const cooling=nearest&&states[nearest.objectId]?.usedAt?Math.max(0,Math.ceil((states[nearest.objectId].usedAt+nearest.cooldownMs-now)/1000)):0;
 return <aside className='hb-town-guide' aria-label='Public World travel and activities'>
  <div className='hb-town-guide-actions'>
   {nearest&&<button className='hb-town-action' disabled={busy||cooling>0} onClick={()=>onActivity(nearest.id)}>
    {cooling>0?`Neighbors helped · ${cooling}s`:nearest.verb}
   </button>}
   <button aria-expanded={open} aria-controls='town-map' onClick={()=>setOpen(v=>!v)}>{open?'Close map':'Town map'}</button>
   <button onClick={onDirectory}>Visit habitats ↗</button>
  </div>
  {open&&<section id='town-map' aria-label='Willow Square map'>
   <div className='hb-row'><strong>{district.name}</strong><span aria-hidden='true'>N ↑</span></div>
   <p>{district.description}</p>
   <svg className='hb-district-map' viewBox='-124 -113 248 226' role='img' aria-label='Seven physical town districts with your current position and shared activity markers'>
    <rect x='-124' y='-113' width='248' height='226' rx='9' fill='#adc69b'/>
    <path d='M0 9H78V-73H0V-29M0 22H-75V-52M-75 22V46M78 27L76 80M0 -76H78' stroke='#ecdbb8' strokeWidth='5' fill='none'/>
    <rect x='-38' y='-22' width='76' height='5' fill='#89bcc3'/>
    {PUBLIC_WORLD_BRIDGES.map(b=><rect key={b.x} x={b.x-3.4} y='-23' width='6.8' height='7' fill='#b9936e'/>)}
    {PUBLIC_WORLD_BUILDINGS.map(h=><rect key={h.name} x={h.x-h.width/2} y={h.z-h.depth/2} width={h.width} height={h.depth} rx='.8' fill={h.roof}/>)}
    {TOWN_DISTRICTS.map(d=><g key={d.id}>
     <circle cx={d.x} cy={d.z} r='11' fill={d.color} stroke='#fff5e7' strokeWidth='1.5'/>
     <text x={d.x} y={d.z+16} textAnchor='middle'>{d.name.toUpperCase()}</text>
    </g>)}
    {TOWN_ACTIVITIES.map(a=><circle key={a.id} cx={a.x} cy={a.z} r='3.3' stroke='#fff9e8' strokeWidth='1' fill={now-(states[a.objectId]?.usedAt??0)<a.cooldownMs?'#77a87b':'#d29a69'}/>)}
    <circle cx={position.x} cy={position.z} r='4.3' fill='#d75e43' stroke='#fff9e8' strokeWidth='2'/>
   </svg>
   <div className='hb-town-progress'><strong>Town life</strong><span>{recent}/{TOWN_ACTIVITIES.length} activities helped recently</span></div>
   <div className='hb-town-destinations'>
    {TOWN_DISTRICTS.map(d=><div key={d.id}>
     <strong>{d.name}</strong>
     <small>{Math.round(Math.hypot(position.x-d.x,position.z-d.z))} m away · {d.description}</small>
     <button disabled={busy||district.id===d.id&&Math.hypot(position.x-d.x,position.z-d.z)<10} onClick={()=>{onTravel(d.id);setOpen(false);}}>Travel here ↗</button>
    </div>)}
   </div>
   <small>Walk to the colored activity stations to help your town. Green markers were completed recently. Activities are shared by actual players, not NPCs.</small>
  </section>}
 </aside>;
}
