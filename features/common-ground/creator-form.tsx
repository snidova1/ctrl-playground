'use client';

import {useState,type FormEvent,type KeyboardEvent} from 'react';
import AppearancePicker from '@/features/habitat/appearance-picker';
import {newCharacterAppearance,type CharacterAppearance} from '@/features/plaza/characters/catalog';
import CreatorPreview from './creator-preview';
import './creator-dressing-room.css';

interface CreatorFormProps {
 appearance:CharacterAppearance;
 name:string;
 busy:boolean;
 error:string;
 onAppearanceChange:(appearance:CharacterAppearance)=>void;
 onNameChange:(name:string)=>void;
 onSubmit:(event:FormEvent<HTMLFormElement>)=>void;
}

const sections=[
 {id:'looks',label:'Look',path:'M7 4h10l3 5-3 11H7L4 9l3-5Zm-3 5h16M7 4l5 5 5-5M12 9v11'},
 {id:'hair',label:'Hair',path:'M5 15V9a7 7 0 0 1 14 0v6M5 13c5 0 8-5 8-8 0 5 3 8 6 8M5 12v7h3m11-7v7h-3'},
 {id:'outfit',label:'Outfit',path:'m8 4-5 3-2 5 4 2 2-3v9h10v-9l2 3 4-2-2-5-5-3c0 4-8 4-8 0Z'},
 {id:'details',label:'Details',path:'M4 7h16M4 17h16M8 4v6m8 4v6M4 12h16'},
] as const;
type Section=typeof sections[number]['id'];

export default function CreatorForm({appearance,name,busy,error,onAppearanceChange,onNameChange,onSubmit}:CreatorFormProps){
 const [section,setSection]=useState<Section>('looks');
 function navigateTabs(event:KeyboardEvent<HTMLButtonElement>){
  const index=sections.findIndex(item=>item.id===section);
  let next=index;
  if(event.key==='ArrowRight')next=(index+1)%sections.length;
  else if(event.key==='ArrowLeft')next=(index+sections.length-1)%sections.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=sections.length-1;
  else return;
  event.preventDefault();
  setSection(sections[next].id);
  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
 }
 return <form className='cg-creator-workspace' aria-label='Public World avatar' aria-busy={busy} onSubmit={onSubmit}>
  <CreatorPreview appearance={appearance}/>
  <div className='cg-creator-wardrobe' role='region' aria-label='Avatar customization controls' tabIndex={0}>
   <div className='cg-creator-identity'>
    <label className='cg-creator-name'>Your name<input aria-label='Avatar name' autoComplete='nickname' placeholder='e.g. Willow' minLength={2} maxLength={24} required value={name} onChange={e=>onNameChange(e.target.value)}/></label>
    <label className='cg-creator-character'>Character<select aria-label='Avatar character' value={appearance.gender} onChange={e=>onAppearanceChange(newCharacterAppearance(e.target.value as 'female'|'male'))}><option value='female'>Female</option><option value='male'>Male</option></select></label>
   </div>
   <div className='cg-creator-tabs' role='tablist' aria-label='Avatar wardrobe'>
    {sections.map(item=><button key={item.id} id={`cg-creator-tab-${item.id}`} type='button' role='tab' aria-selected={section===item.id} aria-controls='cg-creator-panel' tabIndex={section===item.id?0:-1} onClick={()=>setSection(item.id)} onKeyDown={navigateTabs}>
     <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d={item.path}/></svg><span>{item.label}</span>
    </button>)}
   </div>
   <div className='cg-creator-fields' key={section} id='cg-creator-panel' role='tabpanel' aria-labelledby={`cg-creator-tab-${section}`} tabIndex={0}>
    <AppearancePicker appearance={appearance} onChange={onAppearanceChange} section={section}/>
   </div>
  </div>
  <footer className='cg-creator-save'>
   {error&&<p className='cg-creator-error' role='alert'>{error}</p>}
   <p className='cg-creator-save-note'><svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.3' aria-hidden='true'><path d='M10 2 3 5v5c0 4 7 7 7 7s7-3 7-7V5l-7-3Z'/><path d='m7 9 2 2 4-4'/></svg><span>Free to explore. Habitat &amp; Keys stay separate.</span></p>
   <button className='cg-primary' disabled={busy} type='submit'>{busy?'Saving avatar…':'Save avatar & enter Public World'}<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M3 10h13m-5-5 5 5-5 5'/></svg></button>
  </footer>
 </form>;
}
