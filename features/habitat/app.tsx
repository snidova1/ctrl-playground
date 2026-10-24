'use client';
import type {AvatarGestureRequest} from '@/features/plaza/characters/vrm-avatar';
/* eslint-disable @next/next/no-img-element -- Local catalog thumbnails are preoptimized WebP. */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Component,useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {BrandMark} from '@/components/brand';
import WalletConnection from '@/features/wallet/wallet-connect';
import {createCharacterMotion,defaultAppearance,normalizeAppearance,seededNewCharacterAppearance as seededAppearance,type CharacterAppearance} from '@/features/plaza/characters/catalog';
import DressingRoom from './dressing-room';
import HouseWorkshop from './house-workshop';
import HouseInteractions from './house-interactions';
import {DEFAULT_HOUSE,getHouseAnchor,getHouseConfig,replaceHouse,isHouseObject} from './modular-house';
import {interactionObjectFor,interactionDistanceTo} from './furniture-interactions';
import BuildCatalog from './build-catalog';
import FurniturePlacementControls from './furniture-placement-controls';
import type {PlacementPreview} from './furniture-placement';
import type {ControlInput} from '@/features/plaza/scene';
import type {Pose} from '@/features/plaza/types';
import type {WorldObject} from './types';
import type {HabitatState as WorldState} from '@/domain/habitat';
import {habitatApi as api,HabitatApiError} from './api';
import {useWorldPresence} from './use-presence';
import WorldMembers from './world-members';
import {createStarterWorld,shouldSeedStarterWorld} from './starter-world';
import {ATMOSPHERE_LABELS,nextAtmospherePreset,type AtmospherePreset} from './atmosphere-presets';
import HabitatMusic from './music-player';
import ActivityPanel from '@/features/cozy-life/activity-panel';
import {useCozyActivity} from '@/features/cozy-life/use-cozy-activity';
import {useCozyWorld} from './use-cozy-world';
import CozyWorldInteraction from './cozy-world-interaction';
import AnalogStick from './analog-stick';
import type {HabitatTool} from '@/features/plaza/editor/habitat-tools';
import './habitat.css';
import './cozy.css';
const Stage=dynamic(()=>import('./stage'),{ssr:false});
const LobbyScene=dynamic(()=>import('@/features/common-ground/lobby-scene'),{ssr:false});
/** Seed only the signed-in owner's untouched home via normal revision-checked save. */
async function ensureStarterHome(s:WorldState):Promise<WorldState>{
 const world=s.world;
 if(!world||!s.profile||!s.canEdit||s.homeId!==world.id||world.ownerId!==s.profile.id)return s;
 try{
  const seed=shouldSeedStarterWorld(world,s.profile.id,s.canEdit,s.homeId);
  if(!seed&&getHouseAnchor(world.objects))return s;
  const objects=seed?replaceHouse(createStarterWorld(),DEFAULT_HOUSE):replaceHouse(world.objects,DEFAULT_HOUSE);
  return await api<WorldState>('save',{worldId:world.id,revision:world.revision,objects});
 }
 catch(error){
  if(error instanceof HabitatApiError&&error.status===409)return api<WorldState>('state');
  // Transient backend issues must not block login or destroy the player's draft.
  return s;
 }
}
class StageBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className='hb-failure' role='alert'><h2>The world could not render.</h2><p>Your saved layout is safe. Try lighter graphics or reload.</p><button onClick={()=>location.reload()}>Reload world</button></div>:this.props.children;}}


export default function HabitatApp({advancedBuilder=false}:{advancedBuilder?:boolean}={}){const [state,setState]=useState<WorldState|null>(null),[loaded,setLoaded]=useState(false),[panel,setPanel]=useState<'entry'|'wardrobe'|'worlds'|'settings'|null>('entry'),[name,setName]=useState(''),[appearance,setAppearance]=useState<CharacterAppearance>(defaultAppearance),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[editing,setEditing]=useState(false),[draft,setDraft]=useState<WorldObject[]>([]),[selected,setSelected]=useState<string|null>(null),[sitting,setSitting]=useState(false),[celebrate,setCelebrate]=useState(false),[interactedAt,setInteractedAt]=useState(0),[historyAvailability,setHistoryAvailability]=useState({undo:false,redo:false}),[quality,setQuality]=useState<'low'|'high'>('low'),[advancedTool,setAdvancedTool]=useState<HabitatTool>('translate'),[advancedSnap,setAdvancedSnap]=useState(true),[worldName,setWorldName]=useState(''),[online,setOnline]=useState(true);
 const [atmosphere,setAtmosphere]=useState<AtmospherePreset>('afternoon');
 const [placement,setPlacement]=useState<WorldObject|null>(null),[placementPreview,setPlacementPreview]=useState<PlacementPreview|null>(null);
 useEffect(()=>{if(!editing){setPlacement(null);setPlacementPreview(null);}},[editing]);
 const [previewRoof,setPreviewRoof]=useState(false);
 const [houseEditing,setHouseEditing]=useState(false),[sittingOn,setSittingOn]=useState<string|null>(null);
 const [gesture,setGesture]=useState<AvatarGestureRequest>({id:null,sequence:0});
 const emote=(id:AvatarGestureRequest['id'])=>{setGesture(old=>({id,sequence:old.sequence+1}));setCelebrate(id==='victory');if(id)setInteractedAt(Date.now());};
 useEffect(()=>{if(panel||editing)setGesture(old=>old.id===null?old:{id:null,sequence:old.sequence+1});},[panel,editing]);
 const gender=appearance.gender,variant=appearance.variantId;
 const pose=useRef<Pose>({x:0,z:6,angle:Math.PI,moving:false}),input=useRef<ControlInput>({x:0,z:0}),motion=useRef(createCharacterMotion()),latest=useRef(state),flags=useRef({sitting,celebrate,interactedAt,sittingOn}),history=useRef<WorldObject[][]>([]),future=useRef<WorldObject[][]>([]),startTime=useRef<number|null>(null),baseRevision=useRef(0),settingsRevision=useRef(0);
 const cozy=useCozyActivity(()=>{input.current={x:0,z:0,run:false,jump:false};pose.current.moving=false;});
 const ownLifeWorld=!!state?.world&&state.world.ownerId===state.profile?.id&&state.world.id===state.homeId;
 const lifeWorld=useCozyWorld({worldId:state?.world?.id,owner:ownLifeWorld});
 const cozyActive=useRef(false);cozyActive.current=cozy.open;
 useEffect(()=>{latest.current=state;},[state]);useEffect(()=>{flags.current={sitting,celebrate,interactedAt,sittingOn};},[sitting,celebrate,interactedAt,sittingOn]);
 const acceptPresence=useCallback((next:WorldState|null)=>{latest.current=next;setState(next);if(!next?.canEdit)setEditing(false);if(!next){setPanel('entry');setMessage('Your wallet session expired. Verify again to continue.');}else if(!next.world){setPanel('worlds');setMessage('World access is no longer available. Choose another place or go home.');}else if(editing&&!next.canEdit){setMessage('Editing access was revoked. Your local draft was not saved.');}},[editing]);
 const {connect,sync}=useWorldPresence({latest,pose,motion,flags,onState:acceptPresence,onOnline:setOnline});
 const refresh=useCallback(async()=>{
  setError('');setMessage('');
  try{
   const saved=await ensureStarterHome(await api<WorldState>('state'));
   const s=saved.profile&&saved.world?await connect(saved.world.id):saved;
   latest.current=s;setState(s);setPanel(s.profile?(s.world?null:'worlds'):'wardrobe');
   if(s.profile){setName(s.profile.name);setAppearance(normalizeAppearance(s.profile.appearance,s.profile.character==='male'?'male':'female',s.profile.variant));}
   else setAppearance(seededAppearance(crypto.randomUUID(),crypto.getRandomValues(new Uint32Array(1))[0]%2===0?'female':'male'));
   setOnline(true);
  }catch(reason){
   latest.current=null;setState(null);setPanel('entry');
   if(!(reason instanceof HabitatApiError&&reason.status===401))setError('Could not load Habitat. Check your connection and try again.');
  }finally{setLoaded(true);}
 },[connect]);
 useEffect(()=>{const timer=setTimeout(()=>{void refresh();},0);return()=>clearTimeout(timer);},[refresh]);useEffect(()=>{if(!celebrate)return;const t=setTimeout(()=>setCelebrate(false),2500);return()=>clearTimeout(t);},[celebrate]);
 async function action(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Operation failed.');}finally{setBusy(false);}}
 const router=useRouter();
 function guest(){router.push('/courtyard');}
 async function profile(){await action(async()=>{const s=await ensureStarterHome(await api<WorldState>('profile',{name,character:gender,variant,appearance}));latest.current=s;setState(s);if(s.profile)setAppearance(normalizeAppearance(s.profile.appearance,s.profile.character==='male'?'male':'female',s.profile.variant));setPanel(null);setMessage(s.world?.objects.length?'Welcome home. Your starter world is ready to customize.':'Your world is ready. Open Builder to furnish it.');});}
 async function furnishEmptyHome(){await action(async()=>{const w=state?.world;if(!w||!state?.canEdit||w.id!==state.homeId||w.ownerId!==state.profile?.id||w.objects.length)return;const s=await api<WorldState>('save',{worldId:w.id,revision:w.revision,objects:createStarterWorld()});latest.current=s;setState(s);setMessage('Your starter garden is ready. Every object can be moved, replaced or deleted.');});}
 async function visit(id:string){await action(async()=>{const s=await connect(id);latest.current=s;setState(s);Object.assign(pose.current,{x:0,z:6,angle:Math.PI,moving:false});setEditing(false);setSitting(false);setPanel(null);startTime.current=null;});}
 async function use(o:WorldObject){if(cozy.open||editing||busy)return;if(sitting&&sittingOn===o.id&&o.behavior==='seat'){setSitting(false);return;}if(interactionDistanceTo(pose.current,o)>2.7){setMessage('Walk closer to use this object.');return;}await action(async()=>{await sync();const result=await api<{object:WorldObject;state:WorldState}>('use',{id:o.id});setState(result.state);setInteractedAt(Date.now());if(o.behavior==='seat'){setSitting(v=>sittingOn===o.id?!v:true);setSittingOn(o.id);}else if(o.behavior==='portal'){if(o.target)await visit(o.target);else setMessage('The owner has not connected this portal yet.');}else if(o.behavior==='checkpoint'){startTime.current=Date.now();setMessage('Course timer started. Reach the finish marker.');}else if(o.behavior==='finish'){setMessage(startTime.current?`Finished in ${((Date.now()-startTime.current)/1000).toFixed(2)} seconds · personal run`:'Find the checkpoint to start your run.');setCelebrate(true);startTime.current=null;}else setMessage(o.behavior==='decoration'||o.behavior==='solid'?o.name:`${o.name} activated.`);});}
 const useRefLatest=useRef(use);useEffect(()=>{useRefLatest.current=use;});
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(cozyActive.current)return;if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement)return;if(e.code==='KeyT'&&!e.repeat)setAtmosphere(nextAtmospherePreset);if(e.code==='Escape'){setPanel(latest.current?.profile?(latest.current.world?null:'worlds'):latest.current?'wardrobe':'entry');setSitting(false);}if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code))setSitting(false);if(e.code==='KeyE'&&!e.repeat){const near=interactionObjectFor(pose.current,latest.current?.world?.objects??[],flags.current.sitting?flags.current.sittingOn:null);if(near)void useRefLatest.current(near);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 function change(objects:WorldObject[]){history.current=[...history.current.slice(-29),draft];future.current=[];setDraft(objects);setHistoryAvailability({undo:true,redo:false});}
 function undo(){const previous=history.current.pop();if(!previous)return;future.current.push(draft);setDraft(previous);setSelected(null);setHistoryAvailability({undo:history.current.length>0,redo:future.current.length>0});}
 function redo(){const next=future.current.pop();if(!next)return;history.current.push(draft);setDraft(next);setSelected(null);setHistoryAvailability({undo:history.current.length>0,redo:future.current.length>0});}
 function add(assetId:string,label:string,behavior:WorldObject['behavior']='decoration'){if(draft.length>=120){setError('World limit: 120 objects. Remove an object before adding another.');return;}const o:WorldObject={id:crypto.randomUUID(),assetId,name:label,x:pose.current.x,y:0,z:pose.current.z,rotation:0,scale:1,behavior,target:''};setPlacementPreview(null);setPlacement(o);setSelected(null);}
 function moveSelected(){const object=draft.find(o=>o.id===selected&&!isHouseObject(o));if(object){setPlacementPreview(null);setPlacement({...object});}}
 function rotatePlacement(){setPlacementPreview(null);setPlacement(old=>old?{...old,rotation:(old.rotation+Math.PI/4)%(Math.PI*2)}:null);}
 function place(){if(!editing||!state?.canEdit||!placement||!placementPreview?.valid||placementPreview.object.id!==placement.id||Math.abs(placementPreview.object.rotation-placement.rotation)>.00001)return;change(draft.some(o=>o.id===placement.id)?draft.map(o=>o.id===placement.id?placementPreview.object:o):[...draft,placementPreview.object]);setSelected(placement.id);setPlacement(null);setPlacementPreview(null);input.current.x=input.current.z=0;}
 function patch(values:Partial<WorldObject>){change(draft.map(o=>o.id===selected?{...o,...values}:o));}
 function enterBuild(){setHouseEditing(false);setSelected(null);setPanel(null);setSitting(false);baseRevision.current=state?.world?.revision??0;setDraft(state?.world?.objects??[]);history.current=[];future.current=[];setHistoryAvailability({undo:false,redo:false});setEditing(true);}
 async function save(){await action(async()=>{if(!state?.world)return;const s=await api<WorldState>('save',{worldId:state.world.id,revision:baseRevision.current,objects:draft});setState(s);latest.current=s;setEditing(false);setMessage('World saved. Visitors can see the changes.');});}
 function enterHouse(){if(!state?.permissions?.canManage||!state.world)return;try{const next=replaceHouse(state.world.objects,getHouseConfig(state.world.objects));enterBuild();setPreviewRoof(false);setHouseEditing(true);setDraft(next);}catch(reason){setError(reason instanceof Error?reason.message:'Could not open the house workshop.');}}
 const chosen=draft.find(o=>o.id===selected);
 return <main data-atmosphere={atmosphere} className={`hb-app${editing?' is-editing':''}${advancedBuilder?' is-advanced':''}${!state?.profile?' is-entry':''}`} id='main'><div className='hb-stage'><StageBoundary>{!state?.profile?<LobbyScene phase={atmosphere}/>:<Stage lifeView={lifeWorld.view} lifeInteractive={ownLifeWorld} previewRoof={houseEditing&&editing&&previewRoof} placement={placement} onPlacementPreview={setPlacementPreview} houseEditing={houseEditing&&editing} sittingOn={sittingOn} gesture={gesture} atmosphere={atmosphere} state={state} pose={pose} input={input} motion={motion} editing={editing} locked={cozy.open||!!panel||!state?.profile} selected={selected} draft={draft} onSelect={setSelected} onUse={o=>void use(o)} sitting={sitting} celebrate={celebrate} interactedAt={interactedAt} quality={quality} advancedBuilder={advancedBuilder} tool={advancedTool} snap={advancedSnap} onTransform={(id,values)=>change(draft.map(o=>o.id===id?{...o,...values}:o))}/>}</StageBoundary></div>
 {!editing&&!panel&&<nav className='hb-comparison' aria-label='Neighborhood'><span>MAKE YOURSELF AT HOME</span><a href='/courtyard'>Visit Common Ground ↗</a></nav>}
 <header className='hb-top'><Link href='/habitat' className='hb-brand'><BrandMark/><strong>CTRL</strong><span>{state?.profile?'HABITAT':'COMMON GROUND'}</span></Link><div>
  {state?.profile&&<><span className='hb-status'>{online?state.profile.name:'Offline'}</span>{!online&&state.world&&<button onClick={()=>void action(async()=>{await connect(state.world!.id);})}>Reconnect</button>}<button className='hb-nav-worlds' onClick={()=>setPanel('worlds')}>Worlds</button><button className='hb-nav-character' onClick={()=>setPanel('wardrobe')}>Character</button></>}
  <button className='hb-nav-settings' onClick={()=>{settingsRevision.current=state?.world?.revision??0;setWorldName(state?.world?.name??'');setPanel('settings');}}>Settings</button>
  {!state&&<button className='hb-nav-connect' onClick={()=>{setPanel('entry');requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.hb-entry .wallet-options button')?.focus());}}>Connect wallet</button>}
 </div></header>
 {state&&<HabitatMusic/>}
 {!editing&&!panel&&state?.world&&<div className='hb-title'><small>{state.canEdit?'YOUR PLACE':'VISITING'} / {state.world.visibility.toUpperCase()}</small><h1>{state.world.name}</h1><p>{state.world.objects.length} objects · {state.players.length} here</p></div>}
 {error&&panel!=='entry'&&<div className='hb-alert' role='alert'>{error}<button onClick={()=>setError('')}>Dismiss</button></div>}{message&&!error&&panel!=='entry'&&<div className='hb-message' role='status' onClick={()=>setMessage('')}>{message}</div>}
 {!state&&panel==='entry'&&<div className='hb-entry-caption'><strong>Common Ground</strong><span>A small waiting room. The wider world is ahead.</span></div>}
 {panel==='entry'&&<section className='hb-panel hb-entry' aria-labelledby='habitat-entry-title'><h1 id='habitat-entry-title'>Welcome to CTRL.</h1><p>Pause in Common Ground, or sign in to continue.</p>{message&&!error&&<p className='hb-entry-note' role='status'>{message}</p>}{error&&<p className='form-error' role='alert'>{error}</p>}<WalletConnection onVerified={()=>void refresh()}/>{!loaded&&<small role='status'>Checking your saved session…</small>}{error&&<button onClick={()=>void refresh()}>Retry connection</button>}<div className='hb-entry-guest'><span>Just looking around?</span><button onClick={()=>void guest()} disabled={busy}>{busy?'Opening Common Ground…':'Enter Common Ground'}</button><small>Stay in the small waiting room without a wallet.</small></div></section>}

 {panel==='wardrobe'&&<DressingRoom appearance={appearance} name={name} busy={busy} hasProfile={!!state?.profile} canSave={!!state} onChange={setAppearance} onName={setName} onSave={()=>void profile()} onClose={()=>setPanel(null)}/> }
 {panel==='worlds'&&<section className='hb-panel'><h1>Worlds.</h1>{state?.homeId&&<button className='hb-primary' onClick={()=>void visit(state.homeId!)}>Go home</button>}{state?.worlds.map(w=><button className='hb-world-row' key={w.id} onClick={()=>void visit(w.id)}><strong>{w.name}</strong><span>by {w.owner} ↗</span></button>)}{!state?.worlds.length&&<p>No public worlds yet. Enter the workshop to make the first one.</p>}<button onClick={()=>setPanel(state?.profile?(state.world?null:'worlds'):state?'wardrobe':'entry')}>Close</button></section>}

{panel==='settings'&&<section className='hb-panel'><h1>Settings.</h1><label>Light & atmosphere<select aria-label='World atmosphere' value={atmosphere} onChange={e=>setAtmosphere(e.target.value as AtmospherePreset)}>{Object.entries(ATMOSPHERE_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Graphics<select value={quality} onChange={e=>setQuality(e.target.value as 'low'|'high')}><option value='low'>Light / mobile</option><option value='high'>Desktop</option></select></label>{state?.permissions?.canManage&&<><label>World name<input value={worldName} maxLength={60} onChange={e=>setWorldName(e.target.value)}/></label><div className='hb-row'>{(['private','public'] as const).map(v=><button key={v} disabled={busy} onClick={()=>void action(async()=>{let s:WorldState;try{s=await api<WorldState>('settings',{name:worldName,visibility:v,revision:settingsRevision.current});}catch(reason){if(reason instanceof HabitatApiError&&reason.status===409){const fresh=await api<WorldState>('state');latest.current=fresh;setState(fresh);throw new Error('This world changed in another session. Close and reopen Settings before saving again.');}throw reason;}latest.current=s;settingsRevision.current=s.world?.revision??settingsRevision.current;setState(s);setMessage(`World saved as ${v}.`);})}>Save {v}</button>)}</div><p className='hb-small'>Public worlds allow visitors. Only the owner manages settings; invited editors can change objects. Private worlds are enforced on the server.</p><WorldMembers key={state.world!.id} worldId={state.world!.id}/></>}<p>WASD / arrows: move<br/>Shift: run · Space: jump<br/>Drag: camera · Scroll: zoom<br/>E or click nearby object: interact<br/>T: change the light</p><a href='/account'>Wallet account ↗</a><a href='/courtyard'>Common Ground ↗</a><button onClick={()=>setPanel(state?.profile?(state.world?null:'worlds'):state?'wardrobe':'entry')}>Close</button></section>}
 {editing&&placement?<><FurniturePlacementControls object={placement} preview={placementPreview} onPlace={place} onRotate={rotatePlacement} onCancel={()=>{setPlacement(null);setPlacementPreview(null);input.current.x=input.current.z=0;}}/><div className='hb-placement-analog'><AnalogStick onMove={axes=>{input.current.x=axes.x;input.current.z=axes.z;}}/></div></>:editing&&<>
  {state?.permissions?.canManage&&<div className='hb-builder-mode-switch' role='group' aria-label='Build mode'><button type='button' aria-pressed={!houseEditing} onClick={()=>setHouseEditing(false)}>Furniture</button><button type='button' aria-pressed={houseEditing} onClick={()=>{try{if(!getHouseAnchor(draft))change(replaceHouse(draft,getHouseConfig(draft)));setSelected(null);setHouseEditing(true);}catch(reason){setError(reason instanceof Error?reason.message:'Could not modify the house.');}}}>House</button>{houseEditing&&<button type='button' aria-label='Roof preview' aria-pressed={previewRoof} onClick={()=>setPreviewRoof(v=>!v)}>{previewRoof?'Floor plan':'Show roof'}</button>}</div>}
  {houseEditing?<HouseWorkshop objects={draft} onChange={change} onClose={()=>{setEditing(false);setHouseEditing(false);setError('');}} onSave={()=>void save()} busy={busy} online={online} canUndo={historyAvailability.undo} canRedo={historyAvailability.redo} onUndo={undo} onRedo={redo}/>:<>
  {advancedBuilder&&<div className='hb-transform-tools' role='toolbar' aria-label='Transform tools'>{([['translate','Move'],['rotate','Rotate'],['scale','Scale']] as const).map(([tool,label])=><button type='button' key={tool} aria-pressed={advancedTool===tool} onClick={()=>setAdvancedTool(tool)}>{label}</button>)}<label><input type='checkbox' checked={advancedSnap} onChange={e=>setAdvancedSnap(e.target.checked)}/>Snap</label></div>}
  <BuildCatalog onMove={moveSelected} objects={draft} selectedId={selected} worlds={state?.worlds??[]} onSelect={setSelected} onAdd={add} onPatch={patch} onDuplicate={()=>{if(!chosen||draft.length>=120)return;const copy={...chosen,id:crypto.randomUUID(),x:Math.min(14,chosen.x+1)};change([...draft,copy]);setSelected(copy.id);}} onDelete={()=>{if(!chosen)return;change(draft.filter(o=>o.id!==chosen.id).map(o=>o.target===chosen.id?{...o,target:''}:o));setSelected(null);}} onUndo={undo} onRedo={redo} canUndo={historyAvailability.undo} canRedo={historyAvailability.redo} busy={busy} online={online} onSave={()=>void save()} onCancel={()=>{setEditing(false);setError('');}}/>
 </> }
 </>}
 {state?.profile&&!editing&&!panel&&<><HouseInteractions pose={pose} objects={state.world?.objects??[]} states={state.states} sitting={sitting} sittingOn={sittingOn} busy={busy} onUse={o=>void use(o)}/><footer className='hb-bottom'><button className='cozy-launch' aria-haspopup='dialog' onClick={()=>cozy.launch()}>🌱 Aktivitas</button>{state.canEdit&&<button className='hb-primary' onClick={enterBuild}>Build my world +</button>}{state.canEdit&&state.world?.id===state.homeId&&state.world.ownerId===state.profile?.id&&state.world.objects.length===0&&<button onClick={()=>void furnishEmptyHome()} disabled={busy||!online}>Use starter garden ✦</button>}{state.permissions?.canManage&&<button className='hb-house-entry' onClick={enterHouse}>Build house</button>}<span className='hb-emotes' role='group' aria-label='Emotes'><button onClick={()=>emote('interact')} aria-label='Wave hello'>Wave</button><button onClick={()=>emote('victory')}>Cheer</button></span><button className='hb-action-jump' onClick={()=>{setSitting(false);input.current.jump=true;}}>Jump</button><button className='hb-action-run' onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.current.run=true;}} onPointerUp={()=>{input.current.run=false;}} onLostPointerCapture={()=>{input.current.run=false;}}>Hold to run</button></footer><AnalogStick onMove={({x,z})=>{input.current.x=x;input.current.z=z;if(x||z)setSitting(false);}}/></>}
 {state?.profile&&<><CozyWorldInteraction view={lifeWorld.view} pose={pose} objects={state?.world?.objects??[]} enabled={ownLifeWorld&&!editing&&!panel&&!cozy.open} onOpen={cozy.launch}/>
  <ActivityPanel open={cozy.open} onClose={cozy.close} tab={cozy.tab} onTab={cozy.setTab} identity={{kind:'account',profileId:state.profile.id}} placementContext={{objects:state.world?.objects??[],canPlace:ownLifeWorld&&!editing}} visiting={!!state.world&&state.world.ownerId!==state.profile.id}/></>}
 </main>;
}
