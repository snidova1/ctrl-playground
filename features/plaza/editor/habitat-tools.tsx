'use client';
/* eslint-disable @next/next/no-img-element -- Thumbnails are local preoptimized catalog WebP assets. */
import {useMemo,useState} from 'react';
import {BUILD_ASSETS,BUILD_ASSET_CATEGORIES} from '@/features/plaza/build-assets';
import {behaviorSchema,type WorldObject,type WorldState} from '@/features/habitat/types';
import {Copy,Grid2X2,Move3D,RotateCw,Scaling,Search,Trash2,Undo2,Redo2,Check, X} from 'lucide-react';
import './habitat-tools.css';

export type HabitatTool='translate'|'rotate'|'scale';
interface Props {
  objects:WorldObject[];
  selectedId:string|null;
  onSelect:(id:string|null)=>void;
  onAdd:(id:string,name:string,behavior:WorldObject['behavior'])=>void;
  onPatch:(p:Partial<WorldObject>)=>void;
  onDuplicate:()=>void;
  onDelete:()=>void;
  onUndo:()=>void;
  onRedo:()=>void;
  canUndo:boolean;
  canRedo:boolean;
  busy:boolean;
  online:boolean;
  onSave:()=>void;
  onCancel:()=>void;
  tool:HabitatTool;
  onTool:(tool:HabitatTool)=>void;
  snap:boolean;
  onSnap:(value:boolean)=>void;
  worlds:WorldState['worlds'];
}
const primitives=[
  ['ctrl-block','Block','solid'],
  ['ctrl-seat','Seat','seat'],
  ['ctrl-lamp','Lamp','light'],
  ['ctrl-door','Door','door'],
  ['ctrl-switch','Switch','switch'],
  ['ctrl-portal','Portal','portal'],
  ['ctrl-marker','Checkpoint','checkpoint'],
] as const;
const AXES={
  x:{min:-14,max:14,step:.25},
  y:{min:0,max:8,step:.25},
  z:{min:-8,max:12,step:.25},
  rotation:{min:-100,max:100,step:.1},
  scale:{min:.25,max:4,step:.1},
} as const;
const labels:Record<string,string>={architecture:'Architecture',furniture:'Furniture',nature:'Nature',food:'Props',roads:'Roads',playground:'Game pieces'};
export default function HabitatBuilderTools(props:Props){
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('all');
  const [page,setPage]=useState(0);
  const [mobilePanel,setMobilePanel]=useState<'assets'|'inspect'>('assets');
  const chosen=props.objects.find(o=>o.id===props.selectedId);
  const selectedAsset=chosen?BUILD_ASSETS.find(a=>a.id===chosen.assetId):null;
  const matches=useMemo(()=>BUILD_ASSETS.filter(a=>(category==='all'||a.category===category)&&(a.name+' '+a.id).toLowerCase().includes(query.trim().toLowerCase())),[category,query]);
  const shown=matches.slice(page*36,(page+1)*36);
  const updateNumber=(key:keyof typeof AXES,value:number)=>{
    if(!Number.isFinite(value)||!chosen)return;
    const limit=AXES[key];
    const clamped=Math.max(limit.min,Math.min(limit.max,value));
    const next=props.snap&&key!=='rotation'?Math.round(clamped/(key==='scale'?.1:.5))*(key==='scale'?.1:.5):clamped;
    props.onPatch({[key]:Number(next.toFixed(3))});
  };
  return <>
    <div className='hb-advanced-bar' role='toolbar' aria-label='3D world tools'>
      <strong><span>CTRL</span> / BUILD</strong>
      <div className='hb-advanced-tools'>
        {(['translate','rotate','scale'] as const).map(tool=><button key={tool} type='button' aria-pressed={props.tool===tool} onClick={()=>props.onTool(tool)}>
          {tool==='translate'?<Move3D size={16}/>:tool==='rotate'?<RotateCw size={16}/>:<Scaling size={16}/>}
          <span>{tool==='translate'?'Move':tool==='rotate'?'Rotate':'Scale'}</span>
        </button>)}
        <button type='button' aria-pressed={props.snap} onClick={()=>props.onSnap(!props.snap)}><Grid2X2 size={16}/><span>Snap</span></button>
        <button type='button' aria-label='Undo' disabled={!props.canUndo} onClick={props.onUndo}><Undo2 size={16}/></button>
        <button type='button' aria-label='Redo' disabled={!props.canRedo} onClick={props.onRedo}><Redo2 size={16}/></button>
      </div>
      <div className='hb-advanced-commit'><button type='button' onClick={props.onCancel}><X size={14}/> Cancel</button><button type='button' className='hb-primary' disabled={props.busy||!props.online} onClick={props.onSave}><Check size={14}/> {props.busy?'Saving…':'Save & Play'}</button></div>
    </div>
    <div className='hb-advanced-tabs'>
      <button onClick={()=>setMobilePanel('assets')} aria-pressed={mobilePanel==='assets'}>Catalog · {BUILD_ASSETS.length}</button>
      <button onClick={()=>setMobilePanel('inspect')} aria-pressed={mobilePanel==='inspect'}>Inspector · {props.objects.length}</button>
    </div>
    <aside className={'hb-catalog hb-advanced-library'+(mobilePanel==='assets'?' is-mobile-active':'')} aria-label='World object catalog'>
      <div className='hb-advanced-heading'><small>OBJECTS / {BUILD_ASSETS.length}</small><h2>Build inside your world.</h2></div>
      <label className='hb-advanced-search'><Search size={16}/><input aria-label='Search world assets' placeholder='Search walls, trees, furniture...' value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label>
      <div className='hb-advanced-categories'><button aria-pressed={category==='all'} onClick={()=>{setCategory('all');setPage(0);}}>All</button>{BUILD_ASSET_CATEGORIES.map(c=><button key={c} aria-pressed={category===c} onClick={()=>{setCategory(c);setPage(0);}}>{labels[c]??c}</button>)}</div>
      <details className='hb-advanced-primitives'><summary>Interactive pieces</summary><div className='hb-primitives'>{primitives.map(([id,name,behavior])=><button key={id} onClick={()=>{props.onAdd(id,name,behavior);setMobilePanel('inspect');}}>{name} +</button>)}</div></details>
      <div className='hb-advanced-assets'>{shown.map(a=><button title={a.id} key={a.id} onClick={()=>{props.onAdd(a.id,a.name,a.collision==='solid'?'solid':'decoration');setMobilePanel('inspect');}}>
        <img src={a.thumbnailUrl} loading='lazy' alt=''/><span>{a.name}</span>
      </button>)}</div>
      {matches.length===0&&<p className='hb-small'>No models match this search.</p>}
      <div className='hb-advanced-paging'><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span>{matches.length? page+1:0}/{Math.max(1,Math.ceil(matches.length/36))}</span><button disabled={(page+1)*36>=matches.length} onClick={()=>setPage(p=>p+1)}>Next</button></div>
    </aside>
    <aside className={'hb-inspector hb-advanced-inspector'+(mobilePanel==='inspect'?' is-mobile-active':'')} aria-label='Selected world object inspector'>
      <small>SELECTED OBJECT</small><h2>{chosen?'Transform':'Select an object'}</h2>
      <p className='hb-small'>{props.objects.length}/120 placed objects</p>
      <select aria-label='Placed objects' value={props.selectedId??''} onChange={e=>props.onSelect(e.target.value||null)}><option value=''>Select placed object</option>{props.objects.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select>
      {chosen?<div className='hb-advanced-properties'>
        <div className='hb-advanced-preview'>{selectedAsset?<img alt='' src={selectedAsset.thumbnailUrl}/>:<div className='hb-advanced-placeholder'>CTRL</div>}<div><strong>{chosen.name}</strong><small>{chosen.assetId}</small></div></div>
        <label>Name<input aria-label='Selected object name' maxLength={60} value={chosen.name} onChange={e=>props.onPatch({name:e.target.value})}/></label>
        <div className='hb-advanced-transform'>
          {(['x','y','z','rotation','scale'] as const).map(key=><label key={key}>{key.toUpperCase()} <input aria-label={'Object '+key} type='number' min={AXES[key].min} max={AXES[key].max} step={AXES[key].step} value={Number(chosen[key].toFixed(2))} onChange={e=>updateNumber(key,Number(e.target.value))}/></label>)}
        </div>
        <label>Behavior<select aria-label='Object behavior' value={chosen.behavior} onChange={e=>props.onPatch({behavior:e.target.value as WorldObject['behavior'],target:''})}>{behaviorSchema.options.map(b=><option key={b}>{b}</option>)}</select></label>
        {chosen.behavior==='switch'&&<label>Target<select aria-label='Switch target' value={chosen.target} onChange={e=>props.onPatch({target:e.target.value})}><option value=''>Choose a target</option>{props.objects.filter(o=>o.id!==chosen.id).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
        {chosen.behavior==='portal'&&<label>World destination<select aria-label='World destination' value={chosen.target} onChange={e=>props.onPatch({target:e.target.value})}><option value=''>Choose world</option>{props.worlds.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>}
        <div className='hb-advanced-object-actions'><button onClick={props.onDuplicate}><Copy size={14}/> Duplicate</button><button onClick={props.onDelete}><Trash2 size={14}/> Delete</button></div>
        
      </div>:<div className='hb-advanced-empty'>Tap a model or object in your world to edit it.</div>}
      
    </aside>
  </>;
}
