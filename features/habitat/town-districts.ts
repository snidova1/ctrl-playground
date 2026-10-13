/**
 * Townies-inspired ORIGINAL CTRL district plan.
 * Coordinates are shared by the server, renderer, interaction checks and map.
 * The existing Willow Square remains an active district, never a separate fake world.
 */
export type TownDistrictKind='center'|'residential'|'garden'|'harbor'|'workshop'|'festival'|'orchard';
export type TownDistrict={id:TownDistrictKind;name:string;x:number;z:number;color:string;description:string};
export const TOWN_DISTRICTS:readonly TownDistrict[]=[
 {id:'center',name:'Willow Square',x:0,z:6,color:'#efd6ad',description:'Town café, shops and the social meeting square'},
 {id:'residential',name:'Clover Neighborhood',x:78,z:27,color:'#e8c8af',description:'Walk past colorful homes and tend neighborhood mail'},
 {id:'garden',name:'Fernwood Park',x:-75,z:46,color:'#a8c69a',description:'Gardens, picnics and a cooperative planting spot'},
 {id:'harbor',name:'Tidewater Harbor',x:5,z:-76,color:'#a3c9d1',description:'Boardwalk, boats and a shared waterfront task'},
 {id:'workshop',name:'Artisan Row',x:-75,z:-52,color:'#d9bd9e',description:'Creative workshops and neighborhood projects'},
 {id:'festival',name:'Sunset Meadow',x:77,z:-73,color:'#e9cba4',description:'Outdoor stage, music and shared celebrations'},
 {id:'orchard',name:'Applehill Orchard',x:76,z:80,color:'#bacb9b',description:'Fruit trees, winding paths and seasonal harvests'},
] as const;
/** Decorative buildings are also server-authoritative solid footprints. */
export type TownDistrictBuilding={id:string;district:TownDistrictKind;x:number;z:number;width:number;depth:number;wall:string;roof:string;levels:number};
const homes:TownDistrictBuilding[]=[];
for(const [id,cx,cz,wall,roof] of [
 ['residential',78,27,'#f3d7bd','#a5746a'],
 ['workshop',-75,-52,'#e1c4a7','#758f83'],
 ['festival',77,-73,'#f2d6ad','#ad776e'],
 ['orchard',76,80,'#e6dcbf','#7b9d75'],
] as const){
 for(let i=0;i<10;i++){
  const row=Math.floor(i/5),col=i%5;
  const x=cx+(col-2)*9.2,z=cz+(row===0?-14:15);
  homes.push({id:`${id}-building-${i}`,district:id,x,z,width:5.8,depth:5.9,wall:i%3===0?'#f6e9d2':wall,roof:i%2===0?roof:'#8da68a',levels:i%5===0?3:2});
 }
}
for(const [i,x] of [-18,-6,6,18].entries())homes.push({id:`harbor-building-${i}`,district:'harbor',x,z:-87,width:7.2,depth:6.5,wall:i%2===0?'#ecdbbe':'#e9bca3',roof:i%2===0?'#7b9d9a':'#bb8a77',levels:2});
export const TOWN_DISTRICT_BUILDINGS:readonly TownDistrictBuilding[]=homes;
export type TownActivityId='cafe-supplies'|'neighborhood-post'|'community-garden'|'harbor-cleanup'|'artisan-project'|'festival-stage'|'orchard-harvest';
export type TownActivity={id:TownActivityId;objectId:string;district:TownDistrictKind;x:number;z:number;name:string;verb:string;result:string;cooldownMs:number};
export const TOWN_ACTIVITIES:readonly TownActivity[]=[
 {id:'cafe-supplies',objectId:'cf220000-0000-4000-8000-000000000001',district:'center',x:4,z:5,name:'Café supplies',verb:'Restock café',result:'Café supplies are ready for the neighborhood.',cooldownMs:30000},
 {id:'neighborhood-post',objectId:'cf220000-0000-4000-8000-000000000002',district:'residential',x:78,z:27,name:'Neighborhood post',verb:'Deliver letters',result:'The neighborhood mail route is complete.',cooldownMs:45000},
 {id:'community-garden',objectId:'cf220000-0000-4000-8000-000000000003',district:'garden',x:-75,z:46,name:'Community flower bed',verb:'Water shared garden',result:'You watered Fernwood Park. Everyone can see it bloom.',cooldownMs:45000},
 {id:'harbor-cleanup',objectId:'cf220000-0000-4000-8000-000000000004',district:'harbor',x:5,z:-76,name:'Harbor maintenance',verb:'Tidy the dock',result:'The docks are sparkling clean.',cooldownMs:45000},
 {id:'artisan-project',objectId:'cf220000-0000-4000-8000-000000000005',district:'workshop',x:-75,z:-52,name:'Community workshop',verb:'Help town workshop',result:'The creative quarter got another helping hand.',cooldownMs:45000},
 {id:'festival-stage',objectId:'cf220000-0000-4000-8000-000000000006',district:'festival',x:77,z:-73,name:'Festival preparations',verb:'Prepare the stage',result:'The festival stage is ready to welcome neighbors.',cooldownMs:45000},
 {id:'orchard-harvest',objectId:'cf220000-0000-4000-8000-000000000007',district:'orchard',x:76,z:80,name:'Orchard baskets',verb:'Gather orchard fruit',result:'The community fruit baskets are full.',cooldownMs:45000},
] as const;
export function getTownActivity(id:string){return TOWN_ACTIVITIES.find(a=>a.id===id);}
export function getNearestTownActivity(x:number,z:number,radius=4.25){
 return TOWN_ACTIVITIES.filter(a=>Math.hypot(a.x-x,a.z-z)<=radius).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0]??null;
}
export function getTownDistrict(x:number,z:number){
 return [...TOWN_DISTRICTS].sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
}
