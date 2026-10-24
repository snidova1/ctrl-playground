'use client';
import {useEffect,useState,type MutableRefObject} from 'react';
import type {Pose} from '@/features/plaza/types';
import type {LifeWorldView} from '@/domain/cozy-life';
import type {WorldObject} from './types';
import {nearestUsableObject,interactionDistanceTo} from './furniture-interactions';
import {nearestLifeInteraction,type LifeInteractionTarget} from '@/features/cozy-life/world-placement';
export default function CozyWorldInteraction({view,pose,objects,enabled,onOpen}:{view:LifeWorldView|null;pose:MutableRefObject<Pose>;objects:WorldObject[];enabled:boolean;onOpen:(tab:'garden'|'craft')=>void}){
 const [target,setTarget]=useState<LifeInteractionTarget|null>(null);
 useEffect(()=>{if(!enabled||!view){setTarget(null);return;}const update=()=>{let next=nearestLifeInteraction(pose.current,view);const object=nearestUsableObject(pose.current,objects);if(next&&object&&interactionDistanceTo(pose.current,object)<next.distance)next=null;setTarget(old=>old?.id===next?.id?old:next);};update();const timer=setInterval(update,160);return()=>clearInterval(timer);},[view,pose,objects,enabled]);
 useEffect(()=>{if(!enabled||!target)return;const key=(event:KeyboardEvent)=>{if(event.code!=='KeyE'||event.repeat||event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,dialog'))return;event.preventDefault();event.stopImmediatePropagation();onOpen(target.tab);};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);},[enabled,target,onOpen]);
 if(!enabled||!target)return null;
 return <button type='button' className='hb-life-action' aria-label={target.tab==='garden'?'Rawat kebun dekatmu':'Lihat perabot buatanmu'} onClick={()=>onOpen(target.tab)} style={{position:'absolute',zIndex:18,left:'50%',bottom:'11rem',transform:'translateX(-50%)',border:'1px solid #afbd94',borderRadius:24,padding:'.7rem 1.1rem',background:'#f9f5e5',color:'#394b39',boxShadow:'0 3px 12px #25351d25',whiteSpace:'nowrap'}}>{target.tab==='garden'?'🌱 Rawat kebun':'🪚 Perabot buatanmu'} <small> E</small></button>;
}
