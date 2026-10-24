'use client';

import dynamic from 'next/dynamic';
import {useState,type FormEvent} from 'react';
import {newCharacterAppearance,type CharacterAppearance} from '@/features/plaza/characters/catalog';
import AppearancePicker from './appearance-picker';
import './dressing-room.css';

const Preview=dynamic(()=>import('./character-creator-preview'),{ssr:false,loading:()=> <p className='hd-loading' role='status'>Preparing your dressing room…</p>});
const sections=[['looks','Looks'],['hair','Hair'],['outfit','Outfit'],['details','Details']] as const;
type Section=typeof sections[number][0];

export default function DressingRoom({appearance,name,busy,hasProfile,canSave,onChange,onName,onSave,onClose}:{appearance:CharacterAppearance;name:string;busy:boolean;hasProfile:boolean;canSave:boolean;onChange:(appearance:CharacterAppearance)=>void;onName:(name:string)=>void;onSave:()=>void;onClose:()=>void}){
 const [section,setSection]=useState<Section>('looks');
 const [framing,setFraming]=useState<'full'|'portrait'>('full');
 function submit(event:FormEvent){event.preventDefault();if(canSave&&!busy&&name.trim().length>=2)onSave();}
 return <section className='hb-panel hb-character-creator hd-room' aria-label='3D character creator'>
  <header className='hd-heading'><div><span className='hd-eyebrow'>CTRL / DRESSING ROOM</span><h1>A little more you.</h1></div>{hasProfile&&<button className='hd-close' type='button' aria-label='Close character creator' onClick={onClose}>×</button>}</header>
  <div className='hd-visual'>
   <div className='hd-view-tools' role='group' aria-label='Character preview view'><button type='button' aria-pressed={framing==='full'} onClick={()=>setFraming('full')}>Full body</button><button type='button' aria-pressed={framing==='portrait'} onClick={()=>setFraming('portrait')}>Face</button></div>
   <Preview appearance={appearance} framing={framing}/>
   <div className='hd-stage-caption'><span>YOUR EVERYDAY CHARACTER</span><small>Drag to turn · Changes are live</small></div>
  </div>
  <form className='hd-form' onSubmit={submit}>
   <div className='hd-identity'><label>Your name<input aria-label='Name' required minLength={2} maxLength={20} value={name} onChange={e=>onName(e.target.value)} placeholder='What should we call you?'/></label><div className='hd-gender' role='group' aria-label='Character type'>{(['female','male'] as const).map(g=><button type='button' key={g} aria-pressed={appearance.gender===g} onClick={()=>onChange(newCharacterAppearance(g))}>{g==='female'?'Female':'Male'}</button>)}</div></div>
   <div className='hd-tabs' role='tablist' aria-label='Character customization' onKeyDown={event=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const current=sections.findIndex(([id])=>id===section);const next=event.key==='Home'?0:event.key==='End'?sections.length-1:(current+(event.key==='ArrowRight'?1:-1)+sections.length)%sections.length;setSection(sections[next][0]);event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();}}>{sections.map(([id,label])=><button type='button' role='tab' tabIndex={section===id?0:-1} id={`hd-tab-${id}`} aria-selected={section===id} aria-controls='hd-options' key={id} onClick={()=>setSection(id)}>{label}</button>)}</div>
   <div id='hd-options' className='hd-options' role='tabpanel' aria-labelledby={`hd-tab-${section}`} tabIndex={0}><AppearancePicker appearance={appearance} onChange={onChange} section={section}/></div>
   <footer className='hd-save'><span>Saved to your wallet. Always yours to change.</span><button className='hb-primary hb-creator-enter' disabled={busy||!canSave||name.trim().length<2} type='submit'>{busy?'Saving avatar…':hasProfile?'Save character':'Enter my world draft'}<span aria-hidden='true'>↗</span></button>{!canSave&&<small>Connect a wallet to save your character.</small>}</footer>
  </form>
 </section>;
}
