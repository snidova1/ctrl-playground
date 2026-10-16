'use client';

import dynamic from 'next/dynamic';
import {Component,useEffect,useRef,useState,type ReactNode} from 'react';
import {layoutSchema,worldObjectSchema,type WorldObject} from '@/features/habitat/types';
import {DEFAULT_HOUSE_SETTINGS,type HabitHouseSettings} from '@/features/habitat/habit-home';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {ATMOSPHERE_LABELS,nextAtmospherePreset,type AtmospherePreset} from '@/features/habitat/atmosphere-presets';
import {intersectsExteriorHouse} from '@/features/habitat/exterior-layout';
import Icon from '@/features/habitat/habit-icons';
import './preview.css';

const Scene=dynamic(()=>import('@/features/habitat/mobile-scene'),{ssr:false,loading:()=> <div className='habit-loading'><span className='habit-spinner'/><span>Preparing your home</span></div>});
const KEY='ctrl-habit-local-v2';
const CATALOG=[
 ['Sofa','furniture-kit/benchCushionLow',4,'Living'],['Chair','furniture-kit/chair',3,'Living'],
 ['Table','furniture-kit/tableRound',2,'Living'],['Bed','furniture-kit/bedDouble',2,'Bedroom'],
 ['Bookcase','furniture-kit/bookcaseOpen',2.4,'Living'],['Floor lamp','furniture-kit/lampRoundFloor',2,'Living'],
 ['Plant','furniture-kit/pottedPlant',2,'Garden'],['Rug','furniture-kit/rugRectangle',2,'Living'],
 ['Fence','nature-kit/fence_simple',2.5,'Garden'],['Flowers','nature-kit/flower_redA',3,'Garden'],
] as const;
type Entry=typeof CATALOG[number];
const PALETTE=[['Terracotta','#bd7356'],['Sage','#789b82'],['Cream','#f3dfb5'],['Blue','#718fae'],['Rose','#ca94a5'],['White','#ffffff']] as const;
const validHouse=(h:HabitHouseSettings)=>h&&typeof h.tall==='boolean'&&typeof h.timber==='boolean'&&/^#[\da-f]{6}$/i.test(h.wallColor)&&/^#[\da-f]{6}$/i.test(h.roofColor);
const displayName=(id:string,fallback:string)=>CATALOG.find(entry=>entry[1]===id)?.[0]??fallback;
function starterRoom():WorldObject[]{
 const places:Array<[number,number,number,number]>=[[0,-2.4,-1.5,0],[2,-2.4,.1,0],[7,-2.4,.1,0],[3,2.5,-1.9,0],[4,4.1,-3.1,0],[5,-4.1,-2.3,0],[6,.6,-3.1,0],[1,-.6,.4,-.6]];
 return places.map(([i,x,z,rotation],n)=>({id:`70000000-0000-4000-8000-00000000000${n}`,name:CATALOG[i][0],assetId:CATALOG[i][1],x,y:0,z,rotation,scale:CATALOG[i][2],behavior:'decoration',target:''}));
}
function readLayout(v:unknown){const parsed=layoutSchema.safeParse(v);return parsed.success?parsed.data.filter(o=>getBuildAsset(o.assetId)).map(o=>({...o,name:displayName(o.assetId,o.name)})):[];}
class Boundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className='habit-error' role='alert'><Icon name='home' size={28}/><strong>We couldn't open your home.</strong><span>Try a browser with WebGL enabled, then reload.</span><button onClick={()=>location.reload()}>Try again</button></div>:this.props.children;}
}
export default function Habit(){
 const [atmosphere,setAtmosphere]=useState<AtmospherePreset>('afternoon');
 const [inside,setInside]=useState(false),[tray,setTray]=useState(false),[painting,setPainting]=useState(false),[help,setHelp]=useState(false);
 const [paintTarget,setPaintTarget]=useState<'wallColor'|'roofColor'>('wallColor');
 const [placing,setPlacing]=useState<Entry|null>(null),[selected,setSelected]=useState<string|null>(null),[house,setHouse]=useState(DEFAULT_HOUSE_SETTINGS);
 const [yard,setYard]=useState<WorldObject[]>([]),[room,setRoom]=useState<WorldObject[]>(starterRoom),[colors,setColors]=useState<Record<string,string>>({});
 const [ready,setReady]=useState(false),[saved,setSaved]=useState('Loading your home…'),[notice,setNotice]=useState('');
 const [query,setQuery]=useState(''),[category,setCategory]=useState('All');
 const latest=useRef({ready:false,house,yard,room,colors});latest.current={ready,house,yard,room,colors};
 const inventoryHeading=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const keys=(event:KeyboardEvent)=>{
   const typing=event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable="true"]');
   if(event.code==='Escape'){setPlacing(null);setSelected(null);setTray(false);setPainting(false);setHelp(false);setNotice('');}
   if(!typing&&!event.repeat&&event.code==='KeyT'&&!inside)setAtmosphere(nextAtmospherePreset);
  };
  window.addEventListener('keydown',keys);return()=>window.removeEventListener('keydown',keys);
 },[inside]);
 useEffect(()=>{
  try{
   const raw=localStorage.getItem(KEY),d=JSON.parse(raw??localStorage.getItem('ctrl-habit-local-v1')??'null');
   if(d){setYard(readLayout(raw?d.yard:d.decor));setRoom(raw?readLayout(d.room):starterRoom());if(validHouse(d.house))setHouse(d.house);if(d.colors&&typeof d.colors==='object')setColors(Object.fromEntries(Object.entries(d.colors).filter(([,v])=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v))) as Record<string,string>);}
  }catch{setNotice('Your previous layout could not be read.');}
  setReady(true);
  const flush=()=>{const v=latest.current;if(v.ready)try{localStorage.setItem(KEY,JSON.stringify({version:2,house:v.house,yard:v.yard,room:v.room,colors:v.colors}));}catch{}};
  window.addEventListener('pagehide',flush);return()=>window.removeEventListener('pagehide',flush);
 },[]);
 useEffect(()=>{
  if(!ready)return;setSaved('Saving…');
  const timer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify({version:2,house,yard,room,colors}));setSaved('Saved on this device');}catch{setSaved('Browser storage is unavailable');}},200);
  return()=>clearTimeout(timer);
 },[ready,house,yard,room,colors]);
 const objects=inside?room:yard,setObjects=inside?setRoom:setYard,picked=objects.find(o=>o.id===selected);
 const extents=(o:WorldObject)=>{const b=getBuildAsset(o.assetId)!.bounds,c=Math.abs(Math.cos(o.rotation)),s=Math.abs(Math.sin(o.rotation));return {hx:(b[0]*c+b[2]*s)*o.scale/2,hz:(b[0]*s+b[2]*c)*o.scale/2};};
 const constrain=(o:WorldObject)=>{
  const {hx,hz}=extents(o);if(inside)return {...o,x:Math.max(-4.85+hx,Math.min(4.85-hx,o.x)),z:Math.max(-3.85+hz,Math.min(3.85-hz,o.z))};
  return {...o,x:Math.max(-14+hx,Math.min(14-hx,o.x)),z:Math.max(-8+hz,Math.min(12-hz,o.z))};
 };
 const update=(id:string,p:Partial<WorldObject>)=>setObjects(items=>items.map(o=>{
  if(o.id!==id)return o;const next=constrain({...o,...p}),{hx,hz}=extents(next);
  if(!inside&&intersectsExteriorHouse(next.x,next.z,hx,hz))return o;
  const parsed=worldObjectSchema.safeParse(next);return parsed.success?parsed.data:o;
 }));
 const select=(id:string|null)=>{setSelected(id);if(id){setTray(false);setPainting(false);setPlacing(null);setHelp(false);}};
 const place=(x:number,z:number)=>{
  if(!placing)return;if(objects.length>=120){setNotice('This space is full. Put something away first.');return;}
  const id=crypto.randomUUID(),o=constrain({id,name:placing[0],assetId:placing[1],x,y:0,z,rotation:0,scale:placing[2],behavior:'decoration',target:''});
  const {hx,hz}=extents(o);if(!inside&&intersectsExteriorHouse(o.x,o.z,hx,hz)){setNotice('Leave a little room around the cottage.');return;}
  setObjects(a=>[...a,o]);setSelected(id);setPlacing(null);setNotice('Placed. Drag it to find the perfect spot.');
 };
 const door=()=>{setInside(a=>!a);setSelected(null);setPlacing(null);setTray(false);setPainting(false);setHelp(false);setNotice('');};
 const closePanel=()=>{setTray(false);setPainting(false);setPlacing(null);setSelected(null);setNotice('');};
 const filtered=CATALOG.filter(a=>(category==='All'||a[3]===category)&&a[0].toLowerCase().includes(query.trim().toLowerCase()));
 const swatches=(kind:'item'|'house')=><div className='habit-swatches'><span className='habit-field-label'>Finish</span>{PALETTE.map(([name,color])=><button className='habit-swatch' key={name} title={name} aria-label={`${kind==='item'?'Color':'Paint'} ${name}`} aria-pressed={kind==='item'?colors[picked!.id]===color:house[paintTarget]===color} onClick={()=>kind==='item'?setColors(c=>({...c,[picked!.id]:color})):setHouse(h=>({...h,[paintTarget]:color}))}><span style={{background:color}}/></button>)}{kind==='item'&&<button className='habit-icon-button' title='Reset color' aria-label='Reset color' onClick={()=>setColors(c=>{const next={...c};delete next[picked!.id];return next;})}><Icon name='reset'/></button>}</div>;
 return <main className='habit-play' data-area={inside?'inside':'yard'} data-item-count={objects.length}>
  <Boundary><Scene inside={inside} objects={objects} selected={selected} placing={!!placing} colors={colors} houseSettings={house} onSelect={select} onPlace={place} onMove={(id,x,z)=>update(id,{x,z})} onDoor={door} atmosphere={atmosphere}/></Boundary>
  <header className='habit-hud' aria-label='Home overview'>
   <div className='habit-brand'><span className='habit-brand-mark'><Icon name='leaf' size={21}/></span><div><strong>CTRL</strong><small>{inside?'Living room':'My cottage'}</small></div></div>
   <div className='habit-hud-tools'>
    {!inside&&<button className='habit-weather' aria-label={`Change atmosphere: ${atmosphere}`} title='Change the light · T' onClick={()=>setAtmosphere(nextAtmospherePreset)}><Icon name={atmosphere==='dusk'?'moon':'sun'} size={17}/><span>{ATMOSPHERE_LABELS[atmosphere]}</span><span className='habit-weather-arrow'>⌄</span></button>}
    <button className='habit-icon-button habit-camera' aria-label='Reset camera' title='Reset camera' onClick={()=>window.dispatchEvent(new Event('habit-reset-camera'))}><Icon name='camera'/></button>
    <span className={`habit-save ${saved==='Saving…'?'is-saving':''}`} role='status' aria-label={saved} title={saved}><Icon name={saved==='Saved on this device'?'check':saved==='Browser storage is unavailable'?'help':'reset'} size={15}/><span>{saved==='Saved on this device'?'Saved':saved==='Saving…'?'Saving…':saved==='Browser storage is unavailable'?'Not saved':'Loading…'}</span></span>
   </div>
  </header>
  <div className='habit-location'><span className='habit-location-dot'/>{inside?'A space to call your own':'A little room to breathe'}</div>
  {(placing||notice)&&<div className='habit-toast' role='status'>{placing?<><Icon name='arrow'/><span>Choose a spot for your {placing[0].toLowerCase()}.</span></>:notice}</div>}
  <div className='habit-support'><button className='habit-icon-button' aria-label='Controls' aria-expanded={help} title='Controls' onClick={()=>setHelp(a=>!a)}><Icon name='help'/></button><span>Drag to look around<span>Scroll or pinch to zoom</span></span></div>
  {help&&<aside className='habit-help' aria-label='Controls guide'><div className='habit-panel-heading'><strong>Make yourself at home</strong><button className='habit-icon-button' aria-label='Close controls' onClick={()=>setHelp(false)}><Icon name='close'/></button></div><dl><dt>Move</dt><dd>Click or tap the ground.</dd><dt>Look around</dt><dd>Drag an empty area.</dd><dt>Zoom</dt><dd>Scroll or pinch.</dd><dt>Decorate</dt><dd>Choose a piece, then drag it into place.</dd><dt>Shortcuts</dt><dd>T · Change light<br/>Esc · Close a panel</dd></dl></aside>}
  {placing?<section className='habit-bottom habit-placement' aria-label='Place furniture'><span className='habit-selection-icon'><Icon name='furnish'/></span><div><small>FIND ITS PLACE</small><strong>{placing[0]}</strong></div><button className='habit-secondary' onClick={closePanel}>Cancel</button></section>
   :picked?<section className='habit-bottom habit-context' aria-label='Selected item'>
    <div className='habit-panel-heading'><div><small>SELECTED PIECE</small><strong>{displayName(picked.assetId,picked.name)}</strong></div><button className='habit-primary' onClick={closePanel}><Icon name='check' size={16}/>Done</button></div>
    <div className='habit-object-actions'><span>Drag it directly to move</span><button aria-label='Rotate item' onClick={()=>update(picked.id,{rotation:picked.rotation+Math.PI/4})}><Icon name='rotate'/>Rotate</button><button aria-label='Store item' onClick={()=>{setObjects(a=>a.filter(o=>o.id!==picked.id));setColors(c=>{const next={...c};delete next[picked.id];return next;});setSelected(null);setNotice('Put away. You can find it in Furnish.');}}><Icon name='store'/>Put away</button></div>
    {swatches('item')}
   </section>
   :tray?<section className='habit-bottom habit-inventory' aria-label='Furniture collection'>
    <div className='habit-panel-heading'><div><small>THE LITTLE DETAILS</small><strong>Make it yours</strong></div><button ref={inventoryHeading} className='habit-icon-button' aria-label='Close furniture' onClick={()=>{setTray(false);setNotice('');}}><Icon name='close'/></button></div>
    <label className='habit-search'><Icon name='search' size={17}/><input type='search' aria-label='Search furniture' placeholder='Find something cozy…' value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className='habit-filters' role='group' aria-label='Furniture category'>{['All','Living','Bedroom','Garden'].map(name=><button key={name} aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}</div>
    <div className='habit-items'>{filtered.map(a=>{const asset=getBuildAsset(a[1])!;return <button key={a[0]} aria-label={`Choose ${a[0]}`} onClick={()=>{setPlacing(a);setTray(false);setNotice('');}}><span className='habit-item-image'><img src={asset.thumbnailUrl} alt='' width={72} height={72} loading='lazy'/><Icon name='arrow' size={14}/></span><span>{a[0]}</span><small>{a[3]}</small></button>;})}{!filtered.length&&<p className='habit-empty'>Nothing here yet. Try another search.</p>}</div>
    <div className='habit-panel-footnote'><Icon name='leaf' size={13}/>Pick a piece. Find its place. Make it home.</div>
   </section>
   :painting?<section className='habit-bottom habit-paint' aria-label='Paint home'><div className='habit-panel-heading'><div><small>A FRESH COAT</small><strong>Your kind of color</strong></div><button className='habit-primary' onClick={()=>setPainting(false)}><Icon name='check' size={16}/>Done</button></div><div className='habit-paint-tabs'><button aria-pressed={paintTarget==='wallColor'} onClick={()=>setPaintTarget('wallColor')}>Walls</button>{!inside&&<button aria-pressed={paintTarget==='roofColor'} onClick={()=>setPaintTarget('roofColor')}>Roof</button>}</div>{swatches('house')}</section>
   :<nav className='habit-bottom habit-dock' aria-label='Home actions'><button aria-label='Furnish' onClick={()=>{setTray(true);setHelp(false);setNotice('');setQuery('');setCategory('All');}}><Icon name='furnish' size={21}/><span>Furnish</span></button><span className='habit-dock-divider'/><button aria-label='Paint home' onClick={()=>{setPainting(true);setPaintTarget('wallColor');setHelp(false);setNotice('');}}><Icon name='paint' size={20}/><span>Paint</span></button>{inside&&objects.length===0&&<button onClick={()=>setRoom(starterRoom())}>Starter room</button>}</nav>}
 </main>;
}
