'use client';
/* eslint-disable react-hooks/set-state-in-effect -- Restore device-only local drafts after hydration, never on the server. */
/* eslint-disable @next/next/no-img-element -- The catalogue uses tiny, already-optimized, local WebP thumbnails. */
import dynamic from 'next/dynamic';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,Box,Copy,Grid2X2,Move3D,Redo2,RotateCw,Search,Trash2,Undo2,Upload,Waypoints} from 'lucide-react';
import {BUILD_ASSETS,BUILD_ASSET_CATEGORIES,type BuildAsset,type BuildAssetCategory} from '../build-assets';
import {EDITOR_BEHAVIORS,EDITOR_LIMITS,editWorld,loadEditorHistory,newEditorHistory,readEditorJSON,redoEditor,serializeEditorDocument,undoEditor,type EditorAction,type EditorTool,type Vec3} from './model';
import './editor.css';

const EditorScene=dynamic(()=>import('./scene'),{ssr:false,loading:()=> <div className='ctrl-editor-loading'>Opening the 3D workshop…</div>});
const STORAGE_KEY='ctrl:world-editor-v1';
const PAGE_SIZE=48;
const categoryNames:Record<BuildAssetCategory,string>={architecture:'Buildings',furniture:'Furniture',nature:'Nature',food:'Food & props',roads:'Roads',playground:'Game pieces'};
const toolNames:Record<EditorTool,string>={translate:'Move',rotate:'Rotate',scale:'Scale'};

export default function WorldEditor(){
  const assetIndex=useMemo(()=>new Map<string,BuildAsset>(BUILD_ASSETS.map(asset=>[asset.id,asset])),[]);
  const [history,setHistory]=useState(newEditorHistory);
  const [ready,setReady]=useState(false);
  const [selection,setSelection]=useState<string|null>(null);
  const [stagedAsset,setStagedAsset]=useState<string|null>(null);
  const [category,setCategory]=useState<BuildAssetCategory|'all'>('all');
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(1);
  const [tool,setTool]=useState<EditorTool>('translate');
  const [snap,setSnap]=useState(true);
  const [message,setMessage]=useState('');
  const [importError,setImportError]=useState('');
  const fileInput=useRef<HTMLInputElement>(null);
  const draft=history.present;
  const selected=draft.objects.find(item=>item.id===selection)??null;
  const selectedAsset=selected?assetIndex.get(selected.assetId):undefined;
  const filtered=useMemo(()=>BUILD_ASSETS.filter(asset=>{
    const name=(asset.name+' '+asset.id).toLowerCase();
    return (category==='all'||asset.category===category)&&name.includes(query.trim().toLowerCase());
  }),[category,query]);
  const shown=filtered.slice(0,page*PAGE_SIZE);

  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem(STORAGE_KEY);
      if(raw)setHistory(loadEditorHistory(readEditorJSON(raw,assetIndex),assetIndex));
    }catch{
      setImportError('The saved draft could not be opened. It was preserved in local storage; export/import a valid document to continue.');
    }
    setReady(true);
  },[assetIndex]);
  useEffect(()=>{
    if(!ready)return;
    try{window.localStorage.setItem(STORAGE_KEY,serializeEditorDocument(draft,assetIndex));}
    catch{setMessage('Local autosave is unavailable on this device. Export your draft to keep it.');}
  },[ready,draft,assetIndex]);

  const apply=useCallback((action:EditorAction)=>{
    try{
      setHistory(editWorld(history,action,assetIndex));
      setImportError('');
      return true;
    }catch(error){
      setMessage(error instanceof Error?error.message:'Cannot edit this object.');
      return false;
    }
  },[assetIndex,history]);

  const undo=useCallback(()=>{setHistory(undoEditor);setMessage('');},[]);
  const redo=useCallback(()=>{setHistory(redoEditor);setMessage('');},[]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      const target=event.target;
      if(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||target instanceof HTMLElement&&target.isContentEditable)return;
      if((event.ctrlKey||event.metaKey)&&event.code==='KeyZ'){
        event.preventDefault();if(event.shiftKey)redo();else undo();
      }else if((event.ctrlKey||event.metaKey)&&event.code==='KeyY'){
        event.preventDefault();redo();
      }else if(event.key==='Escape'){setStagedAsset(null);setSelection(null);}
      else if((event.key==='Delete'||event.key==='Backspace')&&selected){
        event.preventDefault();apply({type:'remove',id:selected.id});setSelection(null);
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[apply,undo,redo,selected]);

  function addAsset(position:Vec3){
    if(!stagedAsset)return;
    const id='object-'+crypto.randomUUID().replace(/-/g,'');
    if(apply({type:'add',id,assetId:stagedAsset,position})){
      setSelection(id);setStagedAsset(null);
      setMessage('Object placed. Select and transform it, or choose another model.');
    }
  }
  function transform(id:string,values:{position:Vec3;rotationY:number;scale:number}){
    apply({type:'transform',id,...values});
  }
  function propertyChange(key:'x'|'y'|'z'|'rotation'|'scale',value:number){
    if(!selected||!Number.isFinite(value))return;
    if(key==='rotation')apply({type:'transform',id:selected.id,rotationY:value*Math.PI/180});
    else if(key==='scale')apply({type:'transform',id:selected.id,scale:value});
    else{
      const index=key==='x'?0:key==='y'?1:2;
      const position:Vec3=[...selected.position];
      position[index]=value;
      apply({type:'transform',id:selected.id,position});
    }
  }
  function duplicate(){
    if(!selected)return;
    const id='object-'+crypto.randomUUID().replace(/-/g,'');
    if(apply({type:'duplicate',id:selected.id,newId:id}))setSelection(id);
  }
  function download(){
    try{
      const json=serializeEditorDocument(draft,assetIndex);
      const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
      const a=document.createElement('a');
      a.href=url;a.download='ctrl-world-draft.json';document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage('World draft exported. This is not a published world.');
    }catch(error){setMessage(error instanceof Error?error.message:'Export failed.');}
  }
  async function importFile(file?:File){
    if(!file)return;
    try{
      if(file.size>250_000)throw Error('File exceeds the 250 KB draft limit.');
      const next=readEditorJSON(await file.text(),assetIndex);
      setHistory(loadEditorHistory(next,assetIndex));setSelection(null);setStagedAsset(null);
      setImportError('');setMessage('Draft imported and saved locally.');
    }catch(error){setImportError(error instanceof Error?error.message:'Invalid world file.');}
    if(fileInput.current)fileInput.current.value='';
  }
  function reset(){
    if(!window.confirm('Clear this local world draft? Export it first if you want to keep it.'))return;
    setHistory(newEditorHistory());setSelection(null);setStagedAsset(null);setMessage('New empty draft ready.');
  }
  function chooseAsset(asset:BuildAsset){
    setStagedAsset(asset.id);setSelection(null);setMessage('Click the ground in the 3D view to place '+asset.name+'.');
  }
  const input=(name:'x'|'y'|'z'|'rotation'|'scale',value:number)=>
    <label className='ctrl-editor-number'><span>{name.toUpperCase()}</span><input type='number' step={name==='rotation'?15:.25} value={Math.round(value*1000)/1000} onChange={e=>propertyChange(name,Number(e.target.value))}/></label>;
  return <section className='ctrl-editor'>
    <header className='ctrl-editor-header'>
      <div><a href='/worlds' className='ctrl-editor-back'>← BACK TO WORLDS</a><h1>World Builder <span>001</span></h1><p>Shape a place, object by object. No AI, tokens or paid account required.</p></div>
      <div className='ctrl-editor-header-actions'>
        <span className='ctrl-editor-status'>{ready?'LOCAL DRAFT / AUTOSAVED':'OPENING DRAFT'}</span>
        <button onClick={download} disabled={!ready}><ArrowDownToLine size={16}/> Export</button>
        <button onClick={()=>fileInput.current?.click()} disabled={!ready}><Upload size={16}/> Import</button>
        <input hidden type='file' accept='.json,application/json' ref={fileInput} onChange={e=>void importFile(e.target.files?.[0])}/>
      </div>
    </header>
    <div className='ctrl-editor-grid'>
      <aside className='ctrl-editor-library' aria-label='Model library'>
        <div className='ctrl-editor-side-heading'><div><span>01 / LIBRARY</span><h2>Make it yours.</h2></div><span>{BUILD_ASSETS.length} ASSETS</span></div>
        <label className='ctrl-editor-search'><Search size={17}/><input aria-label='Search 3D assets' placeholder='Search models…' value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label>
        <div className='ctrl-editor-categories'><button aria-pressed={category==='all'} onClick={()=>{setCategory('all');setPage(1);}}>All</button>{BUILD_ASSET_CATEGORIES.map(c=><button key={c} aria-pressed={category===c} onClick={()=>{setCategory(c);setPage(1);}}>{categoryNames[c]}</button>)}</div>
        <div className='ctrl-editor-assets'>
          {shown.map(asset=><button className='ctrl-editor-asset' key={asset.id} aria-pressed={stagedAsset===asset.id} onClick={()=>chooseAsset(asset)} title={asset.id}>
            <img src={asset.thumbnailUrl} alt='' loading='lazy' width={80} height={80}/><span>{asset.name}</span>
          </button>)}
        </div>
        {!filtered.length&&<p className='ctrl-editor-hint'>No matching models. Try another category or search term.</p>}
        {shown.length<filtered.length&&<button className='ctrl-editor-more' onClick={()=>setPage(v=>v+1)}>Show more ({filtered.length-shown.length} remaining)</button>}
        <p className='ctrl-editor-credits'>CC0 assets by Kenney. Loaded individually as you place them. The 991 models are not loaded into the scene at once.</p>
      </aside>
      <div className='ctrl-editor-viewport'>
        <div className='ctrl-editor-toolbar' role='toolbar' aria-label='Edit tools'>
          {(['translate','rotate','scale'] as const).map(t=><button key={t} aria-pressed={tool===t} title={toolNames[t]} onClick={()=>setTool(t)}>{t==='translate'?<Move3D size={17}/>:t==='rotate'?<RotateCw size={17}/>:<Box size={17}/>}<span>{toolNames[t]}</span></button>)}
          <span className='ctrl-editor-toolbar-divider'/>
          <button aria-pressed={snap} onClick={()=>setSnap(v=>!v)} title='Snap to grid'><Grid2X2 size={17}/><span>Snap</span></button>
          <button onClick={undo} disabled={!history.past.length} title='Undo'><Undo2 size={17}/></button>
          <button onClick={redo} disabled={!history.future.length} title='Redo'><Redo2 size={17}/></button>
        </div>
        <div className='ctrl-editor-stage'>
          {ready?<EditorScene objects={draft.objects} assetIndex={assetIndex} selectedId={selected?.id??null}
            placingAsset={stagedAsset?assetIndex.get(stagedAsset)??null:null} tool={tool} snap={snap}
            onSelect={id=>{setSelection(id);if(id)setStagedAsset(null);}} onPlace={addAsset} onTransform={transform}/>:
            <div className='ctrl-editor-loading'>Restoring your local draft…</div>}
        </div>
        <div className='ctrl-editor-bottom'><span><Waypoints size={14}/> {draft.objects.length} / {EDITOR_LIMITS.maxObjects} OBJECTS</span><span>{stagedAsset?'PLACE MODE: CLICK GROUND':'DRAG TO ORBIT · SCROLL TO ZOOM · CLICK TO SELECT'}</span></div>
      </div>
      <aside className='ctrl-editor-inspector' aria-label='Object inspector'>
        <div className='ctrl-editor-side-heading'><div><span>02 / INSPECTOR</span><h2>{selected?'Edit object.':'Your world.'}</h2></div></div>
        {selected&&selectedAsset?<div className='ctrl-editor-inspector-body'>
          <div className='ctrl-editor-selection'><img src={selectedAsset.thumbnailUrl} width={68} height={68} alt=''/><div><span>{selectedAsset.category.toUpperCase()}</span><strong>{selectedAsset.name}</strong><small>{selected.id.slice(0,15)}</small></div></div>
          <h3>Position</h3><div className='ctrl-editor-numbers'>{input('x',selected.position[0])}{input('y',selected.position[1])}{input('z',selected.position[2])}</div>
          <h3>Transform</h3><div className='ctrl-editor-numbers'>{input('rotation',selected.rotationY*180/Math.PI)}{input('scale',selected.scale)}</div>
          <h3>Behavior tag</h3>
          <select aria-label='Object behavior tag' value={selected.behavior} onChange={e=>apply({type:'behavior',id:selected.id,behavior:e.target.value as typeof selected.behavior})}>
            {EDITOR_BEHAVIORS.map(b=><option key={b} value={b}>{b.replace(/-/g,' ')}</option>)}
          </select>
          <p className='ctrl-editor-hint'>Behavior tags are saved as metadata. Actual gameplay wiring is not enabled in this editor yet.</p>
          <div className='ctrl-editor-inspector-actions'><button onClick={duplicate}><Copy size={16}/> Duplicate</button><button className='ctrl-editor-danger' onClick={()=>{apply({type:'remove',id:selected.id});setSelection(null);}}><Trash2 size={16}/> Delete</button></div>
        </div>:<div className='ctrl-editor-empty'><Box size={35}/><strong>{stagedAsset?'Ready to place.':'Choose a model.'}</strong><p>{stagedAsset?'Tap the ground in the 3D scene to add the selected asset.':'Select a model from the library, then click the ground to place it. Select an existing object to edit it.'}</p><p className='ctrl-editor-hint'>Use the gizmos to move, rotate and scale. Ctrl/Cmd + Z to undo; Delete removes a selected object.</p></div>}
        <div className='ctrl-editor-file'>
          <h3>Draft storage</h3><p>Autosaved in this browser only. Export JSON to keep or transfer your work. No wallet, server save or multiplayer sync is implied.</p>
          <button onClick={reset}>Clear local draft</button>
        </div>
      </aside>
    </div>
    {(message||importError)&&<div className={'ctrl-editor-notice'+(importError?' is-error':'')} role={importError?'alert':'status'}>{importError||message}<button onClick={()=>{setMessage('');setImportError('');}} aria-label='Dismiss notice'>×</button></div>}
  </section>;
}