import {layoutSchema,type WorldObject} from './types';

export const PUBLIC_WORLD_ID='cf000000-0000-4000-8000-000000000001';
export const PUBLIC_WORLD_OWNER='ctrl-public-world';
export const COMMON_GROUND_ID='cf000000-0000-4000-8000-000000000002';
export type WorldDestination='common'|'habitat'|'public';
/** A bounded, shared town square, using only bundled CC0 models. */
export function createPublicWorld():WorldObject[]{
 const objects:WorldObject[]=[];
 const add=(assetId:string,name:string,x:number,z:number,scale=1,behavior:WorldObject['behavior']='decoration',y=0,rotation=0)=>objects.push({id:`cf100000-0000-4000-8000-${String(objects.length+1).padStart(12,'0')}`,assetId,name,x,y,z,rotation,scale,behavior,target:''});
 add('ctrl-block','Fountain base',0,-3,2.2,'solid');
 // A clear central promenade; buildings sit around its edges.
 for(const x of [-8,-6,-4,-2,0,2,4,6,8])for(const z of [2,4])add('building-kit/floor','Promenade',x,z);
 for(const z of [-6,-4,-2,0,6,8,10])add('building-kit/floor','Garden walk',0,z);
 for(const [x,z] of [[-11,-6],[11,-6],[-12,8],[12,8],[-4,-7],[4,-7]])add('nature-kit/tree_oak','Town oak',x,z,4);
 // Cafe shell with an open front and a shaded terrace.
 for(const x of [-10,-8,-6])add('building-kit/wall-window-square','Cafe windows',x,-5,1,'solid',0,Math.PI/2);
 for(const x of [-11,-5])add('building-kit/wall-window-square','Cafe side',x,-3,1,'solid');
 for(const x of [-10,-8,-6])for(const z of [-4,-2])add('building-kit/roof-flat-center','Cafe canopy',x,z,1,'decoration',2.7);
 for(const [x,z] of [[-8,0],[-5,0]]){
  add('furniture-kit/tableRound','Cafe table',x,z,1.8,'solid');
  add('furniture-kit/chair','Cafe seat',x-.9,z,2.6,'seat',0,Math.PI/2);
  add('furniture-kit/chair','Cafe seat',x+.9,z,2.6,'seat',0,-Math.PI/2);
  add('food-kit/cup-coffee','Fresh coffee',x,z,.8,'decoration',.67);
 }
 add('furniture-kit/table','Coffee counter',-8,-3,3,'solid');
 add('furniture-kit/kitchenCoffeeMachine','Coffee machine',-8,-3,2,'decoration',.99);
 for(const x of [6,9]){
  add('furniture-kit/tableCloth','Flower market',x,-2,2.5,'solid');
  add('building-kit/roof-flat-center','Market shade',x,-2,1.1,'decoration',2.5);
  for(const offset of [-.7,.7])add('furniture-kit/pottedPlant','Market plants',x+offset,-2,1.4,'decoration',.85);
  add('building-kit/column','Market column',x,-3,1,'solid');
 }
 for(const [x,z] of [[-3,-4],[3,-4],[-5,8],[5,8]])add('furniture-kit/bench','Garden bench',x,z,2.8,'seat');
 for(const x of [-12,-9,-6,6,9,12]){
  add('platformer-kit/hedge','Garden border',x,11,2.6);
  add('platformer-kit/flowers','Flower bed',x,9.5,2.2);
 }
 for(const [x,z] of [[-3,1],[3,1],[-10,6],[10,6]])add('furniture-kit/lampSquareFloor','Town lantern',x,z,2,'light');
 add('nature-kit/sign','Habitat directory',3,6,3);
 return layoutSchema.parse(objects);
}
