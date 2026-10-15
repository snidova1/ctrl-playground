import {layoutSchema,type WorldObject} from '@/features/habitat/types';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {TOWN_VENUES} from './town-venue-directory';
export {TOWN_VENUES} from './town-venue-directory';
export const getTownVenue=(id:string)=>TOWN_VENUES.find(v=>v.id===id);
export const townVenueOwner=(id:string)=>`ctrl-public-venue-${id.slice(-6)}`;
// Original room plans, bundled Kenney CC0 models. These are real saved objects:
// seats/lamps use the same authoritative interaction path as player housing.
// Keep the 86-object instanced shell and the existing 120-object ceiling.
export function createTownVenue(id:string):WorldObject[]{
 const venue=getTownVenue(id);if(!venue)throw new Error('Unknown public room');
 const objects:WorldObject[]=[];
 const add=(assetId:string,name:string,x:number,z:number,scale=1,behavior:WorldObject['behavior']='decoration',y=.1,rotation=0)=>{
  const object={id:`cf350000-0000-4000-8000-${id.slice(-6)}${String(objects.length+1).padStart(6,'0')}`,assetId,name,x,y,z,scale,behavior,rotation,target:''};objects.push(object);return object;
 };
 const top=(base:WorldObject,assetId:string,name:string,dx=0,dz=0,scale=1)=>add(assetId,name,base.x+dx,base.z+dz,scale,'decoration',base.y+getBuildAsset(base.assetId)!.bounds[1]*base.scale);
 const chair=(x:number,z:number,rotation=0,asset='chairCushion',name='Neighbor’s chair')=>add('furniture-kit/'+asset,name,x,z,2.6,'seat',.1,rotation);
 const rug=(x:number,z:number,round=false)=>add('furniture-kit/'+(round?'rugRound':'rugRectangle'),'Woven gathering rug',x,z,3,'decoration',.105);
 const table=(x:number,z:number,round=false)=>add('furniture-kit/'+(round?'tableRound':'table'),'Shared table',x,z,2.6,'solid');
 const shelf=(x:number,z:number,name='Community shelves')=>add('furniture-kit/bookcaseClosedWide',name,x,z,2.8,'solid');
 const pairedTables=(round=false)=>[-4,4].map(x=>{rug(x,0,round);const t=table(x,0,round);chair(x,-1.6);chair(x,1.6,Math.PI);return t;});
 for(let x=-8;x<=8;x+=2)for(let z=-6;z<=6;z+=2)add('building-kit/floor','Room floor',x,z,1,'decoration',0);
 for(let x=-8;x<=8;x+=2)add('building-kit/wall-window-square','Rear windows',x,-8,1,'solid',0,Math.PI/2);
 for(const x of [-10,10])for(let z=-6;z<=6;z+=2)add('building-kit/wall-window-square','Side windows',x,z,1,'solid');
 for(const x of [-7.8,7.8])for(const z of [-5,4])add('furniture-kit/pottedPlant','Window greenery',x,z,3);
 for(const x of [-2,2])add('furniture-kit/lampRoundFloor','Reading lamp',x,3.5,2,'light');
 if(venue.feature==='tea'){
  for(const t of pairedTables(true)){
   top(t,'food-kit/cup-coffee','Tea cup',-.35,0,.9);top(t,'food-kit/cup-coffee','Tea cup',.35,0,.9);
   top(t,'food-kit/croissant','Bakery display',0,.35,.7);
  }
  for(const x of [-3.8,-2.6,-1.4])add('furniture-kit/kitchenCabinet','Tea service counter',x,-6,2.7,'solid');
  const counter=objects.at(-1)!;top(counter,'furniture-kit/kitchenCoffeeMachine','Tea service',0,0,2);
  shelf(4,-6,'Tea library');chair(4,-4.2,Math.PI,'benchCushion','Reading bench');
  chair(-5,3.7,Math.PI,'benchCushion','Window seat');chair(5,3.7,Math.PI,'benchCushion','Window seat');
 }else if(venue.feature==='studio'){
  for(const t of pairedTables()){
   top(t,'furniture-kit/books','Workshop references',-.5,0,2);
   top(t,'furniture-kit/plantSmall1','Pottery display',.5,0,2.5);
  }
  for(const x of [-4,4]){shelf(x,-6,'Workshop supply shelves');chair(x,3.7,Math.PI,'bench','Workshop bench');}
  for(const [x,z] of [[-7,-2],[7,-2],[-7,-3]])add('furniture-kit/cardboardBoxOpen','Materials crate',x,z,3,'solid');
  const t=table(0,-6);top(t,'furniture-kit/books','Community pattern archive',0,0,3);
 }else if(venue.feature==='post'){
  for(const x of [-4,4]){
   rug(x,0);const t=add('furniture-kit/desk','Letter-writing desk',x,0,3,'solid');
   top(t,'furniture-kit/books','Neighborhood address book',-.45,0,2);
   top(t,'furniture-kit/lampRoundTable','Desk lamp',.5,0,1.5);
   chair(x,1.4,Math.PI);chair(x,3.7,Math.PI,'bench','Post office waiting bench');
   shelf(x,-6,'Parcel sorting shelves');
  }
  for(const [x,z] of [[-7,-3],[-6,-3],[6,-3],[7,-3]])add('furniture-kit/cardboardBoxClosed','Sorted parcel',x,z,3,'solid');
  const t=table(0,-6);top(t,'furniture-kit/books','Town correspondence archive',0,0,3);
 }else if(venue.feature==='boats'){
  for(const x of [-5,5]){
   add('nature-kit/canoe','Dry-docked canoe',x,-3.5,4,'solid');
   add('nature-kit/canoe_paddle','Stored paddle',x+(x<0?-1.4:1.4),-3.5,4);
   chair(x,1.5,Math.PI,'bench','Dock crew bench');chair(x,3.7,Math.PI,'benchCushion','Harbor lookout bench');
   for(const z of [-1,1])add('food-kit/barrel','Harbor supply barrel',x+(x<0?-2:2),z,1.3,'solid');
  }
  const t=table(0,-5.5);top(t,'furniture-kit/books','Harbor logbook',0,0,3);rug(0,-1);
  shelf(-1,-7,'Harbor supplies');shelf(2,-7,'Harbor supplies');
 }else if(venue.feature==='music'){
  for(const x of [-5,5]){
   rug(x,-.5);chair(x,-2,0,'loungeSofa','Listening sofa');
   const t=add('furniture-kit/tableCoffee','Listening table',x,0,3,'solid');top(t,'food-kit/cup-coffee','Listening-room cup',0,0,1);
   chair(x,2,Math.PI,'loungeChair','Listening chair');chair(x,3.8,Math.PI,'benchCushion','Dance-room bench');
   add('furniture-kit/speaker','Listening-room speaker',x,-6,3,'solid');
  }
  const t=add('furniture-kit/cabinetTelevision','Record cabinet',0,-6,3,'solid');top(t,'furniture-kit/radio','Radio display',0,0,3);
  top(t,'furniture-kit/books','Listening notes',.8,0,2);rug(0,0,true);
 }else if(venue.feature==='plants'){
  for(const t of pairedTables()){
   top(t,'furniture-kit/plantSmall1','Seedling pot',-.5,0,3);top(t,'furniture-kit/plantSmall3','Seedling pot',.5,0,3);
  }
  for(const x of [-4,4]){
   const t=shelf(x,-6,'Seed library');top(t,'furniture-kit/plantSmall2','Window seedlings',0,0,3);
   chair(x,3.7,Math.PI,'bench','Conservatory bench');
  }
  for(const x of [-7,7])for(const z of [-2,1])add('nature-kit/plant_bushDetailed','Conservatory planting',x,z,2);
  const t=table(0,-6);top(t,'furniture-kit/books','Planting journal',0,0,2);
 }
 return layoutSchema.parse(objects);
}
