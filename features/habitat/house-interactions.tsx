'use client';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import type {Pose} from '@/features/plaza/types';
import type {WorldObject,WorldState} from './types';
import {getHouseConfig,HOUSE_ORIGIN,HOUSE_CELL_SIZE,HOUSE_DOOR_ASSET_ID} from './modular-house';
import {interactionLabel,interactionObjectFor,seatPoseFor} from './furniture-interactions';
import {doorFeedbackChanges} from './entry-art';
import {createDoorAudio,scheduleDoorSound} from './house-door-audio';
import './house-interactions.css';
export default function HouseInteractions({pose,objects,states,sitting,sittingOn,busy,onUse}:{pose:MutableRefObject<Pose>;objects:WorldObject[];states:WorldState['states'];sitting:boolean;sittingOn:string|null;busy:boolean;onUse:(o:WorldObject)=>void}){
 const [walkingPosition,setPosition]=useState(()=>({...pose.current}));
 const [soundOn,setSoundOn]=useState(()=>{try{return localStorage.getItem('ctrl-house-sound')!=='off';}catch{return true;}});
 const audio=useRef<AudioContext|null>(null),previous=useRef(new Map<string,boolean>());
 const prime=()=>{audio.current??=createDoorAudio();if(audio.current?.state==='suspended')void audio.current.resume().catch(()=>{});};
 useEffect(()=>{const timer=setInterval(()=>setPosition({...pose.current}),180);return()=>clearInterval(timer);},[pose]);
 useEffect(()=>{
  const unlock=(e:Event)=>{if(!e.isTrusted||!soundOn)return;if(e instanceof KeyboardEvent&&e.code!=='KeyE')return;const current=interactionObjectFor(pose.current,objects,sitting?sittingOn:null);if(current?.assetId===HOUSE_DOOR_ASSET_ID)prime();};
  window.addEventListener('pointerdown',unlock,{passive:true});window.addEventListener('keydown',unlock);
  return()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);};
 },[objects,pose,sitting,sittingOn,soundOn]);
 useEffect(()=>()=>{if(audio.current&&audio.current.state!=='closed')void audio.current.close().catch(()=>{});},[]);
 useEffect(()=>{
  const doors=objects.filter(o=>o.assetId===HOUSE_DOOR_ASSET_ID).map(o=>({id:o.id,active:!!states[o.id]?.active}));
  for(const change of doorFeedbackChanges(previous.current,doors)){
   const object=objects.find(o=>o.id===change.id)!;if(Math.hypot(pose.current.x-object.x,pose.current.z-object.z)>3.6)continue;
   let scheduled=false;if(soundOn&&audio.current&&audio.current.state!=='closed'){scheduleDoorSound(audio.current,change.active);scheduled=true;}
   window.dispatchEvent(new CustomEvent('ctrl-house-door-feedback',{detail:{id:change.id,active:change.active,audioScheduled:scheduled,audioState:audio.current?.state??'locked'}}));
  }
  previous.current=new Map(doors.map(d=>[d.id,d.active]));
 },[objects,states,pose,soundOn]);
 const seat=sitting?objects.find(o=>o.id===sittingOn&&o.behavior==='seat'):undefined;
 // Keep HUD/feedback tied to the actual pose, not a cosmetic camera or stale seat snapshot.
 const position=seat?seatPoseFor(seat):walkingPosition;
 const near=interactionObjectFor(position,objects,sitting?sittingOn:null);
 const useNearby=()=>{if(busy)return;const current=interactionObjectFor(pose.current,objects,sitting?sittingOn:null);if(current&&current.id===near?.id)onUse(current);};
 const inside=getHouseConfig(objects).cells.some(cell=>Math.abs(position.x-(HOUSE_ORIGIN.x+cell.x*HOUSE_CELL_SIZE))<HOUSE_CELL_SIZE/2&&Math.abs(position.z-(HOUSE_ORIGIN.z+cell.z*HOUSE_CELL_SIZE))<HOUSE_CELL_SIZE/2);
 const toggleSound=()=>{const next=!soundOn;if(next)prime();setSoundOn(next);try{localStorage.setItem('ctrl-house-sound',next?'on':'off');}catch{/* The in-memory preference still works when storage is unavailable. */}};
 return <><output className='hb-house-location' aria-label='House location' data-player-x={position.x.toFixed(3)} data-player-z={position.z.toFixed(3)} data-house-inside={inside}>{inside?'Inside the house':'In the garden'}</output>{near&&<div className='hb-interaction-prompt' data-entry-reference={near.assetId===HOUSE_DOOR_ASSET_ID?'door':undefined}>
  <small>{near.name}</small><div className='hb-interaction-actions'><button type='button' disabled={busy} onClick={useNearby} data-object-id={near.id}><kbd>E</kbd>{interactionLabel(near,states[near.id]?.active??false,sitting&&near.id===sittingOn)}</button>
  {near.assetId===HOUSE_DOOR_ASSET_ID&&<button className='hb-door-sound' type='button' aria-label='Door sounds' aria-pressed={soundOn} onClick={toggleSound} title={soundOn?'Mute door sounds':'Enable door sounds'}><svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' aria-hidden='true'><path d='M11 5 6 9H3v6h3l5 4V5Z'/>{soundOn?<path d='M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14'/>:<path d='m16 9 5 6m0-6-5 6'/>}</svg></button>}</div>
 </div>}</>;
}
