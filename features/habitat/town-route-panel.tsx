'use client';
import type {TownLifeState} from '@/domain/town';
import {getTownRoute,getWorkSite,TOWN_ROUTES} from '@/domain/town-routes';
import {PUBLIC_WORLD_ID} from './public-world';
import {getTownVenue} from '@/domain/town-venues';

export default function TownRoutePanel({town,x,z,now,busy,worldId,onAction}:{town:TownLifeState;x:number;z:number;now:number;busy:boolean;worldId:string|undefined;onAction:(path:string,data:Record<string,unknown>)=>void}){
 const run=town.route,route=run&&getTownRoute(run.routeId),site=route&&getWorkSite(route.stops[run!.step]);
 const inWorld=(id?:string)=>worldId===(id??PUBLIC_WORLD_ID);
 const destination=(id?:string)=>id?getTownVenue(id)?.name??'the public room':'Public World';
 return <details open><summary>Neighborhood work routes</summary>
  {run&&route&&site?<article aria-label='Current work route'>
   <h3>{route.name}</h3><p>Stop {run.step+1} of {route.stops.length}: {site.name}</p>
   <p>{!inWorld(site.worldId)?`Travel to ${destination(site.worldId)} for this stop.`:Math.hypot(x-site.x,z-site.z)>4.25?`Walk to ${site.name} (${Math.round(Math.hypot(x-site.x,z-site.z))} m away).`:run.readyAt>now?`Working · ${Math.ceil((run.readyAt-now)/1000)}s`:run.readyAt?'Ready to finish this stop.':site.verb}</p>
   <button disabled={busy||!inWorld(site.worldId)||Math.hypot(x-site.x,z-site.z)>4.25||run.readyAt>now} onClick={()=>onAction(run.readyAt?'town-route/finish':'town-route/work',{runId:run.id,revision:run.revision})}>{run.readyAt?'Finish route stop':site.verb}</button>
   <button disabled={busy} onClick={()=>onAction('town-route/cancel',{runId:run.id,revision:run.revision})}>Cancel route</button>
   <ol>{route.stops.map((id,i)=><li key={id}>{getWorkSite(id).name}{i<run.step?' · saved':i===run.step?' · current':''}</li>)}</ol>
  </article>:<>
   <p>Work at each stop to leave a saved change for everyone. No XP or currency rewards.</p>
   {TOWN_ROUTES.map(r=>{const first=getWorkSite(r.stops[0]),close=inWorld(first.worldId)&&Math.hypot(x-first.x,z-first.z)<=4.25;return <div className='hb-life-row' key={r.id}><strong>{r.name}</strong><small>{r.stops.length} stops · starts at {first.name} · {destination(first.worldId)}</small><button disabled={busy||!!town.job||!close} onClick={()=>onAction('town-route/start',{id:r.id})}>Start {r.name}</button>{!close&&<small>Walk to {first.name} to begin.</small>}</div>;})}
  </>}
 </details>;
}
