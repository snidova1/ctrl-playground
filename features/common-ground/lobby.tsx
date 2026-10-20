'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useState} from 'react';
import {BrandMark} from '@/components/brand';
import {nextAtmospherePreset,type AtmospherePreset} from '@/features/habitat/atmosphere-presets';
import './lobby.css';
const LobbyScene=dynamic(()=>import('./lobby-scene'),{ssr:false});
export default function CommonGroundLobby(){
 const [phase,setPhase]=useState<AtmospherePreset>('afternoon');
 return <main className='cg-lobby' id='main' data-product-area='non-holder-lobby'>
  <header className='cg-header'><Link prefetch={false} href='/' aria-label='CTRL home'><BrandMark/><strong>CTRL</strong></Link><span>COMMON GROUND</span><button onClick={()=>setPhase(nextAtmospherePreset)}>Change the light</button></header>
  <section className='cg-scene' aria-label='Garden waiting room'><LobbyScene phase={phase}/><span className='cg-view-hint'>A little room to pause. Drag to look around.</span></section>
  <section className='cg-welcome' aria-labelledby='cg-title'><span className='cg-eyebrow'>YOUR FIRST STOP</span><h1 id='cg-title'>Come in.<br/>Take a breath.</h1><p>This is Common Ground — a quiet waiting room before the wider world.</p>
   <div className='cg-destination'><small>PUBLIC WORLD / AREA 01</small><strong>Willow Common</strong><p>A village to explore, neighbours to meet, and little things to do.</p></div>
   <Link prefetch={false} className='cg-primary' href='/habitat'>Connect & continue <span aria-hidden='true'>↗</span></Link><Link prefetch={false} className='cg-secondary' href='/account'>Wallet & access</Link><small className='cg-footnote'>No wallet needed to stay here. Take your time — the world can wait a moment.</small>
  </section>
 </main>;
}
