'use client';
import type {TownLifeState} from '@/domain/town';
import {TOWN_TABLE,TOWN_TABLE_NEEDS} from '@/domain/town-table';
import {PUBLIC_WORLD_ID} from './public-world-geography';
export default function TownTablePanel({town,x,z,worldId,busy,onAction}:{town:TownLifeState;x:number;z:number;worldId?:string;busy:boolean;onAction:(path:string,data:Record<string,unknown>)=>void}){
 const table=town.table;if(!table)return null;
 const near=worldId===PUBLIC_WORLD_ID&&Math.hypot(x-TOWN_TABLE.x,z-TOWN_TABLE.z)<=4.25;
 const ready=table.neighbors>=2&&TOWN_TABLE_NEEDS.every(n=>(table.supplies[n.activity]??0)>=1);
 return <details><summary>Today’s neighborhood table</summary><article aria-label='Neighborhood table preparation'>
  <p>Bring the town together through orchard, café and garden work. At least two neighbors prepare the shared table each day.</p>
  <ul>{TOWN_TABLE_NEEDS.map(n=><li key={n.activity}>{n.name} · {(table.supplies[n.activity]??0)>0?'Ready':'Needs help'}<br/><small>{n.district}</small></li>)}</ul>
  <p>{table.neighbors} contributing neighbors · at least 2 needed</p>
  {table.servedAt?<p role='status'>Served for everyone{table.servedBy?` by ${table.servedBy}`:''}. Today’s preparation is saved.</p>:<>
   <button disabled={busy||!ready||!near} onClick={()=>onAction('town-table/serve',{})}>Serve neighborhood table</button>
   {!near&&<p>Meet at the east picnic table in Willow Square.</p>}
  </>}
  <small>Next preparation starts <time dateTime={new Date(table.endsAt).toISOString()}>{new Date(table.endsAt).toLocaleString()}</time>. Completed tables stay in the town’s history.</small>
 </article></details>;
}
