'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {Component,useEffect,useRef,useState,type ReactNode} from 'react';
import {createCharacterMotion} from '@/features/plaza/characters/catalog';
import type {ControlInput} from '@/features/plaza/scene';
import type {Pose} from '@/features/plaza/types';
import {layoutSchema,worldObjectSchema,type WorldObject,type WorldState} from '@/features/habitat/types';
import {DEFAULT_HOUSE_SETTINGS,type HabitHouseSettings} from '@/features/habitat/habit-home';
import {getBuildAsset} from '@/features/plaza/build-assets';
import type {HabitatTool} from '@/features/plaza/editor/habitat-tools';
import './preview.css';
const Stage=dynamic(()=>import('@/features/habitat/stage'),{ssr:false});
const STORAGE='ctrl-habit-local-v1';
const CATALOG=[['Bench','furniture-kit/bench',3],['Chair','furniture-kit/chair',3],['Lamp','furniture-kit/lampRoundFloor',2],['Fence','nature-kit/fence_simple',2.5],['Red flowers','nature-kit/flower_redA',3],['Purple flowers','nature-kit/flower_purpleA',3],['Potted plant','furniture-kit/pottedPlant',2],['Table','furniture-kit/tableRound',2]] as const;
const initialDecor=():WorldObject[]=>[0,2,4,5].map((n,i)=>({id:`00000000-0000-4000-8000-00000000000${i}`,name:CATALOG[n][0],assetId:CATALOG[n][1],x:i%2?-4:4,y:0,z:1+Math.floor(i/2)*2,rotation:0,scale:CATALOG[n][2],behavior:'decoration',target:''}));
class Boundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div role='alert'>WebGL could not render. Try Chrome/Edge with hardware acceleration.</div>:this.props.children;}}
export default function Preview(){
 const pose=useRef<Pose>({x:0,z:6,angle:Math.PI,moving:false}),input=useRef<ControlInput>({x:0,z:0}),motion=useRef(createCharacterMotion());
 const [quality,setQuality]=useState<'low'|'high'>('low'),[editing,setEditing]=useState(false),[selected,setSelected]=useState<string|null>(null),[tool,setTool]=useState<HabitatTool>('translate');
 const [house,setHouse]=useState<HabitHouseSettings>(DEFAULT_HOUSE_SETTINGS),[decor,setDecor]=useState<WorldObject[]>(initialDecor),[ready,setReady]=useState(false),[saved,setSaved]=useState('Loading local design…');
 useEffect(()=>{try{const raw=localStorage.getItem(STORAGE);if(raw){const d=JSON.parse(raw);const parsed=layoutSchema.safeParse(d.decor);if(parsed.success&&parsed.data.every(o=>getBuildAsset(o.assetId)))setDecor(parsed.data);const h=d.house;if(h&&typeof h.timber==='boolean'&&typeof h.tall==='boolean'&&/^#[0-9a-f]{6}$/i.test(h.roofColor)&&/^#[0-9a-f]{6}$/i.test(h.wallColor))setHouse({timber:h.timber,tall:h.tall,roofColor:h.roofColor,wallColor:h.wallColor});}}catch{setSaved('Could not read local design');}setReady(true);},[]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(STORAGE,JSON.stringify({house,decor}));setSaved('Saved on this browser');}catch{setSaved('Storage unavailable — changes last this visit only');}},[ready,house,decor]);
 const state:WorldState={profile:{id:'local-preview',name:'Visitor',character:'female',variant:'original'},world:{id:'local-preview-world',ownerId:'local-preview',name:'Habit',visibility:'private',revision:0,objects:decor},homeId:null,canEdit:true,players:[],states:{},wallet:null,keyStatus:'not-deployed',worlds:[]};
 const picked=decor.find(o=>o.id===selected);
 const update=(id:string,p:Partial<WorldObject>)=>setDecor(items=>items.map(o=>{if(o.id!==id)return o;const v=worldObjectSchema.safeParse({...o,...p});return v.success?v.data:o;}));
 const add=(entry:typeof CATALOG[number])=>{if(decor.length>=120)return;const id=crypto.randomUUID();setDecor(items=>[...items,{id,name:entry[0],assetId:entry[1],x:2+(items.length%4),y:0,z:5+Math.floor(items.length%12/4),rotation:0,scale:entry[2],behavior:'decoration',target:''}]);setSelected(id);};
 return <main className='habit-preview' data-decor-count={decor.length}>
  <Boundary><Stage state={state} houseSettings={house} pose={pose} input={input} motion={motion} editing={editing} locked={false} selected={selected} draft={decor} onSelect={setSelected} onUse={()=>{}} sitting={false} celebrate={false} interactedAt={0} quality={quality} advancedBuilder tool={tool} snap onTransform={update}/></Boundary>
  <header className='habit-header'><div><strong>Habit</strong><small>Your home. Your little world.</small></div><span>NO WALLET</span><button aria-pressed={editing} onClick={()=>{setEditing(!editing);input.current={x:0,z:0};}}>{editing?'Done editing':'Edit home'}</button><label>Graphics <select aria-label='Graphics' value={quality} onChange={e=>setQuality(e.target.value as 'low'|'high')}><option value='low'>Low</option><option value='high'>High</option></select></label><Link href='/courtyard'>Common Ground ↗</Link></header>
  {editing&&<aside className='habit-editor' aria-label='Home editor'>
   <h2>My house</h2><p>One home, made yours.</p>
   <label>Wall style<select aria-label='Wall style' value={house.timber?'timber':'plaster'} onChange={e=>setHouse(h=>({...h,timber:e.target.value==='timber'}))}><option value='plaster'>Plaster</option><option value='timber'>Timber</option></select></label>
   <label>Roof shape<select aria-label='Roof shape' value={house.tall?'tall':'low'} onChange={e=>setHouse(h=>({...h,tall:e.target.value==='tall'}))}><option value='low'>Low gable</option><option value='tall'>Tall gable</option></select></label>
   <label>Roof color<input aria-label='Roof color' type='color' value={house.roofColor} onChange={e=>setHouse(h=>({...h,roofColor:e.target.value}))}/></label>
   <label>Wall color<input aria-label='Wall color' type='color' value={house.wallColor} onChange={e=>setHouse(h=>({...h,wallColor:e.target.value}))}/></label>
   <div className='habit-catalog'>{[['Terracotta','#bd7356'],['Sage','#789b82'],['Slate','#718595']].map(([name,color])=><button key={name} onClick={()=>setHouse(h=>({...h,roofColor:color}))}>{name} roof</button>)}</div>
   <h2>Decorations</h2><p>Add, select, move, rotate, resize or remove.</p><div className='habit-catalog'>{CATALOG.map(a=><button key={a[0]} disabled={decor.length>=120} onClick={()=>add(a)}>+ {a[0]}</button>)}</div>
   <label>Selected decoration<select aria-label='Selected decoration' value={selected??''} onChange={e=>setSelected(e.target.value||null)}><option value=''>Choose an item</option>{decor.map((o,i)=><option key={o.id} value={o.id}>{i+1}. {o.name}</option>)}</select></label>
   {picked&&<section aria-label='Decoration controls'><div className='habit-catalog'>{(['translate','rotate','scale'] as const).map(t=><button key={t} aria-pressed={tool===t} onClick={()=>setTool(t)}>{t==='translate'?'Move':t==='rotate'?'Rotate':'Resize'}</button>)}</div>
    {(['x','y','z','rotation','scale'] as const).map(k=><label key={k}>{k}<input aria-label={`Decoration ${k}`} type='number' step={k==='rotation'?.25:.1} value={Number(picked[k].toFixed(2))} onChange={e=>{if(e.target.value!=='')update(picked.id,{[k]:Number(e.target.value)});}}/></label>)}
    <button onClick={()=>{setDecor(a=>a.filter(o=>o.id!==picked.id));setSelected(null);}}>Remove decoration</button>
   </section>}
   <p className='habit-save' role='status'>{saved}</p><small>Local design only. No wallet or cloud save.</small>
  </aside>}
  <footer className='habit-footer'><span>{editing?'Drag the selected item’s handles, or use the controls.':'WASD / arrows: walk · drag: orbit · scroll: zoom'}<small>{saved}</small></span>{!editing&&<div>{([['←',-1,0],['↑',0,-1],['↓',0,1],['→',1,0]] as const).map(([label,x,z])=><button key={label} aria-label={`Move ${label}`} style={{touchAction:'none'}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.current={x,z};}} onPointerUp={()=>{input.current={x:0,z:0};}} onPointerCancel={()=>{input.current={x:0,z:0};}} onLostPointerCapture={()=>{input.current={x:0,z:0};}}>{label}</button>)}</div>}</footer>
 </main>;
}
