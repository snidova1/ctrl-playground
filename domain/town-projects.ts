import type {TownActivityId} from '@/features/habitat/town-districts';

/** Original civic construction loops. Contributions are work records, never money or XP. */
export const TOWN_PROJECTS=[
 {id:'fernwood-pavilion',name:'Fernwood gathering pavilion',x:-88,z:57,stages:[
  {name:'Collect orchard supplies',activity:'orchard-harvest',goal:2},
  {name:'Assemble the pavilion',activity:'artisan-project',goal:2},
  {name:'Plant the gathering garden',activity:'community-garden',goal:2},
 ]},
 {id:'tidewater-lanterns',name:'Tidewater promenade lanterns',x:5,z:-61,stages:[
  {name:'Build lantern housings',activity:'artisan-project',goal:2},
  {name:'Restore the waterfront',activity:'harbor-cleanup',goal:2},
 ]},
] as const satisfies readonly {id:string;name:string;x:number;z:number;stages:readonly {name:string;activity:TownActivityId;goal:number}[]}[];
export type TownProjectState={id:string;stage:number;revision:number;completedAt:number;contributions:number;neighbors:number};
export type TownActivityEvent={id:string;kind:string;target:string;at:number};
