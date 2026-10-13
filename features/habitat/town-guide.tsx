'use client';
import {useEffect,useState,type MutableRefObject} from 'react';
import type {Pose} from '@/features/plaza/types';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_BRIDGES} from './public-world-geography';

export default function TownGuide({pose,onDirectory}:{pose:MutableRefObject<Pose>;onDirectory:()=>void}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({x:0,z:6});
 useEffect(()=>{if(!open)return;const timer=setInterval(()=>setPosition({x:pose.current.x,z:pose.current.z}),250);return()=>clearInterval(timer);},[open,pose]);
 return <aside className='hb-town-guide' aria-label='Town guide'>
  <div className='hb-town-guide-actions'><button aria-expanded={open} aria-controls='town-map' onClick={()=>setOpen(v=>!v)}>{open?'Close map':'Town map'}</button><button onClick={onDirectory}>Visit habitats ↗</button></div>
  {open&&<section id='town-map' aria-label='Willow Square map'>
   <div className='hb-row'><strong>A little room to wander</strong><span aria-hidden='true'>N ↑</span></div>
   <svg viewBox='-36 -34 72 70' role='img' aria-label='Town map: waterfront to the north, café and market by the square, gardens to the south'>
    <rect x='-36' y='-34' width='72' height='70' rx='5' fill='#b7c69f'/>
    <path d='M0 -32V32M-32 9H32M-32 -13H32M-23 28V-2M23 28V-2M-26 28H26M20 -32V-12' stroke='#f2dfb8' strokeWidth='4' fill='none'/>
    <rect x='-36' y='-22' width='72' height='5' fill='#84b8c0'/>
    {PUBLIC_WORLD_BRIDGES.map(b=><rect key={b.x} x={b.x-3.4} y='-23' width='6.8' height='7' fill='#b9936e'/>)}
    {PUBLIC_WORLD_BUILDINGS.map(h=><rect key={h.name} x={h.x-h.width/2} y={h.z-h.depth/2} width={h.width} height={h.depth} rx='.8' fill={h.roof}/>)}
    <rect x='-14' y='-6' width='28' height='14' rx='2' fill='#e8cea2'/>
    <circle cx='0' cy='-3' r='2.3' fill='#84b8c0'/>
    <text x='0' y='-27' textAnchor='middle'>WATERFRONT</text><text x='0' y='1' textAnchor='middle'>SQUARE</text><text x='0' y='22' textAnchor='middle'>GARDENS</text>
    <circle cx={position.x} cy={position.z} r='1.6' fill='#d46642' stroke='#fff8e7' strokeWidth='.7'/>
   </svg>
   <p>North: café, flower market & two canal bridges.<br/>South: garden paths & picnic tables.</p>
   <small>Homes on this map are town scenery. The directory lists real players’ habitats.</small>
  </section>}
 </aside>;
}
