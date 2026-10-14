'use client';
import {useState} from 'react';
import type {TownGathering} from '@/domain/town-gatherings';
import {PUBLIC_WORLD_ID} from './public-world';
export default function TownGatheringPanel({events,profileId,worldId,homeId,x,z,busy,onAction,onVisit}:{events:TownGathering[];profileId:string;worldId:string|undefined;homeId:string|null;x:number;z:number;busy:boolean;onAction:(path:string,data:Record<string,unknown>)=>void;onVisit:(id:string)=>void}){
 const [title,setTitle]=useState(''),[kind,setKind]=useState<TownGathering['kind']>('picnic');
 return <details open><summary>Gather with neighbors</summary>
  <p>RSVP reserves your place. Check in physically to participate. Dance check-in means agreeing to a shared dance; home permission is always required.</p>
  <form onSubmit={e=>{e.preventDefault();onAction('town-gathering/create',{title,kind});}}>
   <label>Gathering name<input value={title} onChange={e=>setTitle(e.target.value)} minLength={3} maxLength={60} required/></label>
   <label>Activity<select value={kind} onChange={e=>setKind(e.target.value as TownGathering['kind'])}><option value='picnic'>Picnic</option><option value='dance'>Shared dance</option><option value='workshop'>Workshop meetup</option></select></label>
   <button disabled={busy||title.trim().length<3||(worldId!==PUBLIC_WORLD_ID&&worldId!==homeId)||events.some(e=>e.hostId===profileId)}>Host gathering here</button>
  </form>
  {!events.length&&<p>No gatherings yet. Host one in Public World or your own Habitat.</p>}
  {events.map(e=>{
   const joined=e.guests.find(g=>g.id===profileId),own=e.hostId===profileId,near=worldId===e.worldId&&Math.hypot(x-e.x,z-e.z)<=4.25;
   const data={id:e.id,revision:e.revision};
   return <article className='hb-civic-project' key={e.id} aria-label={`Gathering ${e.title}`}>
    <h3>{e.title}</h3><p>{e.hostName} · {e.kind} · {e.guests.length}/16 guests</p>
    <small>Ends {new Date(e.endsAt).toLocaleTimeString()} · {e.worldId===PUBLIC_WORLD_ID?'Public World':'Habitat with permission'} · ({Math.round(e.x)}, {Math.round(e.z)})</small>
    {worldId!==e.worldId&&<button disabled={busy} onClick={()=>onVisit(e.worldId)}>Visit gathering world</button>}
    {!joined?<button disabled={busy} onClick={()=>onAction('town-gathering/join',{id:e.id})}>RSVP</button>:<>
     {!joined.arrivedAt&&<button disabled={busy||!near} onClick={()=>onAction('town-gathering/check-in',{id:e.id})}>{e.kind==='dance'?'Agree and join dance':'Check in at gathering'}</button>}
     <button disabled={busy} onClick={()=>onAction('town-gathering/leave',{id:e.id})}>Leave gathering</button>
    </>}
    <ul>{e.guests.map(g=><li key={g.id}>{g.name} · {g.here?'Here':g.arrivedAt?'Attended':'RSVP saved'}{own&&g.id!==profileId&&<button disabled={busy||!near} onClick={()=>onAction('town-gathering/remove',{...data,guestId:g.id})}>Remove {g.name}</button>}</li>)}</ul>
    {own&&<>{e.kind==='dance'&&<button disabled={busy||!near||e.guests.filter(g=>g.here).length<2} onClick={()=>onAction('town-gathering/dance',data)}>Start shared dance</button>}<button disabled={busy||!near} onClick={()=>onAction('town-gathering/end',data)}>End gathering</button></>}
   </article>;
  })}
 </details>;
}
