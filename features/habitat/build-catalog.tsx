'use client';
/* eslint-disable @next/next/no-img-element -- Existing local, preoptimized WebP thumbnails. */
import {useEffect,useRef,useState} from 'react';
import {BUILD_ASSETS} from '@/features/plaza/build-assets';
import type {WorldObject} from './types';
import BuildInspector from './build-inspector';
import {inferFurnitureBehavior} from './furniture-interactions';
import {isHouseObject} from './modular-house';
import {BUILD_CATEGORIES,BUILD_COLLECTIONS,catalogPage,collectionAssets,placedAssetCounts,type BuildCategory,type BuildCollection} from './build-catalog-model';
import './build-catalog.css';

export function BuildIcon({name}:{name:string}){
 const paths:Record<string,string>={
  all:'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  furniture:'M5 13V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5 M4 11v7h16v-7 M7 18v3 M17 18v3 M4 14h16',
  nature:'M12 21v-8 M12 16C4 17 3 10 4 5c6 0 9 4 8 11Z M12 13c0-6 3-9 8-9 1 5-2 9-8 9',
  architecture:'m3 11 9-8 9 8 M5 10v11h14V10 M10 21v-7h4v7',
  food:'M6 3v6 M3 3v4a3 3 0 0 0 6 0V3 M6 10v11 M18 3c-4 2-4 9 0 9V3v18',
  roads:'m8 3-5 18 M16 3l5 18 M12 3v3 M12 10v4 M12 18v3',
  playground:'M5 21V4h6v17 M5 9h6 M5 14h6 M11 4h3l5 14h2 M3 21h10',
  interactive:'m13 2-8 12h6l-1 8 9-13h-7z',
  search:'m16 16 5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  undo:'m8 4-5 5 5 5 M3 9h10a7 7 0 0 1 7 7v4',
  redo:'m16 4 5 5-5 5 M21 9H11a7 7 0 0 0-7 7v4',
  plus:'M12 5v14 M5 12h14',
  shelf:'M4 4h16v16H4z M4 12h16 M9 4v8 M15 12v8',
 };
 return <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d={paths[name]??paths.interactive}/></svg>;
}

export interface BuildShelfProps {
 objects:readonly WorldObject[];
 selectedId:string|null;
 query:string;
 category:BuildCategory;
 page:number;
 onQuery:(query:string)=>void;
 onCategory:(category:BuildCategory)=>void;
 onPage:(page:number)=>void;
 onAdd:(assetId:string,name:string,behavior?:WorldObject['behavior'])=>void;
 collection?:BuildCollection;
 onCollection?:(collection:BuildCollection)=>void;
 placedOnly?:boolean;
 onPlacedOnly?:(placedOnly:boolean)=>void;
}

/** Pure shelf view: real thumbnails and callbacks, with no scene or persistence side effects. */
export function BuildShelf({objects,selectedId,query,category,page,onQuery,onCategory,onPage,onAdd:requestAdd,collection='all',onCollection,placedOnly=false,onPlacedOnly}:BuildShelfProps){
 const full=objects.length>=120;
 const onAdd:BuildShelfProps['onAdd']=(id,name,behavior)=>{if(full)return;const inferred=inferFurnitureBehavior(id);requestAdd(id,name,inferred==='decoration'?behavior:inferred);};
 const counts=placedAssetCounts(objects),filters={collection,placedIds:placedOnly?new Set(counts.keys()):undefined};
 const result=catalogPage(category,query,page,filters);
 const selectedAsset=objects.find(object=>object.id===selectedId)?.assetId;
 const label=BUILD_CATEGORIES.find(item=>item.id===category)!.label;
 const inspiration=BUILD_COLLECTIONS.find(item=>item.id===collection);
 const chooseCategory=(value:BuildCategory)=>{onCollection?.('all');onCategory(value);};
 const reset=()=>{onQuery('');onCategory('all');onCollection?.('all');onPlacedOnly?.(false);onPage(0);};
 const heading=query.trim()?'Your little finds':inspiration?.label??(placedOnly?'Already at home':category==='all'?'A little something for your world':label);
 return <section className='hb-catalog hb-build-catalog' aria-label='Furniture catalog'>
  <div className='hb-build-search-row'>
   <label className='hb-build-search'><BuildIcon name='search'/><input type='text' aria-label='Search assets' placeholder='Try “lamp”, “garden” or “tea”…' value={query} onChange={event=>onQuery(event.target.value)}/>{query&&<button type='button' aria-label='Clear asset search' onClick={()=>onQuery('')}>×</button>}</label>
   <select className='hb-build-category-select' aria-label='Asset category' value={category} onChange={event=>chooseCategory(event.target.value as BuildCategory)}>{BUILD_CATEGORIES.map(item=><option value={item.id} key={item.id}>{item.id==='all'?`All assets / ${BUILD_ASSETS.length}`:item.label}</option>)}</select>
  </div>
  <nav className='hb-build-categories' aria-label='Build categories'>{BUILD_CATEGORIES.map(item=><button type='button' key={item.id} aria-pressed={category===item.id} onClick={()=>chooseCategory(item.id)}><BuildIcon name={item.id}/><span>{item.label}</span></button>)}</nav>
  <div className='hb-build-shelf-caption'><div><span className='hb-build-shelf-kicker'>{inspiration?'A CURATED COLLECTION':query.trim()?'FOUND ON THE SHELVES':'COLLECT A LITTLE COZY'}</span><h2>{heading}</h2></div><div className='hb-build-shelf-tools'>{onPlacedOnly&&<button type='button' className='hb-build-owned-filter' aria-label='Show pieces already in your world' aria-pressed={placedOnly} onClick={()=>onPlacedOnly(!placedOnly)}><BuildIcon name='architecture'/><span>At home</span></button>}<span role='status' aria-live='polite'>{result.count} {result.count===1?'piece':'pieces'}</span></div></div>
  <div className='hb-build-shelf-scroll'>
   {onCollection&&category==='all'&&!query.trim()&&!placedOnly&&<div className='hb-build-collections' role='group' aria-label='Curated collections'>{BUILD_COLLECTIONS.map(item=><button type='button' key={item.id} data-tone={item.tone} aria-label={`Browse ${item.label}`} aria-pressed={collection===item.id} onClick={()=>{onCollection(collection===item.id?'all':item.id);onPage(0);}}><span className='hb-build-collection-art' aria-hidden='true'>{collectionAssets(item.id).slice(0,3).map(asset=><img key={asset.id} src={asset.thumbnailUrl} width={40} height={40} alt='' loading='lazy'/>)}</span><span><strong>{item.label}</strong><small>{item.assets.length} handpicked pieces <span aria-hidden='true'>↗</span></small></span></button>)}</div>}
   {inspiration&&<div className='hb-build-collection-note'><span>{inspiration.hint} Choose pieces one at a time.</span><button type='button' aria-label='Clear collection filter' onClick={()=>{onCollection?.('all');onPage(0);}}>All pieces <span aria-hidden='true'>×</span></button></div>}
   {result.count===0?<div className='hb-build-empty'><BuildIcon name='shelf'/><h3>{placedOnly?'A fresh little beginning.':'No little treasures here.'}</h3><p>{query.trim()?`No matches for “${query.trim()}”. Try a simpler word or a different shelf.`:placedOnly?'Pieces you place will appear here. Browse the catalog to find your first favorite.':'This shelf is empty with your current filters. Try another collection.'}</p><button type='button' onClick={reset}>Show all pieces</button></div>:category==='interactive'?<div className='hb-build-interactive'><p className='hb-build-interactive-note'>A little life for your world. Choose a piece, then connect it in “How it behaves”.</p><div className='hb-primitives'>{result.pieces.map(piece=><button type='button' disabled={full} key={piece.id} aria-label={`Add ${piece.name}`} onClick={()=>onAdd(piece.id,piece.name,piece.behavior)}><span className='hb-build-piece-mark' aria-hidden='true'><BuildIcon name={piece.behavior==='seat'?'furniture':piece.behavior==='door'?'architecture':'interactive'}/></span><span><strong>{piece.name}</strong><small>{piece.hint}</small></span><span aria-hidden='true'>+</span></button>)}</div></div>:<div className='hb-assets hb-build-assets'>{result.assets.map(asset=>{
    const behavior=inferFurnitureBehavior(asset.id),kind=behavior==='seat'?'Take a seat':behavior==='light'?'Warm light':behavior==='door'?'Working door':BUILD_CATEGORIES.find(item=>item.id===asset.category)!.label;
    return <button type='button' key={asset.id} disabled={full} data-category={asset.category} aria-label={`Add ${asset.name}`} aria-description={`${kind}. Choose this piece, then confirm its position in your world.`} aria-pressed={selectedAsset===asset.id} onClick={()=>onAdd(asset.id,asset.name,asset.collision==='solid'?'solid':'decoration')}><span className='hb-build-asset-art'><img src={asset.thumbnailUrl} alt='' width={112} height={104} loading='lazy' decoding='async'/>{counts.has(asset.id)&&<span className='hb-build-asset-count' aria-label={`${counts.get(asset.id)} placed`}>{selectedAsset===asset.id?'✓ · ':''}{counts.get(asset.id)}</span>}<span className='hb-build-add' aria-hidden='true'>+</span></span><span className='hb-build-asset-name'>{asset.name}</span><span className='hb-build-asset-kind'><BuildIcon name={behavior==='seat'?'furniture':behavior==='light'?'interactive':asset.category}/>{kind}</span></button>;
   })}</div>}
  </div>
  <div className='hb-build-pagination'><span>{full?'Your world is full · remove a piece to add more':'Choose a piece. Find its place. Make it yours.'}</span><div><button type='button' disabled={result.page===0} onClick={()=>onPage(result.page-1)} aria-label='Previous'>←</button><span aria-label='Catalog page'>{result.page+1} / {result.pages}</span><button type='button' disabled={result.page+1>=result.pages} onClick={()=>onPage(result.page+1)} aria-label='Next'>→</button></div></div>
 </section>;
}

export interface BuildCatalogProps {
 objects:readonly WorldObject[];
 selectedId:string|null;
 worlds?:ReadonlyArray<{id:string;name:string}>;
 busy:boolean;
 online:boolean;
 canUndo:boolean;
 canRedo:boolean;
 onSelect:(id:string|null)=>void;
 onAdd:BuildShelfProps['onAdd'];
 onPatch:(values:Partial<WorldObject>)=>void;
 onDuplicate:()=>void;
 onDelete:()=>void;
 onUndo:()=>void;
 onRedo:()=>void;
 onSave:()=>void;
 onCancel:()=>void;
 onMove?:()=>void;
}

/** One dock, one mobile sheet. The save/cancel/history rail never scrolls away. */
export default function BuildCatalog({objects,selectedId,worlds=[],busy,online,canUndo,canRedo,onSelect,onAdd,onPatch,onDuplicate,onDelete,onUndo,onRedo,onSave,onCancel,onMove}:BuildCatalogProps){
 const [query,setQuery]=useState(''),[category,setCategory]=useState<BuildCategory>('all'),[page,setPage]=useState(0);
 const [collection,setCollection]=useState<BuildCollection>('all'),[placedOnly,setPlacedOnly]=useState(false);
 const dock=useRef<HTMLElement>(null);
 const [view,setView]=useState<'catalog'|'object'>('catalog'),[collapsed,setCollapsed]=useState(false);
 const chosen=objects.find(object=>object.id===selectedId);
 useEffect(()=>{if(selectedId)setView('object');},[selectedId]);
 useEffect(()=>{const shelf=dock.current?.querySelector('.hb-build-shelf-scroll');if(shelf)shelf.scrollTop=0;},[query,category,page,collection,placedOnly]);
 return <section ref={dock} className={`hb-build-dock${collapsed?' is-collapsed':''}`} data-build-view={view} aria-label='Build workshop'>
  <header className='hb-build-header'><div><span className='hb-build-eyebrow'>THE LITTLE WORKSHOP</span><h1>Make room for you<span>.</span></h1></div><div className='hb-build-header-actions'><span>{objects.length}<small> / 120 placed</small></span><button type='button' aria-label={collapsed?'Expand build catalog':'Minimize build catalog'} aria-expanded={!collapsed} onClick={()=>setCollapsed(value=>!value)}>{collapsed?'+':'−'}</button></div></header>
  <div className='hb-build-tabs' role='group' aria-label='Workshop view'><button type='button' aria-pressed={view==='catalog'} onClick={()=>{setView('catalog');setCollapsed(false);}}><BuildIcon name='shelf'/>The catalog</button><button type='button' aria-pressed={view==='object'} onClick={()=>{setView('object');setCollapsed(false);}}><BuildIcon name='furniture'/>{chosen?'Selected piece':'Your pieces'}<span>{objects.length}</span></button></div>
  <div className='hb-build-body'>
   <BuildShelf objects={objects} selectedId={selectedId} query={query} category={category} page={page} collection={collection} onCollection={value=>{setCollection(value);setPage(0);}} placedOnly={placedOnly} onPlacedOnly={value=>{setPlacedOnly(value);setPage(0);}} onQuery={value=>{setQuery(value);setPage(0);}} onCategory={value=>{setCategory(value);setPage(0);}} onPage={setPage} onAdd={onAdd}/>
   <BuildInspector objects={objects.filter(o=>!isHouseObject(o))} selectedId={selectedId} worlds={worlds} onSelect={onSelect} onPatch={onPatch} onDuplicate={onDuplicate} onDelete={onDelete} onBrowse={()=>setView('catalog')} onMove={onMove}/>
  </div>
  <footer className='hb-build-actions'><div className='hb-build-history'><button type='button' disabled={!canUndo||busy} onClick={onUndo}><BuildIcon name='undo'/><span>Undo</span></button><button type='button' disabled={!canRedo||busy} onClick={onRedo}><BuildIcon name='redo'/><span>Redo</span></button></div><small role='status'>{!online?'Offline · reconnect to save':busy?'Saving your little world…':'A little arranging. A little belonging.'}</small><div className='hb-build-confirm'><button type='button' disabled={busy} onClick={onCancel}>Cancel</button><button type='button' className='hb-primary' disabled={busy||!online} onClick={onSave}>{busy?'Saving…':'Save & play'}<span aria-hidden='true'> ↗</span></button></div></footer>
 </section>;
}
