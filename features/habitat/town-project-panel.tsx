'use client';
import {townActivityLabel} from '@/domain/town-activity-label';
import type {TownLifeState} from '@/domain/town';
import {TOWN_PROJECTS} from '@/domain/town-projects';
import {TOWN_ACTIVITIES,TOWN_DISTRICTS} from './town-districts';
import {TOWN_ROUTES} from '@/domain/town-routes';

export default function TownProjectPanel({town}:{town:TownLifeState}){
 return <>
  <details open><summary>Build our town together</summary>
   {TOWN_PROJECTS.map(project=>{
    const saved=town.projects?.find(p=>p.id===project.id),stage=saved?.stage??0;
    const task=project.stages[stage],activity=task&&TOWN_ACTIVITIES.find(a=>a.id===task.activity);
    return <article className='hb-civic-project' key={project.id}>
     <h3>{project.name}</h3>
     <p>{task?`Step ${stage+1} of ${project.stages.length}: ${task.name}`:'Completed · open for all neighbors'}</p>
     {task&&<><p>{saved?.contributions??0}/{task.goal} contributions · {saved?.neighbors??0}/2 different neighbors</p>
      <small>Help with {activity?.name} in {TOWN_DISTRICTS.find(d=>d.id===activity?.district)?.name}. Each step needs at least two players. Finished construction stays in the shared world.</small></>}
    </article>;
   })}
  </details>
  <details><summary>Your saved activity history</summary>
   {!town.history?.length?<p>No activity recorded yet.</p>:<ol className='hb-activity-history'>{town.history.map(event=>{
    const target=TOWN_ACTIVITIES.find(a=>a.id===event.target)?.name??TOWN_ROUTES.find(a=>a.activity===event.target)?.name??event.target.replace('fern-bed-','Garden bed ');
    const label=townActivityLabel(event.kind);
    return <li key={event.id}>{label} · {target}<br/><time dateTime={new Date(event.at).toISOString()}>{new Date(event.at).toLocaleString()}</time></li>;
   })}</ol>}
  </details>
 </>;
}
