import {z} from 'zod';
import type {TownActivityId,TownDistrictKind} from '@/features/habitat/town-districts';

// Original CTRL routes, informed by Townies' physical work targets. No economy.
export type WorkSite={id:string;name:string;x:number;z:number;district:TownDistrictKind;kind:'mail'|'fruit'|'litter'|'flowers'|'wood'|'grass'|'road'|'hedge'|'leaves';verb:string};
export const TOWN_WORK_SITES:readonly WorkSite[]=[
 {id:'post',name:'Clover post stand',x:78,z:27,district:'residential',kind:'mail',verb:'Collect letters'},
 {id:'clover-west',name:'West Clover mailbox',x:63,z:21,district:'residential',kind:'mail',verb:'Deliver letters'},
 {id:'clover-east',name:'East Clover mailbox',x:86,z:21,district:'residential',kind:'mail',verb:'Deliver letters'},
 {id:'apple-baskets',name:'Applehill baskets',x:76,z:80,district:'orchard',kind:'fruit',verb:'Gather fruit'},
 {id:'cafe',name:'Willow café supplies',x:4,z:5,district:'center',kind:'fruit',verb:'Deliver fruit'},
 {id:'harbor-west',name:'West promenade',x:-6,z:-76,district:'harbor',kind:'litter',verb:'Collect litter'},
 {id:'harbor-east',name:'East promenade',x:14,z:-76,district:'harbor',kind:'litter',verb:'Collect litter'},
 {id:'harbor-recycling',name:'Dock sorting stand',x:5,z:-76,district:'harbor',kind:'litter',verb:'Sort collected litter'},
 {id:'workshop',name:'Artisan workbench',x:-75,z:-52,district:'workshop',kind:'wood',verb:'Prepare components'},
 {id:'stage',name:'Sunset stage supplies',x:77,z:-73,district:'festival',kind:'wood',verb:'Deliver stage components'},
 {id:'fern-west',name:'Fernwood west flowers',x:-82,z:46,district:'garden',kind:'flowers',verb:'Tend flowers'},
 {id:'fern-east',name:'Fernwood east flowers',x:-67,z:46,district:'garden',kind:'flowers',verb:'Tend flowers'},
 {id:'lawn-west',name:'Fernwood picnic lawn',x:-85,z:40,district:'garden',kind:'grass',verb:'Mow the lawn'},
 {id:'lawn-east',name:'Clover common lawn',x:70,z:30,district:'residential',kind:'grass',verb:'Mow the lawn'},
 {id:'road-square',name:'Willow crossing',x:9,z:13,district:'center',kind:'road',verb:'Sweep the crossing'},
 {id:'road-clover',name:'Clover crossing',x:74,z:34,district:'residential',kind:'road',verb:'Sweep the crossing'},
 {id:'walk-square',name:'Willow walkway',x:12,z:8,district:'center',kind:'road',verb:'Wash the walkway'},
 {id:'walk-artisan',name:'Artisan walkway',x:-68,z:-48,district:'workshop',kind:'road',verb:'Wash the walkway'},
 {id:'hedge-clover',name:'Clover hedge',x:67,z:32,district:'residential',kind:'hedge',verb:'Trim the hedge'},
 {id:'hedge-apple',name:'Applehill hedge',x:68,z:77,district:'orchard',kind:'hedge',verb:'Trim the hedge'},
 {id:'leaves-fern',name:'Fernwood leaf clearing',x:-70,z:39,district:'garden',kind:'leaves',verb:'Rake leaves'},
 {id:'leaves-apple',name:'Applehill leaf clearing',x:81,z:77,district:'orchard',kind:'leaves',verb:'Rake leaves'},
];
export const TOWN_ROUTES:readonly {id:string;name:string;activity:TownActivityId;stops:readonly string[]}[]=[
 {id:'clover-mail',name:'Clover letter round',activity:'neighborhood-post',stops:['post','clover-west','clover-east']},
 {id:'cafe-fruit',name:'Orchard to café',activity:'cafe-supplies',stops:['apple-baskets','cafe']},
 {id:'harbor-care',name:'Tidewater cleanup round',activity:'harbor-cleanup',stops:['harbor-west','harbor-east','harbor-recycling']},
 {id:'sunset-prep',name:'Build a Sunset gathering',activity:'festival-stage',stops:['workshop','stage']},
 {id:'fernwood-care',name:'Fernwood flower round',activity:'community-garden',stops:['fern-west','fern-east']},
 {id:'lawn-care',name:'Neighborhood lawns',activity:'community-garden',stops:['lawn-west','lawn-east']},
 {id:'street-sweep',name:'Sweep neighborhood streets',activity:'neighborhood-post',stops:['road-square','road-clover']},
 {id:'walkway-wash',name:'Wash town walkways',activity:'artisan-project',stops:['walk-square','walk-artisan']},
 {id:'hedge-trim',name:'Shape neighborhood hedges',activity:'orchard-harvest',stops:['hedge-clover','hedge-apple']},
 {id:'leaf-rake',name:'Park and orchard leaf round',activity:'community-garden',stops:['leaves-fern','leaves-apple']},
];
export const ROUTE_WORK_MS=6000,ROUTE_TTL=3600000,WORK_REGROW_MS=86400000;
export type TownRouteRun={id:string;routeId:string;step:number;revision:number;readyAt:number;expiresAt:number};
export type TownWorkVisit={siteId:string;at:number;player:string};
export const routeStartSchema=z.object({id:z.string().max(50),sessionId:z.string().uuid()}).strict();
export const routeStepSchema=z.object({runId:z.string().uuid(),revision:z.number().int().nonnegative(),sessionId:z.string().uuid()}).strict();
export const getTownRoute=(id:string)=>TOWN_ROUTES.find(r=>r.id===id);
export const getWorkSite=(id:string)=>TOWN_WORK_SITES.find(s=>s.id===id)!;
