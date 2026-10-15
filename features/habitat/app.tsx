'use client';
import {getTownVenue} from '@/domain/town-venues';
import TownVenueGuide from './town-venue-guide';
import {nearestUsable} from './nearby-object';
import {useTouchInput} from './use-touch-input';
/* eslint-disable @next/next/no-img-element -- Local catalog thumbnails are preoptimized WebP. */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {PUBLIC_WORLD_ID,type WorldDestination} from './public-world';
import {createGuestState,randomGuestStyle,type GuestStyle} from './guest';
import {Component,useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import TownGuide from './town-guide';
import TownLifePanel from './town-life-panel';
import type {TownLifeState} from '@/domain/town';
import {TOWN_DISTRICTS} from './town-districts';
import {nearbyResidents} from './town-residents';
import type {TownActivityId,TownDistrictKind} from './town-districts';
import {BrandMark} from '@/components/brand';
import WalletConnection from '@/features/wallet/wallet-connect';
import {AVAILABLE_CHARACTER_DEFINITIONS,createCharacterMotion,defaultAppearance,normalizeAppearance,resolveCharacter,type CharacterAppearance} from '@/features/plaza/characters/catalog';
import {BUILD_ASSETS,BUILD_ASSET_CATEGORIES} from '@/features/plaza/build-assets';
import type {ControlInput} from '@/features/plaza/scene';
import type {Pose} from '@/features/plaza/types';
import {behaviorSchema,type WorldObject} from './types';
import type {HabitatState as WorldState} from '@/domain/habitat';
import {habitatApi as api,HabitatApiError} from './api';
import {useWorldPresence} from './use-presence';
import WorldMembers from './world-members';
import {createStarterWorld,shouldSeedStarterWorld} from './starter-world';
import HabitatMusic from './music-player';
import HabitatBuilderTools,{type HabitatTool} from '@/features/plaza/editor/habitat-tools';
import './habitat.css';
const Stage=dynamic(()=>import('./stage'),{ssr:false});
const CharacterCreatorPreview=dynamic(()=>import('./character-creator-preview'),{ssr:false});
/** Seed only the signed-in owner's untouched home via normal revision-checked save. */
async function ensureStarterHome(s:WorldState):Promise<WorldState>{
 if(!shouldSeedStarterWorld(s.world,s.profile?.id??null,s.canEdit,s.homeId))return s;
 try{return await api<WorldState>('save',{worldId:s.world!.id,revision:0,objects:createStarterWorld()});}
 catch(error){
  if(error instanceof HabitatApiError&&error.status===409)return api<WorldState>('state');
  // Transient backend issues must not block login or destroy the player's draft.
  return s;
 }
}
class StageBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className='hb-failure' role='alert'><h2>The world could not render.</h2><p>Your saved layout is safe. Try lighter graphics or reload.</p><button onClick={()=>location.reload()}>Reload world</button></div>:this.props.children;}}
const primitives=[['ctrl-block','Building block','solid'],['ctrl-seat','Seat','seat'],['ctrl-lamp','Light','light'],['ctrl-door','Door','door'],['ctrl-switch','Switch','switch'],['ctrl-portal','World portal','portal'],['ctrl-marker','Checkpoint','checkpoint']] as const;
export default function HabitatApp({advancedBuilder=false,initialDestination='habitat'}:{advancedBuilder?:boolean;initialDestination?:WorldDestination}={}){const [state,setState]=useState<WorldState|null>(null),[loaded,setLoaded]=useState(false),[panel,setPanel]=useState<'entry'|'wardrobe'|'worlds'|'settings'|null>('entry'),[name,setName]=useState(''),[appearance,setAppearance]=useState<CharacterAppearance>(defaultAppearance),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[editing,setEditing]=useState(false),[draft,setDraft]=useState<WorldObject[]>([]),[selected,setSelected]=useState<string|null>(null),[query,setQuery]=useState(''),[category,setCategory]=useState('all'),[page,setPage]=useState(0),[sitting,setSitting]=useState(false),[celebrate,setCelebrate]=useState(false),[interactedAt,setInteractedAt]=useState(0),[historyAvailability,setHistoryAvailability]=useState({undo:false,redo:false}),[quality,setQuality]=useState<'low'|'high'>('low'),[advancedTool,setAdvancedTool]=useState<HabitatTool>('translate'),[advancedSnap,setAdvancedSnap]=useState(true),[worldName,setWorldName]=useState(''),[online,setOnline]=useState(true);
 const [destination,setDestination]=useState<WorldDestination>(initialDestination),[guestState,setGuestState]=useState<WorldState|null>(null),[guestStyle,setGuestStyle]=useState<GuestStyle>();
 const [chatOpen,setChatOpen]=useState(false);
 const [chat,setChat]=useState(''),[speech,setSpeech]=useState(''),[speechAt,setSpeechAt]=useState(0);
 const requested=useRef(initialDestination),refreshEpoch=useRef(0);
 const common=destination==='common',viewState=common?guestState:state;
 const town=viewState?.world?.id===PUBLIC_WORLD_ID;
 const publicRoom=viewState?.world?getTownVenue(viewState.world.id):undefined;
 const selfPlayer=viewState?.players.find(p=>p.id===viewState.profile?.id);
 const localResidentCount=town?nearbyResidents(selfPlayer?.x??0,selfPlayer?.z??6,quality).length:0;
 const gender=appearance.gender,variant=appearance.variantId,selectedCharacter=resolveCharacter(appearance);
 const pose=useRef<Pose>({x:0,z:6,angle:Math.PI,moving:false}),input=useRef<ControlInput>({x:0,z:0}),motion=useRef(createCharacterMotion()),latest=useRef(state),flags=useRef({sitting,celebrate,interactedAt,speech,speechAt}),history=useRef<WorldObject[][]>([]),future=useRef<WorldObject[][]>([]),startTime=useRef<number|null>(null),baseRevision=useRef(0),settingsRevision=useRef(0);
 useEffect(()=>{latest.current=state;},[state]);useEffect(()=>{flags.current={sitting,celebrate,interactedAt,speech,speechAt};},[sitting,celebrate,interactedAt,speech,speechAt]);
 const acceptPresence=useCallback((next:WorldState|null)=>{latest.current=next;setState(next);if(!next?.canEdit)setEditing(false);if(!next){setPanel('entry');setMessage('Your wallet session expired. Verify again to continue.');}else if(!next.world){setPanel('worlds');setMessage('World access is no longer available. Choose another place or go home.');}else if(editing&&!next.canEdit){setMessage('Editing access was revoked. Your local draft was not saved.');}},[editing]);
 const touch=useTouchInput(input,()=>setSitting(false));
 const {connect,sync,leave,travel,mutate}=useWorldPresence({latest,pose,motion,flags,onState:acceptPresence,onOnline:setOnline});
 const refresh=useCallback(async(preserveVenue=true)=>{
  const epoch=++refreshEpoch.current;setError('');setMessage('');
  try{
   const saved=await ensureStarterHome(await api<WorldState>('state'));
   if(epoch!==refreshEpoch.current)return;
   const target=preserveVenue&&saved.world&&getTownVenue(saved.world.id)?saved.world.id:requested.current==='public'&&saved.profile?(await api<{id:string}>('public-world',{})).id:saved.homeId;
   const s=saved.profile&&target?await connect(target):saved;
   if(epoch!==refreshEpoch.current){leave();return;}
   latest.current=s;setState(s);setPanel(s.profile?(s.world?null:'worlds'):'wardrobe');
   if(s.profile){setName(s.profile.name);setAppearance(normalizeAppearance(s.profile.appearance,s.profile.character==='male'?'male':'female',s.profile.variant));}
   else setAppearance({...defaultAppearance,gender:'female',characterId:AVAILABLE_CHARACTER_DEFINITIONS[0].id});
   setOnline(true);
  }catch(reason){
   if(epoch!==refreshEpoch.current)return;
   latest.current=null;setState(null);setPanel('entry');
   if(!(reason instanceof HabitatApiError&&reason.status===401))setError('Could not load Habitat. Check your connection and try again.');
  }finally{setLoaded(true);}
 },[connect,leave]);
 useEffect(()=>{const timer=setTimeout(()=>{setGuestState(createGuestState());setGuestStyle(randomGuestStyle());if(requested.current==='common'){setPanel(null);setLoaded(true);}else void refresh();},0);return()=>clearTimeout(timer);},[refresh]);useEffect(()=>{if(!celebrate)return;const t=setTimeout(()=>setCelebrate(false),2500);return()=>clearTimeout(t);},[celebrate]);
 useEffect(()=>{if(!town||!message)return;const t=setTimeout(()=>setMessage(''),4500);return()=>clearTimeout(t);},[town,message]);
 async function action(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Operation failed.');}finally{setBusy(false);}}
 function commonGround(){if(busy)return;window.history.replaceState(null,'','/');setOnline(true);refreshEpoch.current++;leave();latest.current=null;setState(null);requested.current='common';setDestination('common');setPanel(null);setEditing(false);setSitting(false);setError('');setMessage('');Object.assign(pose.current,{x:0,z:6,angle:Math.PI,moving:false});}
 async function chooseDestination(next:'habitat'|'public'){if(busy)return;window.history.replaceState(null,'',next==='public'?'/public-world':'/habitat');setBusy(true);requested.current=next;setDestination(next);setEditing(false);setSitting(false);setPanel('entry');try{await refresh(false);}finally{setBusy(false);}}
 function rerollGuest(){const next=createGuestState();setGuestState(old=>old?{...old,profile:next.profile}:next);setGuestStyle(randomGuestStyle());}
 async function profile(){await action(async()=>{const saved=await ensureStarterHome(await api<WorldState>('profile',{name,character:gender,variant,appearance}));const target=requested.current==='public'?(await api<{id:string}>('public-world',{})).id:saved.world?.id;const s=target?await connect(target):saved;latest.current=s;setState(s);if(s.profile)setAppearance(normalizeAppearance(s.profile.appearance,s.profile.character==='male'?'male':'female',s.profile.variant));setPanel(null);setMessage(requested.current==='public'?'Welcome to Willow Square.':'Welcome home. Your starter world is ready to customize.');});}
 async function furnishEmptyHome(){await action(async()=>{const w=state?.world;if(!w||!state?.canEdit||w.id!==state.homeId||w.ownerId!==state.profile?.id||w.objects.length)return;const s=await api<WorldState>('save',{worldId:w.id,revision:w.revision,objects:createStarterWorld()});latest.current=s;setState(s);setMessage('Your starter garden is ready. Every object can be moved, replaced or deleted.');});}
 async function visit(id:string){await action(async()=>{const s=await connect(id);if(requested.current==='public'){requested.current='habitat';setDestination('habitat');window.history.replaceState(null,'','/habitat');}latest.current=s;setState(s);Object.assign(pose.current,{x:0,z:6,angle:Math.PI,moving:false});setEditing(false);setSitting(false);setPanel(null);startTime.current=null;});}
 async function use(o:WorldObject){if(editing||busy)return;if(common){if(Math.hypot(pose.current.x-o.x,pose.current.z-o.z)>3.5){setMessage('Walk closer to use this object.');return;}if(o.behavior==='seat')setSitting(v=>!v);else setGuestState(old=>old?{...old,states:{...old.states,[o.id]:{active:!old.states[o.id]?.active,usedAt:Date.now()}}}:old);return;}if(Math.hypot(pose.current.x-o.x,pose.current.z-o.z)>3.5){setMessage('Walk closer to use this object.');return;}await action(async()=>{const result=await mutate<{object:WorldObject;state:WorldState}>('use',{id:o.id,sessionId:latest.current?.presenceSession?.id});setState(result.state);setInteractedAt(Date.now());if(o.behavior==='seat'){const seated=!!result.state.players.find(p=>p.id===result.state.profile?.id)?.motion.sitting;flags.current={...flags.current,sitting:seated};setSitting(seated);}else if(o.behavior==='portal'){if(o.target)await visit(o.target);else setMessage('The owner has not connected this portal yet.');}else if(o.behavior==='checkpoint'){startTime.current=Date.now();setMessage('Course timer started. Reach the finish marker.');}else if(o.behavior==='finish'){setMessage(startTime.current?`Finished in ${((Date.now()-startTime.current)/1000).toFixed(2)} seconds · personal run`:'Find the checkpoint to start your run.');setCelebrate(true);startTime.current=null;}else setMessage(o.behavior==='decoration'||o.behavior==='solid'?o.name:`${o.name} activated.`);});}
 const guestLatest=useRef(guestState);useEffect(()=>{guestLatest.current=guestState;},[guestState]);
 const useRefLatest=useRef(use);useEffect(()=>{useRefLatest.current=use;});
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement)return;if(e.code==='Escape'){if(requested.current==='common'){setPanel(null);return;}setPanel(latest.current?.profile?(latest.current.world?null:'worlds'):latest.current?'wardrobe':'entry');setSitting(false);}if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code))setSitting(false);if(e.code==='KeyE'){const near=nearestUsable((requested.current==='common'?guestLatest.current:latest.current)?.world?.objects??[],pose.current.x,pose.current.z);if(near)void useRefLatest.current(near);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 async function venueTravel(id:string,kind:'venue'|'exit'){await action(async()=>{setSitting(false);await travel(id,kind);requested.current=kind==='exit'?'public':'habitat';setDestination(requested.current);window.history.replaceState(null,'',kind==='exit'?'/public-world':'/habitat');});}
 async function townTravel(id:TownDistrictKind){if(!town||busy||panel)return;await action(async()=>{
   setSitting(false);await travel(id);setMessage('Arrived at your destination. Explore and help your neighbors!');
 });}
 async function townActivity(id:TownActivityId){if(!town||busy||panel)return;await action(async()=>{
  await sync();
  const sessionId=latest.current?.presenceSession?.id;
  if(!sessionId)throw new Error('Reconnect before starting an activity.');
  const result=await api<{message:string;town:TownLifeState}>('town-job/start',{id,sessionId});
  if(latest.current){const next={...latest.current,town:result.town};latest.current=next;setState(next);}
  setInteractedAt(Date.now());setMessage(result.message);
 });}
 async function lifeAction(path:string,data:Record<string,unknown>){await action(async()=>{
  const result=await mutate<{message?:string;town:TownLifeState}>(path,data);
  if(latest.current){const next={...latest.current,town:result.town};latest.current=next;setState(next);}
  setInteractedAt(Date.now());if(result.message)setMessage(result.message);
 });}
 async function acceptInvite(id:string){await action(async()=>{
  const invite=await api<{destination:string}>('town-invite/accept',{id});
  const district=TOWN_DISTRICTS.find(d=>d.id===invite.destination);
  if(district){
   if(latest.current?.world?.id!==PUBLIC_WORLD_ID){await api('public-world',{});await connect(PUBLIC_WORLD_ID);requested.current='public';setDestination('public');window.history.replaceState(null,'','/public-world');}
   await travel(district.id);
  }else{const next=await connect(invite.destination);latest.current=next;setState(next);requested.current='habitat';setDestination('habitat');window.history.replaceState(null,'','/habitat');}
  setPanel(null);setSitting(false);setMessage('Joined your friend’s gathering.');
 });}
 function change(objects:WorldObject[]){history.current=[...history.current.slice(-29),draft];future.current=[];setDraft(objects);setHistoryAvailability({undo:true,redo:false});}
 function undo(){const previous=history.current.pop();if(!previous)return;future.current.push(draft);setDraft(previous);setSelected(null);setHistoryAvailability({undo:history.current.length>0,redo:future.current.length>0});}
 function redo(){const next=future.current.pop();if(!next)return;history.current.push(draft);setDraft(next);setSelected(null);setHistoryAvailability({undo:history.current.length>0,redo:future.current.length>0});}
 function add(assetId:string,label:string,behavior:WorldObject['behavior']='decoration'){if(draft.length>=120){setError('World limit: 120 objects. Remove an object before adding another.');return;}const o:WorldObject={id:crypto.randomUUID(),assetId,name:label,x:0,y:0,z:2,rotation:0,scale:1,behavior,target:''};change([...draft,o]);setSelected(o.id);}
 function patch(values:Partial<WorldObject>){change(draft.map(o=>o.id===selected?{...o,...values}:o));}
 function enterBuild(){setPanel(null);setSitting(false);baseRevision.current=viewState?.world?.revision??0;setDraft(viewState?.world?.objects??[]);history.current=[];future.current=[];setHistoryAvailability({undo:false,redo:false});setEditing(true);}
 async function save(){if(common){setGuestState(old=>old?.world?{...old,world:{...old.world,objects:draft}}:old);setEditing(false);setMessage('Demo updated for this session.');return;}await action(async()=>{if(!state?.world)return;const s=await api<WorldState>('save',{worldId:state.world.id,revision:baseRevision.current,objects:draft});setState(s);latest.current=s;setEditing(false);setMessage('World saved. Visitors can see the changes.');});}
 const chosen=draft.find(o=>o.id===selected),filtered=BUILD_ASSETS.filter(a=>(category==='all'||a.category===category)&&a.name.toLowerCase().includes(query.toLowerCase())),shown=filtered.slice(page*24,page*24+24);
 return <main className={`hb-app${editing?' is-editing':''}${advancedBuilder?' is-advanced':''}${!viewState?.profile?' is-entry':''}${town?' is-public-world':''}`} id='main'><div className='hb-stage'><StageBoundary><Stage speech={speech} speechAt={speechAt} guestStyle={common?guestStyle:undefined} onDirectory={()=>setPanel('worlds')} state={viewState} pose={pose} input={input} motion={motion} editing={editing} locked={!!panel||!viewState?.profile} selected={selected} draft={draft} onSelect={setSelected} onUse={o=>void use(o)} sitting={sitting} celebrate={celebrate} interactedAt={interactedAt} quality={quality} advancedBuilder={advancedBuilder} tool={advancedTool} snap={advancedSnap} onTransform={(id,values)=>change(draft.map(o=>o.id===id?{...o,...values}:o))}/></StageBoundary></div>
 <header className='hb-top'><Link href='/' className='hb-brand'><BrandMark/><strong>CTRL</strong><span>{common?'COMMON GROUND':town?'PUBLIC WORLD':'HABITAT'}</span></Link><div>
  <button disabled={busy} aria-pressed={common} onClick={commonGround}>Common Ground</button><button disabled={busy} aria-pressed={!common&&!town} onClick={()=>void chooseDestination('habitat')}>Habitat</button><button disabled={busy} aria-pressed={town} onClick={()=>void chooseDestination('public')}>Public World</button>
  {state?.profile&&<><span className='hb-status'>{online?state.profile.name:'Offline'}</span>{!online&&state.world&&<button onClick={()=>void action(async()=>{await connect(state.world!.id);})}>Reconnect</button>}<button className='hb-nav-worlds' onClick={()=>setPanel('worlds')}>Worlds</button><button className='hb-nav-character' onClick={()=>setPanel('wardrobe')}>Character</button></>}
  <button className='hb-nav-settings' onClick={()=>{settingsRevision.current=state?.world?.revision??0;setWorldName(state?.world?.name??'');setPanel('settings');}}>Settings</button>
  {!state&&!common&&<button className='hb-nav-connect' onClick={()=>{setPanel('entry');requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.hb-entry .wallet-options button')?.focus());}}>Connect wallet</button>}
 </div></header>
 {viewState&&<HabitatMusic/>}
 {!editing&&!panel&&viewState?.world&&<div className='hb-title'><small>{common?'PLAY BEFORE YOU CONNECT':town?'PUBLIC WORLD':publicRoom?'PUBLIC ROOM':viewState.canEdit?'YOUR HABITAT':'VISITING HABITAT'}</small><h1>{viewState.world.name}</h1><p>{common?'Explore. Build. Make yourself at home.':town?`${state?.players.length??0} players online · ${localResidentCount} local NPCs`:publicRoom?'Sit together, chat, or host a gathering in Town life.':viewState.canEdit?'Your own corner of CTRL.':'A neighbor’s corner of CTRL.'}</p>{common&&<small>Your demo changes last for this visit.</small>}</div>}
 {town&&!panel&&<TownGuide pose={pose} onDirectory={()=>setPanel('worlds')} onActivity={id=>void townActivity(id)} onTravel={id=>void townTravel(id)} states={viewState?.states??{}} busy={busy}/>}
 {state?.profile&&state.world&&!common&&!panel&&!editing&&<TownVenueGuide worldId={state.world.id} pose={pose} busy={busy} onTravel={(id,kind)=>void venueTravel(id,kind)}/>}
 {state?.profile&&!common&&!panel&&!editing&&<TownLifePanel state={state} pose={pose} busy={busy} onAction={(path,data)=>void lifeAction(path,data)} onInvite={id=>void acceptInvite(id)} onVisit={id=>void(id===PUBLIC_WORLD_ID?chooseDestination('public'):visit(id))}/>}
 {error&&panel!=='entry'&&<div className='hb-alert' role='alert'>{error}<button onClick={()=>setError('')}>Dismiss</button></div>}{message&&!error&&panel!=='entry'&&<div className='hb-message' role='status' onClick={()=>setMessage('')}>{message}</div>}
 {!state&&panel==='entry'&&<div className='hb-entry-caption'><strong>Starter garden</strong><span>Yours to rebuild.</span></div>}
 {panel==='entry'&&<section className='hb-panel hb-entry' aria-labelledby='habitat-entry-title'><h1 id='habitat-entry-title'>Enter {destination==='public'?'Public World':'Habitat'}.</h1><p>Choose a character. Build your place. Invite your people.</p>{message&&!error&&<p className='hb-entry-note' role='status'>{message}</p>}{error&&<p className='form-error' role='alert'>{error}</p>}<WalletConnection onVerified={()=>void refresh()}/>{!loaded&&<small role='status'>Checking your saved session…</small>}{error&&<button onClick={()=>void refresh()}>Retry connection</button>}<div className='hb-entry-guest'><span>Just looking around?</span><button onClick={commonGround} disabled={busy}>{busy?'Opening Common Ground…':'Enter Common Ground'}</button><small>Explore and try building without a wallet.</small></div></section>}

 {panel==='wardrobe'&&<section className='hb-panel hb-character-creator' aria-label='Complete character selection'>
   <div className='hb-creator-visual'>
    <CharacterCreatorPreview appearance={appearance}/>
    <div className='hb-creator-identity'><strong>{selectedCharacter.name}</strong><span>Drag to rotate</span></div>
   </div>
   <div className='hb-creator-controls'>
    <h1>Choose your character.</h1>
    <p>Pick one complete character, then give your profile a name. Every available character is free. More whole-character models will join once their actual game-ready files pass checks.</p>
    <div className='hb-creator-gender' role='group' aria-label='Available complete characters'>
     {AVAILABLE_CHARACTER_DEFINITIONS.map(character=><button type='button' aria-pressed={selectedCharacter.id===character.id} className={selectedCharacter.id===character.id?'hb-primary':''} key={character.id} onClick={()=>setAppearance({...defaultAppearance,gender:character.gender,characterId:character.id})}>{character.name} · Free</button>)}
    </div>
    <p className='hb-small'>Model by {selectedCharacter.license.author} · {selectedCharacter.license.name} · <a href={selectedCharacter.license.source} target='_blank' rel='noopener noreferrer'>Source / license ↗</a></p>
    <button type='button' className='hb-creator-random' onClick={()=>{const index=crypto.getRandomValues(new Uint32Array(1))[0]%AVAILABLE_CHARACTER_DEFINITIONS.length;const chosen=AVAILABLE_CHARACTER_DEFINITIONS[index];setAppearance({...defaultAppearance,gender:chosen.gender,characterId:chosen.id});}}>↻ Surprise me</button>
    <label>Character name<input aria-label='Name' value={name} onChange={e=>setName(e.target.value)} maxLength={20} placeholder='Your name'/></label>
    <p className='hb-small'>Your character selection is saved with your wallet.</p>
    <button className='hb-primary hb-creator-enter' disabled={busy||!state||name.trim().length<2} onClick={()=>void profile()}>{busy?'Saving avatar…':state?.profile?'Save character':destination==='public'?'Enter Public World':'Enter Habitat'}</button>
    {state?.profile&&<button onClick={()=>setPanel(null)}>Continue to my world →</button>}
    {!state&&<p>Connect and verify a wallet to save your character and personal world.</p>}
   </div>
  </section>}
  {panel==='worlds'&&<section className='hb-panel'><h1>Visit a habitat.</h1><button onClick={()=>void chooseDestination('public')}>Public World</button>{state?.homeId&&<button className='hb-primary' onClick={()=>void visit(state.homeId!)}>Go home</button>}{state?.worlds.filter(w=>w.id!==PUBLIC_WORLD_ID).map(w=><button className='hb-world-row' key={w.id} onClick={()=>void visit(w.id)}><strong>{w.name}</strong><span>by {w.owner} ↗</span></button>)}{!state?.worlds.length&&<p>No public worlds yet. Enter the workshop to make the first one.</p>}<button onClick={()=>setPanel(common?null:state?.profile?(state.world?null:'worlds'):state?'wardrobe':'entry')}>Close</button></section>}

{panel==='settings'&&<section className='hb-panel'><h1>Settings.</h1>{state?.profile&&<button onClick={()=>setPanel('wardrobe')}>Change character</button>}<label>Graphics<select value={quality} onChange={e=>setQuality(e.target.value as 'low'|'high')}><option value='low'>Light / mobile</option><option value='high'>Desktop</option></select></label>{state?.permissions?.canManage&&<><label>World name<input value={worldName} maxLength={60} onChange={e=>setWorldName(e.target.value)}/></label><div className='hb-row'>{(['private','public'] as const).map(v=><button key={v} disabled={busy} onClick={()=>void action(async()=>{let s:WorldState;try{s=await api<WorldState>('settings',{name:worldName,visibility:v,revision:settingsRevision.current});}catch(reason){if(reason instanceof HabitatApiError&&reason.status===409){const fresh=await api<WorldState>('state');latest.current=fresh;setState(fresh);throw new Error('This world changed in another session. Close and reopen Settings before saving again.');}throw reason;}latest.current=s;settingsRevision.current=s.world?.revision??settingsRevision.current;setState(s);setMessage(`World saved as ${v}.`);})}>Save {v}</button>)}</div><p className='hb-small'>Public worlds allow visitors. Only the owner manages settings; invited editors can change objects. Private worlds are enforced on the server.</p><WorldMembers key={state.world!.id} worldId={state.world!.id}/></>}<p>WASD / arrows: move<br/>Shift: run · Space: jump<br/>Drag: camera · Scroll: zoom<br/>E or click nearby object: interact</p><a href='/account'>Wallet account ↗</a><button onClick={commonGround}>Common Ground ↗</button><button onClick={()=>setPanel(common?null:state?.profile?(state.world?null:'worlds'):state?'wardrobe':'entry')}>Close</button></section>}
 {editing&&(advancedBuilder?<HabitatBuilderTools objects={draft} selectedId={selected} onSelect={setSelected} onAdd={add} onPatch={patch} onDuplicate={()=>{if(!chosen||draft.length>=120)return;const copy={...chosen,id:crypto.randomUUID(),x:Math.min(14,chosen.x+1)};change([...draft,copy]);setSelected(copy.id);}} onDelete={()=>{if(!chosen)return;change(draft.filter(o=>o.id!==chosen.id).map(o=>o.target===chosen.id?{...o,target:''}:o));setSelected(null);}} onUndo={undo} onRedo={redo} canUndo={historyAvailability.undo} canRedo={historyAvailability.redo} busy={busy} online={online} onSave={()=>void save()} onCancel={()=>{setEditing(false);setError('');}} tool={advancedTool} onTool={setAdvancedTool} snap={advancedSnap} onSnap={setAdvancedSnap} worlds={state?.worlds??[]}/>:<><aside className='hb-catalog'><div className='hb-row'><h2>Build anything small.</h2><button onClick={()=>{setEditing(false);setError('');}}>Cancel</button></div><input aria-label='Search assets' placeholder='Search furniture, plants, walls…' value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><select aria-label='Asset category' value={category} onChange={e=>{setCategory(e.target.value);setPage(0);}}><option value='all'>All assets / {BUILD_ASSETS.length}</option>{BUILD_ASSET_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select><details open><summary>Interactive pieces</summary><div className='hb-primitives'>{primitives.map(([id,label,behavior])=><button key={id} onClick={()=>add(id,label,behavior)}>{label} +</button>)}</div></details><div className='hb-assets'>{shown.map(a=><button key={a.id} onClick={()=>add(a.id,a.name,a.collision==='solid'?'solid':'decoration')}><img src={a.thumbnailUrl} alt='' loading='lazy'/><span>{a.name}</span></button>)}</div><div className='hb-row'><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span>{page+1}/{Math.max(1,Math.ceil(filtered.length/24))}</span><button disabled={(page+1)*24>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next</button></div></aside><aside className='hb-inspector'><h2>{chosen?'Shape its place.':'Choose an object.'}</h2><select aria-label='Placed objects' value={selected??''} onChange={e=>setSelected(e.target.value)}><option value=''>Placed objects / {draft.length}</option>{draft.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>{chosen&&<><label>Name<input value={chosen.name} maxLength={60} onChange={e=>patch({name:e.target.value})}/></label>{(['x','y','z','rotation','scale'] as const).map(k=><label key={k}>{k}<input type='range' min={k==='scale'?.25:k==='rotation'?-Math.PI:k==='y'?0:k==='z'?-8:-14} max={k==='scale'?4:k==='rotation'?Math.PI:k==='y'?8:k==='z'?12:14} step={k==='rotation'?.1:.25} value={chosen[k]} onChange={e=>patch({[k]:Number(e.target.value)})}/><output>{chosen[k].toFixed(2)}</output></label>)}<label>Behavior<select value={chosen.behavior} onChange={e=>patch({behavior:e.target.value as WorldObject['behavior'],target:''})}>{behaviorSchema.options.map(b=><option key={b}>{b}</option>)}</select></label>{chosen.behavior==='switch'&&<label>Target<select value={chosen.target} onChange={e=>patch({target:e.target.value})}><option value=''>Select object</option>{draft.filter(o=>o.id!==chosen.id).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}{chosen.behavior==='portal'&&<label>Destination<select value={chosen.target} onChange={e=>patch({target:e.target.value})}><option value=''>Select world</option>{state?.worlds.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>}<div className='hb-row'><button onClick={()=>{const copy={...chosen,id:crypto.randomUUID(),x:Math.min(14,chosen.x+1)};change([...draft,copy]);setSelected(copy.id);}}>Duplicate</button><button onClick={()=>{change(draft.filter(o=>o.id!==chosen.id).map(o=>o.target===chosen.id?{...o,target:''}:o));setSelected(null);}}>Delete</button></div></>}<div className='hb-row'><button disabled={!historyAvailability.undo} onClick={undo}>Undo</button><button disabled={!historyAvailability.redo} onClick={redo}>Redo</button></div><button className='hb-primary' disabled={busy||!online} onClick={()=>void save()}>{busy?'Saving…':'Save & play'}</button><small>{draft.length}/120 objects · changes saved on confirmation</small></aside></>)}
 {state?.profile&&!editing&&!panel&&!chatOpen&&<button className='hb-chat-toggle' onClick={()=>setChatOpen(true)}>Chat nearby</button>}
 {state?.profile&&!editing&&!panel&&chatOpen&&<form className='hb-chat' onSubmit={e=>{e.preventDefault();if(!chat.trim())return;const text=chat.trim(),at=Date.now();setSpeech(text);setSpeechAt(at);setChat('');if(!common&&state?.profile){flags.current={...flags.current,speech:text,speechAt:at};void sync();const sessionId=latest.current?.presenceSession?.id;if(sessionId)void lifeAction('town-chat',{text,sessionId});setChatOpen(false);}}}><label className='sr-only' htmlFor='world-chat'>Say something nearby</label><input id='world-chat' maxLength={120} autoFocus={chatOpen} placeholder='Say something nearby…' value={chat} onChange={e=>setChat(e.target.value)}/><button disabled={!chat.trim()||!online}>Say</button>{chatOpen&&<button type='button' aria-label='Close chat' onClick={()=>setChatOpen(false)}>×</button>}</form>}
 {viewState?.profile&&!editing&&!panel&&<><footer className='hb-bottom'>{viewState.canEdit&&<button className='hb-primary' onClick={enterBuild}>{common?'Try building +':'Build my world +'}</button>}{common&&<button onClick={rerollGuest}>Random character ↻</button>}<button onClick={()=>{setCelebrate(true);if(!common&&state?.profile){flags.current={...flags.current,celebrate:true};void sync();}}}>Wave</button>{state?.canEdit&&state.world?.id===state.homeId&&state.world.ownerId===state.profile?.id&&state.world.objects.length===0&&<button onClick={()=>void furnishEmptyHome()} disabled={busy||!online}>Use starter garden ✦</button>}<button disabled={busy} onClick={()=>{const o=nearestUsable(viewState.world?.objects??[],pose.current.x,pose.current.z);if(o)void use(o);else setMessage('Walk closer to a seat, switch or other usable object.');}}>Interact</button><button className='hb-action-jump' onClick={()=>{setSitting(false);input.current.jump=true;}}>Jump</button><button className='hb-action-run' onPointerDown={touch.run} onPointerUp={touch.release} onPointerCancel={touch.release} onLostPointerCapture={touch.release}>Hold to run</button></footer><div className='hb-touch' aria-label='Movement controls'>{[['↑',0,-1],['←',-1,0],['↓',0,1],['→',1,0]].map(([label,x,z])=><button key={label} aria-label={`Move ${label}`} onPointerDown={e=>touch.direction(e,Number(x),Number(z))} onPointerUp={touch.release} onPointerCancel={touch.release} onLostPointerCapture={touch.release}>{label}</button>)}</div></>}
 </main>;
}
