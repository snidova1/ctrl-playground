import {TOWN_ACTIVITIES,TOWN_DISTRICTS,TOWN_DISTRICT_BUILDINGS} from '@/features/habitat/town-districts';
import {TOWN_GARDEN_BEDS} from './town';
import {TOWN_PROJECTS} from './town-projects';
import {TOWN_WORK_SITES} from './town-routes';

/** Original, deterministic walkable landscape. The mesh, camera, feet and
 * dressing all sample this SAME triangulated surface, not an approximate sine
 * height or ray against decorative background hills. No client-controlled Y. */
export const TOWN_TERRAIN={width:248,depth:228,step:2,columns:124,rows:114} as const;
export const TOWN_ROAD_CONNECTIONS=[
 [0,9,78,9],[78,9,78,27],[0,22,-75,22],[-75,22,-75,46],
 [-1.5,-29,-1.5,-76],[-32,-12,-75,-12],[-75,-12,-75,-52],
 [78,27,76,80],[78,27,78,-73],[0,-76,78,-76],[0,34,0,98],
] as const;
const hills=[
 [-99,77,3.1,34,25],[-105,12,1.9,25,30],[-103,-80,2.6,30,24],
 [104,101,3.3,30,23],[111,45,2.3,23,27],[105,-99,2.9,27,20],
 [28,101,2.0,30,24],[-50,96,1.8,26,20],
] as const;
const anchors=[...TOWN_ACTIVITIES,...TOWN_WORK_SITES,...TOWN_GARDEN_BEDS,...TOWN_PROJECTS];
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
function lineDistance(x:number,z:number,ax:number,az:number,bx:number,bz:number){
 const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
 return Math.hypot(x-ax-dx*t,z-az-dz*t);
}
function authoredHeight(x:number,z:number){
 // Willow's historic paving and the connected waterfront stay at the original
 // elevation. Wide feathered foundations prevent displaced doors/props.
 let clearance=Math.hypot(x,z)-40;
 if(Math.abs(x)<60&&z< -43)return 0;
 for(const [ax,az,bx,bz] of TOWN_ROAD_CONNECTIONS)clearance=Math.min(clearance,lineDistance(x,z,ax,az,bx,bz)-4);
 for(const d of TOWN_DISTRICTS){
  if(d.id==='center')continue;
  clearance=Math.min(clearance,lineDistance(x,z,d.x-48,d.z,d.x+48,d.z)-4.6,lineDistance(x,z,d.x,d.z-44,d.x,d.z+44)-4.2);
 }
 for(const b of TOWN_DISTRICT_BUILDINGS)clearance=Math.min(clearance,Math.hypot(Math.max(0,Math.abs(x-b.x)-b.width/2-5),Math.max(0,Math.abs(z-b.z)-b.depth/2-5)));
 for(const a of anchors)clearance=Math.min(clearance,Math.hypot(x-a.x,z-a.z)-6);
 // Festival's deck and Fernwood's permanent raised beds have level foundations.
 for(const [cx,cz,r] of [[77,-98,12],[-91,66,8],[-59,66,8]])clearance=Math.min(clearance,Math.hypot(x-cx,z-cz)-r);
 if(clearance<=0)return 0;
 let height=0;
 for(const [cx,cz,h,rx,rz] of hills){const distance=((x-cx)/rx)**2+((z-cz)/rz)**2;height+=h*Math.exp(-distance*1.7);}
 return height*smooth(clearance/10);
}
// Float32 exactly matches WebGL's vertex buffer. Lazy once-per-runtime build.
let heights:Float32Array|undefined;
export function townTerrainHeights(){
 if(!heights){heights=new Float32Array((TOWN_TERRAIN.columns+1)*(TOWN_TERRAIN.rows+1));
  for(let row=0;row<=TOWN_TERRAIN.rows;row++)for(let col=0;col<=TOWN_TERRAIN.columns;col++)heights[row*(TOWN_TERRAIN.columns+1)+col]=authoredHeight(-TOWN_TERRAIN.width/2+col*TOWN_TERRAIN.step,-TOWN_TERRAIN.depth/2+row*TOWN_TERRAIN.step);
 }
 return heights;
}
export function townGroundHeight(x:number,z:number){
 if(!Number.isFinite(x)||!Number.isFinite(z))return 0;
 const gx=Math.max(0,Math.min(TOWN_TERRAIN.columns-1e-7,(x+TOWN_TERRAIN.width/2)/TOWN_TERRAIN.step));
 const gz=Math.max(0,Math.min(TOWN_TERRAIN.rows-1e-7,(z+TOWN_TERRAIN.depth/2)/TOWN_TERRAIN.step));
 const col=Math.floor(gx),row=Math.floor(gz),tx=gx-col,tz=gz-row,data=townTerrainHeights(),i=row*(TOWN_TERRAIN.columns+1)+col;
 const a=data[i],b=data[i+1],c=data[i+TOWN_TERRAIN.columns+1],d=data[i+TOWN_TERRAIN.columns+2];
 // PlaneGeometry's actual diagonal is b--c, not bilinear interpolation.
 return tx+tz<=1?a+tx*(b-a)+tz*(c-a):d+(1-tx)*(c-d)+(1-tz)*(b-d);
}
export function townGroundNormal(x:number,z:number){
 const e=.05,dx=(townGroundHeight(x-e,z)-townGroundHeight(x+e,z))/(e*2),dz=(townGroundHeight(x,z-e)-townGroundHeight(x,z+e))/(e*2),length=Math.hypot(dx,1,dz);
 return {x:dx/length,y:1/length,z:dz/length};
}
