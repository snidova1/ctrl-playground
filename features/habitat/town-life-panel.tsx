'use client';
import {useEffect,useState,type MutableRefObject} from 'react';
import type {Pose} from '@/features/plaza/types';
import type {HabitatState} from '@/domain/habitat';
import {CROP_GROW_MS,TOWN_GARDEN_BEDS,type TownLifeState} from '@/domain/town';
import {TOWN_ACTIVITIES,TOWN_DISTRICTS} from './town-districts';
import TownProjectPanel from './town-project-panel';
import TownRoutePanel from './town-route-panel';

export default function TownLifePanel({state,pose,busy,onAction,onInvite}:{state:HabitatState;pose:MutableRefObject<Pose>;busy:boolean;onAction:(path:string,data:Record<string,unknown>)=>void;onInvite:(id:string)=>void}){
 const [open,setOpen]=useState(false),[now,setNow]=useState(0),[position,setPosition]=useState({x:0,z:6});
 useEffect(()=>{const tick=()=>{setNow(Date.now());setPosition({...pose.current});};const timer=setInterval(tick,400);return()=>clearInterval(timer);},[pose]);
 const town=state.town,sessionId=state.presenceSession?.id;
 if(!town||!sessionId)return null;
 const job=town.job,seconds=job?Math.max(0,Math.ceil((job.readyAt-now)/1000)):0;
 const request=(path:string,data:Record<string,unknown>)=>onAction(path,{...data,...(path.startsWith('town-job')||path.startsWith('town-route')||path==='town-garden'||path.startsWith('town-social')?{sessionId}:{})});
 const nearby=state.players.filter(p=>p.id!==state.profile?.id&&Math.hypot(position.x-p.x,position.z-p.z)<4);
 const invitations=town.invites.length+town.friends.filter(f=>f.incoming&&f.status==='pending').length;
 return <aside className='hb-life-dock' aria-label='Town life and neighbors'>
  <div className='hb-life-actions'>
   <button aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Close town life':`Town life${invitations?` · ${invitations} invites`:''}`}</button>
   {job&&<button disabled={busy||seconds>0} onClick={()=>request('town-job/finish',{jobId:job.id})}>{seconds?`Working · ${seconds}s`:'Finish activity'}</button>}
  </div>
  {open&&<section className='hb-life-panel' aria-label='Persistent town life'>
   <h2>Your town life</h2><p>{town.progress.completed} completed contributions saved</p>
   <details><summary>Conversation history</summary>{!town.chat.length&&<p>No messages yet.</p>}{town.chat.map(message=><p key={message.id}><strong>{message.name}</strong> {message.text}</p>)}</details>
   {job&&<div><strong>{TOWN_ACTIVITIES.find(a=>a.id===job.activityId)?.name}</strong><button disabled={busy} onClick={()=>request('town-job/cancel',{jobId:job.id})}>Cancel activity</button></div>}
   <details><summary>Shared projects</summary>{TOWN_ACTIVITIES.map(a=>{const progress=town.contributions[a.id];return <p key={a.id}><strong>{a.name}</strong><br/>{progress?.count??0} contributions from {progress?.neighbors??0} neighbors</p>;})}</details>
   <TownProjectPanel town={town}/>
   <TownRoutePanel town={town} x={position.x} z={position.z} now={now} busy={busy} worldId={state.world?.id} onAction={request}/>
   <details open><summary>Community garden</summary>{town.garden.map(bed=>{
    const place=TOWN_GARDEN_BEDS.find(b=>b.id===bed.id)!;
    const close=Math.hypot(position.x-place.x,position.z-place.z)<=4.25;
    const growing=bed.wateredAt?Math.max(0,Math.ceil((bed.wateredAt+CROP_GROW_MS-now)/1000)):0;
    const action=!bed.crop?'plant':!bed.wateredAt?'water':'harvest';
    return <div className='hb-life-row' key={bed.id}><span>{bed.id.replace('fern-bed-','Bed ')} · {!bed.crop?'Ready for seeds':!bed.wateredAt?'Needs water':growing?`Growing · ${growing}s`:'Blooming'}</span><button disabled={busy||!close||!!growing} onClick={()=>request('town-garden',{id:bed.id,revision:bed.revision,action})}>{action==='plant'?'Plant seeds':action==='water'?'Water flowers':'Harvest flowers'}</button>{!close&&<small>Walk to Fernwood Park’s garden beds</small>}</div>;
   })}</details>
   <details open><summary>Nearby players</summary>{!nearby.length&&<p>Meet a neighbor to interact.</p>}{nearby.map(player=>{
    const friend=town.friends.find(f=>f.id===player.id);
    return <div className='hb-life-row' key={player.id}><strong>{player.name}</strong>{!friend?<button disabled={busy} onClick={()=>request('town-friend',{id:player.id,action:'request'})}>Add friend</button>:<small>{friend.status==='accepted'?'Friend':'Friend request pending'}</small>}<button disabled={busy} onClick={()=>request('town-social',{id:player.id,kind:'high-five'})}>Invite high five</button><button disabled={busy} onClick={()=>request('town-social',{id:player.id,kind:'dance'})}>Invite dance</button></div>;
   })}</details>
   {town.social.filter(s=>s.recipient===state.profile?.id&&!s.acceptedAt&&s.expiresAt>now).map(s=><div className='hb-life-row' key={s.id}><span>{state.players.find(p=>p.id===s.initiator)?.name??'A neighbor'} invited you to {s.kind}</span><button disabled={busy} onClick={()=>request('town-social/accept',{id:s.id})}>Join {s.kind}</button></div>)}
   <details open><summary>Friends and invitations</summary>{town.friends.map(friend=><div className='hb-life-row' key={friend.id}><strong>{friend.name}</strong>{friend.incoming&&friend.status==='pending'?<button disabled={busy} onClick={()=>request('town-friend',{id:friend.id,action:'accept'})}>Accept friend</button>:friend.status==='accepted'?<><label>Meet at<select aria-label={`Gathering for ${friend.name}`} defaultValue='' onChange={event=>{if(event.target.value)request('town-invite',{id:friend.id,destination:event.target.value});event.target.value='';}}><option value=''>Invite to a gathering</option>{TOWN_DISTRICTS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}<option value={state.homeId!}>My Habitat</option></select></label>{friend.homeId&&<small>Home available in the Habitat directory</small>}</>:<small>Request sent</small>}<button disabled={busy} onClick={()=>request('town-friend',{id:friend.id,action:'remove'})}>Remove request or friend</button></div>)}{town.invites.map(invite=><div className='hb-life-row' key={invite.id}><span>{invite.name} invited you to {TOWN_DISTRICTS.find(d=>d.id===invite.destination)?.name??'their Habitat'}</span><button disabled={busy} onClick={()=>onInvite(invite.id)}>Accept invitation</button></div>)}</details>
  </section>}
 </aside>;
}
export function mergeTownLife(state:HabitatState,town:TownLifeState):HabitatState{return {...state,town};}
