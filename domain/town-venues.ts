import {layoutSchema,type WorldObject} from '@/features/habitat/types';
import type {TownDistrictKind} from '@/features/habitat/town-districts';
export const TOWN_VENUES:readonly {id:string;name:string;district:TownDistrictKind;x:number;z:number;feature:string}[]=[
 {id:'cf330000-0000-4000-8000-000000000001',name:'Willow Tea Room',district:'center',x:-8,z:2.8,feature:'tea'},
 {id:'cf330000-0000-4000-8000-000000000002',name:'Artisan Community Studio',district:'workshop',x:-82,z:-60.5,feature:'studio'},
 {id:'cf330000-0000-4000-8000-000000000003',name:'Clover Post Office',district:'residential',x:71,z:18.5,feature:'post'},
 {id:'cf330000-0000-4000-8000-000000000004',name:'Tidewater Boathouse',district:'harbor',x:-6,z:-81.5,feature:'boats'},
 {id:'cf330000-0000-4000-8000-000000000005',name:'Sunset Music Lounge',district:'festival',x:70,z:-81.5,feature:'music'},
 {id:'cf330000-0000-4000-8000-000000000006',name:'Applehill Conservatory',district:'orchard',x:69,z:71.5,feature:'plants'},
];
export const getTownVenue=(id:string)=>TOWN_VENUES.find(v=>v.id===id);
export const townVenueOwner=(id:string)=>`ctrl-public-venue-${id.slice(-6)}`;
// Cutaway interiors retain a clear entrance and an unobstructed central aisle.
// Bundled Kenney CC0 geometry only; unique IDs and existing 120-object budget.
export function createTownVenue(id:string):WorldObject[]{
 const venue=getTownVenue(id);if(!venue)throw new Error('Unknown public room');
 const objects:WorldObject[]=[];
 const add=(assetId:string,name:string,x:number,z:number,scale=1,behavior:WorldObject['behavior']='decoration',y=0,rotation=0)=>objects.push({id:`cf340000-0000-4000-8000-${id.slice(-6)}${String(objects.length+1).padStart(6,'0')}`,assetId,name,x,y,z,scale,behavior,rotation,target:''});
 for(let x=-8;x<=8;x+=2)for(let z=-6;z<=6;z+=2)add('building-kit/floor','Room floor',x,z);
 for(let x=-8;x<=8;x+=2)add('building-kit/wall-window-square','Rear windows',x,-8,1,'solid',0,Math.PI/2);
 for(const x of [-10,10])for(let z=-6;z<=6;z+=2)add('building-kit/wall-window-square','Side windows',x,z,1,'solid');
 for(const x of [-5,5]){
  add('furniture-kit/tableRound','Gathering table',x,-1,2.2,'solid');
  add('furniture-kit/chair','Gathering chair',x-1.3,-1,2.6,'seat',0,Math.PI/2);
  add('furniture-kit/chair','Gathering chair',x+1.3,-1,2.6,'seat',0,-Math.PI/2);
  add('furniture-kit/bench','Window bench',x,-5,2.4,'seat');
  add('furniture-kit/lampSquareFloor','Room lantern',x,4,2,'light');
 }
 for(const x of [-8,8])for(const z of [-5,4])add('furniture-kit/pottedPlant','Room plants',x,z,2);
 const feature=venue.feature==='tea'?'furniture-kit/kitchenCoffeeMachine':venue.feature==='plants'?'nature-kit/plant_bushDetailed':venue.feature==='music'?'furniture-kit/bookcaseClosedWide':'furniture-kit/bookcaseOpen';
 add('furniture-kit/table','Community counter',0,-5,3,'solid');
 add(feature,venue.name+' display',0,-5,venue.feature==='plants'?1.8:1.5,'decoration',1);
 if(venue.feature==='tea')for(const x of [-5,5])add('food-kit/cup-coffee','Tea for neighbors',x,-1,.8,'decoration',.8);
 if(venue.feature==='plants')for(const x of [-5,5])add('nature-kit/flower_yellowB','Conservatory flowers',x,-1,.7,'decoration',.8);
 return layoutSchema.parse(objects);
}
