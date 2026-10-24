'use client';

import dynamic from 'next/dynamic';
import {Component,useState,type ReactNode} from 'react';
import type {CharacterAppearance} from '@/features/plaza/characters/catalog';

// Reuse Habitat's actual player renderer, lighting, standing idle and orbit.
// One instance changes framing in place; edits never key/remount the canvas.
const CharacterCreatorPreview=dynamic(()=>import('@/features/habitat/character-creator-preview'),{
 ssr:false,
 loading:()=> <span className='cg-preview-status' role='status'>Loading your 3D preview…</span>,
});

class PreviewBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<p className='cg-preview-status' role='alert'>The 3D preview could not start. Check WebGL support and reopen the creator to retry. Your changes can still be saved.</p>:this.props.children;}
}

export default function CreatorPreview({appearance}:{appearance:CharacterAppearance}){
 const [framing,setFraming]=useState<'full'|'portrait'>('full');
 return <section className='cg-creator-preview' aria-label='Live avatar preview' data-preview-gender={appearance.gender} data-preview-model={appearance.lookId??'original'} data-preview-hair={appearance.hairStyleId??'source'} data-preview-outfit={appearance.wardrobeId??'source'} data-preview-expression={appearance.expressionId??'neutral'} data-preview-framing={framing}>
  <div className='cg-preview-heading'><span className='cg-preview-live'><span aria-hidden='true'/>Live preview</span><div role='group' aria-label='Character preview view'>
   <button type='button' aria-pressed={framing==='full'} onClick={()=>setFraming('full')}>Full body</button>
   <button type='button' aria-pressed={framing==='portrait'} onClick={()=>setFraming('portrait')}>Face</button>
  </div></div>
  <div className='cg-preview-stage'><PreviewBoundary><CharacterCreatorPreview appearance={appearance} framing={framing}/></PreviewBoundary></div>
  <p className='cg-preview-hint'><svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M4 7a7 4 0 1 1-1 5M4 3v4h4'/></svg>Drag to turn<span>The fitting room</span></p>
 </section>;
}
