'use client';
import {lazy,useState} from 'react';
import Link from '@/components/navigation';
import {ClientScene} from '@/three/core/client-scene';
import {useResource} from '@/lib/use-resource';
import type {Mission} from '@/domain/types';
import type {Exhibit} from '@/three/exhibition/geometry';
const Scene=lazy(()=>import('@/three/exhibition/exhibit-scene'));
const Weather=lazy(()=>import('./weather-field'));
const rooms:{id:Exhibit;number:string;title:string;subtitle:string;link:string;action:string;note:string}[]=[
 {id:'machine',number:'000',title:'A public\nmachine.',subtitle:'You give direction.\nThe machine makes something of it.',link:'/commands',action:'GIVE IT DIRECTION',note:'A kinetic study of public support'},
 {id:'dead-web',number:'001',title:'The\ndead web.',subtitle:'Some things refuse\nto go offline.',link:'/worlds/dead-web',action:'ENTER THIS WORLD',note:'Six remnants of an earlier internet'},
 {id:'internet-weather',number:'002',title:'Internet\nweather.',subtitle:'A forecast for a place\nwith no sky.',link:'/worlds/internet-weather',action:'ENTER THIS WORLD',note:'One day of synthetic signals'},
 {id:'agent-orbit',number:'003',title:'Agent\norbit.',subtitle:'A small census\nof moving intentions.',link:'/worlds/agent-orbit',action:'ENTER THIS WORLD',note:'Nine illustrative agents in relation'},
];
export function ExhibitionRoom({worldsOnly=false}:{worldsOnly?:boolean}){
 const [index,setIndex]=useState(worldsOnly?1:0),[paused,setPaused]=useState(false),[selected,setSelected]=useState(0);const missions=useResource<Mission[]>('missions',10000);const pending=missions.data?.filter(m=>m.status==='OPEN')??[];const room=rooms[index];const activeMission=missions.data?.find(m=>!['OPEN','REVIEW','COMPLETE','FAILED'].includes(m.status));const command=pending[selected%Math.max(1,pending.length)];
 return <section className={`exhibition-room room-${room.id}`} aria-label="CTRL interactive exhibition">
  <div className="room-render" key={room.id}><ClientScene fallback={<div className="room-loading">PREPARING ROOM {room.number}</div>}>{room.id==='internet-weather'?<Weather hour={14} layer="attention" paused={paused}/>:<Scene kind={room.id} weights={pending.map(m=>m.support)} selected={room.id==='machine'&&!pending.length?-1:selected} onSelect={setSelected} paused={paused}/>}</ClientScene></div>
  <div className="room-topline"><span>{worldsOnly?'THE PUBLIC COLLECTION':'DIRECTED BY PEOPLE. OPEN TO EVERYONE.'}</span><span>EXPERIMENT {room.number}</span></div>
  <div className="room-copy" key={`copy-${room.id}`}><div className="room-kicker"><span className="room-cross">+</span><span>{room.number} / {room.id==='machine'?'THE CONTROL FIELD':'A COMPLETED COMMAND'}</span></div><h1>{room.title}</h1><div className="room-copy-bottom"><p>{room.subtitle}</p><Link href={room.link} className="room-enter">{room.action}<span className="enter-symbol" aria-hidden="true">↗</span></Link></div></div>
  <aside className="room-observation">{room.id==='machine'?<><span className="observation-label">{activeMission?'THE MACHINE IS WORKING':'CURRENTLY IN THE ARENA'}</span><Link href={activeMission?'/work':command?`/archive/${command.id}`:'/commands'}>{missions.error?'The public record is unavailable.':activeMission?.command??command?.command??(missions.loading?'Reading the public queue.':'No open commands. Place the next one.')}</Link><span>{activeMission?`${activeMission.status} / $${activeMission.consumed.toFixed(4)}`:command?`${command.support} CONTROL / ${pending.length} OPEN COMMANDS`:'PUBLIC COMMANDS'}</span></>:<><span className="observation-label">FIELD NOTES</span><p>{room.note}</p><span>CURATED DEMONSTRATION</span></>}</aside>
  <div className="room-instructions"><span aria-hidden="true">↔</span>{room.id==='internet-weather'?'MOVE THROUGH THE SIGNAL':'DRAG TO TURN THE INSTALLATION'}</div>
  <nav className="exhibition-selector" aria-label="Select an exhibition">{rooms.filter((_,i)=>!worldsOnly||i>0).map(item=>{const i=rooms.indexOf(item);return <button key={item.id} onClick={()=>{setIndex(i);setSelected(0);}} aria-pressed={index===i}><span className="selector-number">{item.number}</span><span className="selector-title">{item.id==='machine'?'PUBLIC MACHINE':item.title.replace('\n',' ').replace('.','').toUpperCase()}</span><i aria-hidden="true"/></button>;})}</nav>
  <div className="room-utility"><button aria-label={paused?'Resume motion':'Pause motion'} onClick={()=>setPaused(!paused)}><span aria-hidden="true">{paused?'▷':'Ⅱ'}</span>{paused?'STILL':'IN MOTION'}</button><Link href="/archive">PUBLIC RECORD</Link></div>
 </section>;
}
