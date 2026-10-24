'use client';
import {useState} from 'react';
import Link from 'next/link';
import CharacterCreatorPreview from './character-creator-preview';
import AppearanceControls from './appearance-controls';
import type {AvatarGestureRequest} from '@/features/plaza/characters/vrm-avatar';
import {newCharacterAppearance,eyeVariants,hairVariants,outfitVariants,skinVariants,type CharacterAppearance} from '@/features/plaza/characters/catalog';
import './avatar-studio.css';
export default function AvatarStudio(){
 const [appearance,setAppearance]=useState<CharacterAppearance>(()=>newCharacterAppearance('female'));
 const [action,setAction]=useState<'idle'|'walk'|'run'|'sit'>('idle');
 const [gesture,setGesture]=useState<AvatarGestureRequest>({id:null,sequence:0});
 const emote=(id:AvatarGestureRequest['id'])=>setGesture(old=>({id,sequence:old.sequence+1}));
 const [portrait,setPortrait]=useState(false);
 const update=(key:keyof CharacterAppearance,value:string)=>setAppearance(a=>({...a,[key]:value}));
 return <main className='as-page' data-avatar-renderer='anime-vrm-mtoon' data-avatar-gender={appearance.gender}>
  <header><Link href='/'>CTRL</Link><span>CHARACTER ATELIER</span><Link href='/habitat'>Back to Habitat ↗</Link></header>
  <section className='as-layout'>
   <div className='as-copy'><span className='as-eyebrow'>A NEW FACE FOR YOUR WORLD</span><h1>A little more<br/><em>you.</em></h1><p>Rigged anime characters with detailed textures, complete outfits and expressive faces. The same model in your studio and your world.</p>
    <div className='as-genders' aria-label='Character body'>{(['female','male'] as const).map(g=><button key={g} aria-pressed={appearance.gender===g} onClick={()=>{setAppearance(newCharacterAppearance(g));emote(null);}}>{g==='female'?'Female':'Male'}</button>)}</div>
    <AppearanceControls appearance={appearance} onChange={setAppearance}/>
    <div className='as-fields'>
     <label>Outfit tint<select aria-label='Wardrobe' value={appearance.variantId} onChange={e=>update('variantId',e.target.value)}>{outfitVariants.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
     <label>Hair tint<select aria-label='Hair' value={appearance.hairId} onChange={e=>update('hairId',e.target.value)}>{hairVariants.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
     <label>Eyes<select aria-label='Eyes' value={appearance.eyeId} onChange={e=>update('eyeId',e.target.value)}>{eyeVariants.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
     <label>Skin<select aria-label='Skin' value={appearance.skinId} onChange={e=>update('skinId',e.target.value)}>{skinVariants.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
    </div>
    <small>Design study only. Your saved character and Habitat are untouched here.</small>
   </div>
   <div className='as-stage'><div className='as-preview'><CharacterCreatorPreview appearance={appearance} action={action} gesture={gesture} framing={portrait?'portrait':'full'}/></div><nav aria-label='Animation preview'>{(['idle','walk','run','sit'] as const).map(a=><button key={a} aria-pressed={action===a} onClick={()=>{setAction(a);if(a==='idle')emote(null);}}>{a==='idle'?'Relax':a==='walk'?'Walk':a==='run'?'Run':'Sit'}</button>)}<button onClick={()=>emote('interact')}>Say hello</button><button onClick={()=>emote('victory')}>Cheer</button><button onClick={()=>emote(null)}>Cancel gesture</button><button aria-pressed={portrait} onClick={()=>setPortrait(v=>!v)}>Face detail</button></nav><span className='as-note'>360° VIEW · DRAG THE CHARACTER TO LOOK AROUND</span></div>
  </section>
 </main>;
}
