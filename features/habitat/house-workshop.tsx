'use client';

import {useState, type KeyboardEvent} from 'react';
import type {WorldObject} from './types';
import {getHouseConfig, getHouseEdges, getHouseOpenings, replaceHouse, setHouseOpening, type HouseConfig} from './modular-house';
import './house-workshop.css';

export interface HouseWorkshopProps {
 objects:WorldObject[];
 onChange:(objects:WorldObject[])=>void;
 onClose:()=>void;
 onSave:()=>void;
 busy:boolean;
 online:boolean;
 canUndo:boolean;
 canRedo:boolean;
 onUndo:()=>void;
 onRedo:()=>void;
}

type WorkshopTab='rooms'|'openings'|'finishes';
type Opening='wall'|'door'|'window';
type HouseEdge=ReturnType<typeof getHouseEdges>[number];

/** Actual hex values passed into the house model, not decorative theme presets. */
export const HOUSE_PALETTE=[
 {name:'Ivory',hex:'#faf6eb'}, {name:'Sand',hex:'#d9c5a0'},
 {name:'Terracotta',hex:'#b66d50'}, {name:'Moss',hex:'#65775a'},
 {name:'Walnut',hex:'#795b45'}, {name:'Charcoal',hex:'#394840'},
] as const;

const ROOM_POSITIONS=[
 {x:-1,z:-1,name:'northwest',label:'Barat laut'}, {x:0,z:-1,name:'north',label:'Utara'}, {x:1,z:-1,name:'northeast',label:'Timur laut'},
 {x:-1,z:0,name:'west',label:'Barat'}, {x:0,z:0,name:'center',label:'Tengah'}, {x:1,z:0,name:'east',label:'Timur'},
 {x:-1,z:1,name:'southwest',label:'Barat daya'}, {x:0,z:1,name:'south',label:'Selatan'}, {x:1,z:1,name:'southeast',label:'Tenggara'},
] as const;
const SIDES={north:'utara',east:'timur',south:'selatan',west:'barat'};

/** Keep SVG activation equivalent to a native button, including Space scrolling prevention. */
function activate(event:KeyboardEvent<SVGGElement>,action:()=>void){
 if(event.key==='Enter'||event.key===' '){event.preventDefault();action();}
}

function roomChange(config:HouseConfig,x:number,z:number):HouseConfig {
 const exists=config.cells.some(cell=>cell.x===x&&cell.z===z);
 const cells=exists?config.cells.filter(cell=>cell.x!==x||cell.z!==z):[...config.cells,{x,z}];
 if(!cells.length)throw new Error('Rumah perlu setidaknya satu ruang.');
 const visited=new Set<string>();
 const pending=[cells[0]];
 while(pending.length){
  const cell=pending.pop()!;const key=`${cell.x},${cell.z}`;
  if(visited.has(key))continue;
  visited.add(key);
  for(const other of cells)if(Math.abs(other.x-cell.x)+Math.abs(other.z-cell.z)===1&&!visited.has(`${other.x},${other.z}`))pending.push(other);
 }
 if(visited.size!==cells.length)throw new Error(exists?'Ruang ini menghubungkan ruang lain. Hapus ruang di ujung terlebih dahulu.':'Ruang baru harus menempel pada sisi ruang yang sudah ada.');
 return {...config,cells};
}

function edgeGeometry(edge:HouseEdge){
 const x=28+(edge.cell.x+1)*68,z=28+(edge.cell.z+1)*68;
 switch(edge.side){
  case 'north':return {x1:x+8,y1:z,x2:x+60,y2:z};
  case 'east':return {x1:x+68,y1:z+8,x2:x+68,y2:z+60};
  case 'south':return {x1:x+8,y1:z+68,x2:x+60,y2:z+68};
  case 'west':return {x1:x,y1:z+8,x2:x,y2:z+60};
 }
}
function edgeName(edge:HouseEdge){
 const room=ROOM_POSITIONS.find(cell=>cell.x===edge.cell.x&&cell.z===edge.cell.z);
 return `${room?.label??'Ruang'} · sisi ${SIDES[edge.side]}`;
}
function OpeningMark({kind}:{kind:Opening}){
 return <svg viewBox='0 0 28 28' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'>
  {kind==='door'?<><path d='M6 24V4h16v20M10 24V8l9-3v19Z'/><path d='M16 15v2'/></>:kind==='window'?<><path d='M5 6h18v17H5zM14 6v17M5 14h18M3 25h22'/></>:<><path d='M3 5h22v18H3zM3 11h22M3 17h22M11 5v6M18 11v6M11 17v6'/></>}
 </svg>;
}

function MaterialTiles({title,kind,choices,value,disabled,onPick}:{title:string;kind:'roof'|'wall finish'|'floor finish';choices:readonly {id:string;label:string}[];value:string;disabled:boolean;onPick:(value:string)=>void}){
 return <fieldset className='hb-house-material'><legend>{title}</legend><div className='hb-house-tiles'>
  {choices.map(choice=><button type='button' key={choice.id} aria-label={`House ${kind} ${choice.id}`} aria-pressed={value===choice.id} disabled={disabled} onClick={()=>onPick(choice.id)}>
   <span className='hb-house-tile-art' data-texture={kind==='roof'?undefined:choice.id} aria-hidden='true'>
    {kind==='roof'&&<svg viewBox='0 0 48 36' fill='none' stroke='currentColor' strokeWidth='2'>{choice.id==='gable'?<path d='m4 21 20-15 20 15M9 19v12h30V19M24 6v15'/>:<path d='M6 15h36v5H6zM9 20v11h30V20M11 11h26'/>}</svg>}
   </span><span>{choice.label}</span>
  </button>)}
 </div></fieldset>;
}

function ColorSwatches({surface,title,value,disabled,onPick}:{surface:'wall'|'roof'|'floor';title:string;value:string;disabled:boolean;onPick:(color:string)=>void}){
 const current=HOUSE_PALETTE.find(color=>color.hex.toLowerCase()===value.toLowerCase());
 return <fieldset className='hb-house-material'><legend>{title}</legend><div className='hb-house-swatches'>
  {HOUSE_PALETTE.map(color=><button type='button' key={color.hex} aria-label={`House ${surface} color ${color.name}`} title={`${color.name} · ${color.hex}`} aria-pressed={value.toLowerCase()===color.hex} disabled={disabled} onClick={()=>onPick(color.hex)}><span style={{backgroundColor:color.hex}} aria-hidden='true'>{value.toLowerCase()===color.hex?'✓':''}</span></button>)}
 </div><p className='hb-house-color-caption'><i style={{backgroundColor:value}} aria-hidden='true'/>{current?.name??'Warna saat ini'} · {value}</p></fieldset>;
}

/** The parent owns every WorldObject (and its shared undo/redo history). Only navigation is local. */
export default function HouseWorkshop({objects,onChange,onClose,onSave,busy,online,canUndo,canRedo,onUndo,onRedo}:HouseWorkshopProps){
 const [tab,setTab]=useState<WorkshopTab>('rooms');
 const [selectedEdgeId,setSelectedEdgeId]=useState<string|null>(null);
 const [error,setError]=useState('');
 const config=getHouseConfig(objects);
 const edges=getHouseEdges(config);
 const openings=getHouseOpenings(objects);
 const openingKind=(edge:HouseEdge):Opening=>openings.find(opening=>opening.edgeId===edge.id)?.kind??'wall';
 const selected=edges.find(edge=>edge.id===selectedEdgeId)??edges[0];
 const selectedKind=selected?openingKind(selected):'wall';
 const locked=busy||!online;
 const doorCount=edges.filter(edge=>openingKind(edge)==='door').length;
 const lastDoor=selectedKind==='door'&&doorCount<=1;

 function commit(change:()=>WorldObject[]){
  if(locked)return;
  try{
   const next=change();
   if(next.length>120)throw new Error('Maksimal 120 objek di dunia. Hapus beberapa perabot sebelum menambah ruang.');
   if(doorCount>0&&!getHouseOpenings(next).some(opening=>opening.kind==='door'))throw new Error('Perubahan ini menghilangkan pintu terakhir. Pasang pintu lain di sisi luar sebelum mengubah ruang ini.');
   onChange(next);setError('');
  }catch(reason){
   const message=reason instanceof Error?reason.message:'Perubahan tidak valid. Coba ruang atau sisi lain.';
   setError(/120|object limit/i.test(message)?'Maksimal 120 objek di dunia. Hapus beberapa perabot sebelum menambah ruang.':message);
  }
 }
 function changeOpening(kind:Opening){
  if(!selected||locked)return;
  if(lastDoor&&kind!=='door'){setError('Sisakan setidaknya satu pintu agar rumah tetap bisa dimasuki.');return;}
  if(kind!==selectedKind)commit(()=>setHouseOpening(objects,selected.id,kind));
 }
 function selectTab(value:WorkshopTab){setTab(value);setError('');}
 function paint(values:Partial<Pick<HouseConfig,'wallColor'|'roofColor'|'floorColor'|'roofStyle'|'wallFinish'|'floorFinish'>>){commit(()=>replaceHouse(objects,{...config,...values}));}

 return <section className='hb-house-workshop' aria-label='House workshop'>
  <header className='hb-house-header'><span className='hb-house-eyebrow'>THE HOUSE WORKSHOP</span><h2>Rumah, caramu<span>.</span></h2><p>Hanya pemilik · perubahan langsung terlihat di dunia.</p></header>
  <nav className='hb-house-nav' aria-label='House workshop sections'>
   {([{id:'rooms',label:'Ruang'},{id:'openings',label:'Pintu & jendela'},{id:'finishes',label:'Material'}] as const).map(item=><button type='button' key={item.id} aria-pressed={tab===item.id} onClick={()=>selectTab(item.id)}>{item.label}</button>)}
  </nav>
  <div className='hb-house-body'>
   {tab!=='finishes'?<>
    <div className='hb-house-section-heading'><h3>{tab==='rooms'?'Susun ruangmu':'Pilih sisi luar rumah'}</h3><span>{config.cells.length} / 9 ruang · 3 × 3 m</span></div>
    <p className='hb-house-hint'>{tab==='rooms'?'Ketuk + untuk menambah ruang. Ketuk ruang terisi untuk menghapus; semua ruang harus tersambung.':'Ketuk garis dinding pada denah, lalu pilih pintu, jendela, atau dinding utuh.'}</p>
    <svg className='hb-house-plan' viewBox='0 0 260 260' role='group' aria-label='House floor plan'>
     <text x='130' y='14' textAnchor='middle' className='hb-house-plan-direction'>UTARA</text>
     {ROOM_POSITIONS.map(cell=>{
      const occupied=config.cells.some(room=>room.x===cell.x&&room.z===cell.z);
      const disabled=locked||tab!=='rooms';
      const action=()=>{if(!disabled)commit(()=>replaceHouse(objects,roomChange(config,cell.x,cell.z)));};
      const x=28+(cell.x+1)*68,z=28+(cell.z+1)*68;
      return <g key={cell.name} className={`hb-house-cell${occupied?' is-room':''}`} role='button' tabIndex={disabled?-1:0} aria-label={`${occupied?'Remove':'Add'} room ${cell.name}`} aria-disabled={disabled} onClick={action} onKeyDown={event=>activate(event,action)}>
       <rect x={x+10} y={z+10} width='48' height='48' rx='5'/><text x={x+34} y={z+31} textAnchor='middle' className='hb-house-cell-mark'>{occupied?'−':'+'}</text><text x={x+34} y={z+48} textAnchor='middle' style={{fontSize:8}}>{cell.label}</text>
      </g>;
     })}
     {edges.map(edge=>{
      const geometry=edgeGeometry(edge),kind=openingKind(edge),disabled=locked||tab!=='openings';
      const action=()=>{if(!disabled){setSelectedEdgeId(edge.id);setError('');}};
      return <g key={edge.id} data-edge-id={edge.id} data-kind={kind} className='hb-house-edge' role='button' tabIndex={disabled?-1:0} aria-label={`Select outside wall ${edgeName(edge)}`} aria-pressed={tab==='openings'&&selected?.id===edge.id} aria-disabled={disabled} onClick={action} onKeyDown={event=>activate(event,action)}>
       <title>{edgeName(edge)} · {kind==='door'?'Pintu':kind==='window'?'Jendela':'Dinding'}</title><line {...geometry} className='hb-house-edge-line'/><rect className='hb-house-edge-hit' x={Math.min(geometry.x1,geometry.x2)-14} y={Math.min(geometry.y1,geometry.y2)-14} width={Math.abs(geometry.x2-geometry.x1)+28} height={Math.abs(geometry.y2-geometry.y1)+28}/>
      </g>;
     })}
    </svg>
    <div className='hb-house-plan-key' aria-hidden='true'><span><i/>Dinding</span><span><i className='is-door'/>Pintu</span><span><i className='is-window'/>Jendela</span></div>
    {tab==='openings'&&<>
     <p className='hb-house-opening-caption'>{selected?edgeName(selected):'Pilih sisi luar pada denah.'}</p>
     <div className='hb-house-opening-actions'>{([{id:'door',label:'Pintu',accessible:'Place door'},{id:'window',label:'Jendela',accessible:'Place window'},{id:'wall',label:'Dinding utuh',accessible:'Solid wall'}] as const).map(item=><button type='button' key={item.id} aria-label={item.accessible} aria-pressed={selectedKind===item.id} disabled={locked||!selected||(lastDoor&&item.id!=='door')} onClick={()=>changeOpening(item.id)}><OpeningMark kind={item.id}/>{item.label}</button>)}</div>
     {lastDoor&&<p className='hb-house-hint'>Pintu terakhir tetap dipertahankan. Pasang pintu lain sebelum menggantinya.</p>}
    </>}
   </>:<>
    <p className='hb-house-hint'>Bentuk dan warna diterapkan ke seluruh rumah.</p>
    <MaterialTiles title='Bentuk atap' kind='roof' choices={[{id:'gable',label:'Pelana'},{id:'flat',label:'Datar'}]} value={config.roofStyle} disabled={locked} onPick={value=>paint({roofStyle:value as HouseConfig['roofStyle']})}/>
    <MaterialTiles title='Permukaan dinding' kind='wall finish' choices={[{id:'plaster',label:'Plester'},{id:'timber',label:'Kayu'}]} value={config.wallFinish} disabled={locked} onPick={value=>paint({wallFinish:value as HouseConfig['wallFinish']})}/>
    <MaterialTiles title='Permukaan lantai' kind='floor finish' choices={[{id:'wood',label:'Papan kayu'},{id:'tile',label:'Ubin'}]} value={config.floorFinish} disabled={locked} onPick={value=>paint({floorFinish:value as HouseConfig['floorFinish']})}/>
    <ColorSwatches surface='wall' title='Warna dinding' value={config.wallColor} disabled={locked} onPick={wallColor=>paint({wallColor})}/>
    <ColorSwatches surface='roof' title='Warna atap' value={config.roofColor} disabled={locked} onPick={roofColor=>paint({roofColor})}/>
    <ColorSwatches surface='floor' title='Warna lantai' value={config.floorColor} disabled={locked} onPick={floorColor=>paint({floorColor})}/>
   </>}
  </div>
  {(error||!online||objects.length>=120)&&<p className='hb-house-feedback' role={error?'alert':'status'}>{error||(!online?'Sedang offline. Sambungkan kembali untuk mengubah dan menyimpan rumah.':'Batas 120 objek tercapai. Hapus perabot jika ingin menambah ruang.')}</p>}
  <footer className='hb-house-footer'>
   <div className='hb-house-footer-top'><div className='hb-house-history'><button type='button' aria-label='Undo house change' title='Urungkan' disabled={locked||!canUndo} onClick={()=>{if(!locked&&canUndo){setError('');onUndo();}}}>↶</button><button type='button' aria-label='Redo house change' title='Ulangi' disabled={locked||!canRedo} onClick={()=>{if(!locked&&canRedo){setError('');onRedo();}}}>↷</button></div><small role='status'>{busy?'Menyimpan rumah…':`${objects.length} / 120 objek`}</small></div>
   <div className='hb-house-confirm'><button type='button' aria-label='Cancel house changes' disabled={busy} onClick={()=>{if(!busy)onClose();}}>Batal</button><button type='button' className='hb-house-save' aria-label='Save house' disabled={locked||objects.length>120} onClick={()=>{if(!locked&&objects.length<=120)onSave();}}>{busy?'Menyimpan…':'Simpan rumah'}</button></div>
  </footer>
 </section>;
}
