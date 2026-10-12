'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {Component,useRef,useState,type ReactNode} from 'react';
import {createCharacterMotion} from '@/features/plaza/characters/catalog';
import type {ControlInput} from '@/features/plaza/scene';
import type {Pose} from '@/features/plaza/types';
import type {WorldState} from '@/features/habitat/types';

const Stage=dynamic(()=>import('@/features/habitat/stage'),{ssr:false});
class Boundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div role='alert' style={{padding:40}}>WebGL preview could not render. Try Chrome/Edge with hardware acceleration enabled.</div>:this.props.children;}
}
export default function Preview(){
 const pose=useRef<Pose>({x:0,z:6,angle:Math.PI,moving:false});
 const input=useRef<ControlInput>({x:0,z:0});
 const motion=useRef(createCharacterMotion());
 const [quality,setQuality]=useState<'low'|'high'>('low');
 // Deliberately browser-only demo state. No wallet, session, API calls or saved-world writes.
 const [state]=useState<WorldState>(()=>({
  profile:{id:'local-preview',name:'Visitor',character:'female',variant:'original'},
  world:{id:'local-preview-world',ownerId:'local-preview',name:'Cozy Habitat Preview',visibility:'public',revision:0,objects:[]},
  homeId:null,canEdit:false,players:[],states:{},wallet:null,keyStatus:'not-deployed',worlds:[],
 }));
 const hold=(x:number,z:number)=>{input.current={x,z};};
 return <main style={{position:'fixed',inset:0,background:'#bfe4e7'}}>
  <Boundary><Stage state={state} pose={pose} input={input} motion={motion} editing={false} locked={false} selected={null} draft={[]} onSelect={()=>{}} onUse={()=>{}} sitting={false} celebrate={false} interactedAt={0} quality={quality}/></Boundary>
  <header style={{position:'absolute',top:16,left:16,right:16,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap',padding:16,borderRadius:16,background:'rgba(255,249,232,.94)',color:'#29443b'}}>
   <strong>CTRL · Cozy Habitat</strong><span>NO WALLET · VISUAL PREVIEW</span>
   <label>Graphics <select aria-label='Graphics' value={quality} onChange={e=>setQuality(e.target.value as 'low'|'high')}><option value='low'>Low</option><option value='high'>High</option></select></label>
   <Link href='/courtyard'>Common Ground ↗</Link><Link href='/habitat'>Personal world ↗</Link>
  </header>
  <footer style={{position:'absolute',bottom:16,left:16,right:16,display:'flex',gap:12,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',padding:12,borderRadius:16,background:'rgba(255,249,232,.94)',color:'#29443b'}}>
   <span>WASD / arrows: move · drag: orbit · scroll: zoom · nothing is saved</span>
   <div style={{display:'flex',gap:6}}>{([['←',-1,0],['↑',0,-1],['↓',0,1],['→',1,0]] as const).map(([label,x,z])=><button key={label} aria-label={`Move ${label}`} style={{padding:'12px 16px',touchAction:'none'}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);hold(x,z);}} onPointerUp={()=>hold(0,0)} onPointerCancel={()=>hold(0,0)} onLostPointerCapture={()=>hold(0,0)}>{label}</button>)}</div>
  </footer>
 </main>;
}
