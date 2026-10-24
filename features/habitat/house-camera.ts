import type {WorldObject,WorldState} from './types';
import {getHouseConfig,getHouseEdges,getHouseOpenings,getHouseWallSegments,getHouseDoorLeaf,HOUSE_ORIGIN,HOUSE_CELL_SIZE,HOUSE_WALL_HEIGHT,type HouseBox} from './modular-house';
export interface HouseCameraPoint{x:number;y:number;z:number}
export const HOUSE_CEILING_Y=HOUSE_WALL_HEIGHT-.04;
export const HOUSE_CEILING_THICKNESS=.06;
const CAMERA_RADIUS=.14,INDOOR_BOOM=3.2;
/** Cutaway is an explicit construction tool, never a consequence of entering a room. */
export function houseCutawayEnabled(editing:boolean,previewRoof=false){return editing&&!previewRoof;}
/** Swept camera sphere against an oriented structural box; fraction along sightline. */
function hitFraction(from:HouseCameraPoint,to:HouseCameraPoint,box:HouseBox){
 const c=Math.cos(box.rotation),s=Math.sin(box.rotation),fx=from.x-box.x,fz=from.z-box.z,tx=to.x-box.x,tz=to.z-box.z;
 const a=[fx*c-fz*s,from.y-box.y,fx*s+fz*c],b=[tx*c-tz*s,to.y-box.y,tx*s+tz*c];
 const half=[box.width/2+CAMERA_RADIUS,box.height/2+CAMERA_RADIUS,box.depth/2+CAMERA_RADIUS];let near=0,far=1;
 for(let i=0;i<3;i++){
  const delta=b[i]-a[i];if(Math.abs(delta)<1e-9){if(Math.abs(a[i])>half[i])return 1;continue;}
  const first=(-half[i]-a[i])/delta,last=(half[i]-a[i])/delta;
  near=Math.max(near,Math.min(first,last));far=Math.min(far,Math.max(first,last));if(near>far)return 1;
 }
 return near;
}
/** Cached per layout/door state. No raycasting against avatars or mutations of mesh visibility. */
export function createHouseCameraResolver(objects:readonly WorldObject[],states:WorldState['states']){
 const config=getHouseConfig(objects),openings=new Map(getHouseOpenings(objects).map(o=>[o.edgeId,o]));
 const boxes:HouseBox[]=getHouseEdges(config).flatMap(edge=>{
  const opening=openings.get(edge.id);
  // Glass/frames are camera boundaries, even though the opening admits daylight.
  const walls=getHouseWallSegments(edge,opening?.kind==='window'?'wall':opening?.kind);
  if(opening?.kind==='door'&&opening.object)walls.push(getHouseDoorLeaf(edge,!!states[opening.object.id]?.active));
  return walls;
 });
 for(const cell of config.cells)boxes.push({x:HOUSE_ORIGIN.x+cell.x*HOUSE_CELL_SIZE,z:HOUSE_ORIGIN.z+cell.z*HOUSE_CELL_SIZE,y:HOUSE_CEILING_Y,width:HOUSE_CELL_SIZE,height:HOUSE_CEILING_THICKNESS,depth:HOUSE_CELL_SIZE,rotation:0});
 return (target:HouseCameraPoint,desired:HouseCameraPoint):HouseCameraPoint=>{
  const edgeDistance=Math.min(...config.cells.map(cell=>Math.hypot(Math.max(0,Math.abs(target.x-HOUSE_ORIGIN.x-cell.x*HOUSE_CELL_SIZE)-HOUSE_CELL_SIZE/2),Math.max(0,Math.abs(target.z-HOUSE_ORIGIN.z-cell.z*HOUSE_CELL_SIZE)-HOUSE_CELL_SIZE/2))));
  const u=Math.max(0,1-edgeDistance),influence=u*u*(3-2*u);
  const dx=desired.x-target.x,dy=desired.y-target.y,dz=desired.z-target.z,length=Math.hypot(dx,dy,dz);
  // Begin approaching before crossing the threshold; no abrupt indoor/outdoor switch.
  const scale=length>0?Math.min(1,(INDOOR_BOOM+12*(1-influence))/length):1;
  const goal={x:target.x+dx*scale,y:Math.min(target.y+dy*scale,2.35+6*(1-influence)),z:target.z+dz*scale};
  let fraction=1;for(const box of boxes)fraction=Math.min(fraction,hitFraction(target,goal,box));
  if(fraction===1)return goal;
  fraction=Math.max(0,fraction-.002);
  return {x:target.x+(goal.x-target.x)*fraction,y:target.y+(goal.y-target.y)*fraction,z:target.z+(goal.z-target.z)*fraction};
 };
}
