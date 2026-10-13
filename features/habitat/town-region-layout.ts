import {TOWN_DISTRICTS,TOWN_DISTRICT_BUILDINGS,TOWN_ACTIVITIES,type TownDistrictKind} from './town-districts';
import {TOWN_GARDEN_BEDS} from '@/domain/town';
import {TOWN_PROJECTS} from '@/domain/town-projects';
export function regionPlanting(id:TownDistrictKind){
 const district=TOWN_DISTRICTS.find(d=>d.id===id)!;
 const trees:{x:number;z:number;size:number;yaw:number}[]=[];
 const shrubs:{x:number;z:number;size:number;yaw:number}[]=[];
 const flowers:{x:number;z:number;size:number;yaw:number}[]=[];
 const clear=(x:number,z:number)=>Math.abs(x-district.x)>4&&Math.abs(z-district.z)>4
  &&!TOWN_DISTRICT_BUILDINGS.some(h=>Math.abs(x-h.x)<h.width/2+2.2&&Math.abs(z-h.z)<h.depth/2+2.2)
  &&!TOWN_ACTIVITIES.some(a=>Math.hypot(x-a.x,z-a.z)<6)
  &&!TOWN_PROJECTS.some(a=>Math.hypot(x-a.x,z-a.z)<7)
  &&!TOWN_GARDEN_BEDS.some(a=>Math.hypot(x-a.x,z-a.z)<4.5)
  &&(id!=='harbor'||z<district.z+10);
 for(let row=0;row<7;row++)for(let col=0;col<9;col++){
  const x=district.x-35+col*8.5+Math.sin(row*3+col)*1.2,z=district.z-27+row*8.5;
  if(!clear(x,z))continue;
  trees.push({x,z,size:id==='orchard'?4.8:5.2+(col%3)*.45,yaw:col*.53});
  shrubs.push({x:x+1.4,z:z+.8,size:1.3,yaw:row});
  for(let i=0;i<4;i++)flowers.push({x:x-1.4+i*.6,z:z+1.7+Math.sin(i)*.5,size:.65,yaw:i});
 }
 for(const house of TOWN_DISTRICT_BUILDINGS.filter(h=>h.district===id))for(const side of [-1,1]){
  const x=house.x+side*2.1,z=house.z+house.depth/2+1.4;
  shrubs.push({x,z,size:1.15,yaw:side});
  for(let i=0;i<4;i++)flowers.push({x:x-.8+i*.5,z:z+.7,size:.55,yaw:i});
 }
 return {trees,shrubs,flowers};
}
export const REGION_TREE_OBSTACLES=TOWN_DISTRICTS.filter(d=>d.id!=='center').flatMap(d=>regionPlanting(d.id).trees.map(p=>({x:p.x,z:p.z,width:.4,depth:.4})));
