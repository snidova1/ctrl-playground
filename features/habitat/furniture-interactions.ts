import {getBuildAsset} from '@/features/plaza/build-assets';
import type {WorldObject} from './types';
import type {Pose} from '@/features/plaza/types';

/** Affordances of shipped models, not fake actions on every prop. */
export function inferFurnitureBehavior(assetId:string):WorldObject['behavior']{
 const name=assetId.split('/').at(-1)??assetId;
 if(assetId.startsWith('haven-cozy/')){
  // Bistro/picnic assets are combined meshes: never attach an avatar at their table center.
  if(['sofa_03','sofa_02','mid_century_lounge_chair','modern_arm_chair_01','vintage_day_bed','Rockingchair_01','painted_wooden_bench'].includes(name))return 'seat';
  if(name==='vintage_oil_lamp')return 'light';
 }
 if(assetId.startsWith('furniture-kit/')){
  if(/^(?:chair|bench|sofa|couch|stool|lounge(?:Design)?(?:Chair|Sofa))/i.test(name))return 'seat';
  if(/^lamp/i.test(name))return 'light';
 }
 return 'decoration';
}
export type InteractionPosition={x:number;z:number;y?:number};
/** Distance to the normalized rendered bounds, not the GLB's authored origin.
 * Stage.Imported centers X/Z and grounds Y BEFORE ObjectView rotates/scales.
 * This is a bounds-based reach hint, not a triangle/occlusion test. Builtins and
 * structural doors keep their existing point targets rather than fake bounds. */
export function interactionDistanceTo(position:InteractionPosition,object:WorldObject):number{
 const asset=getBuildAsset(object.assetId),dx=position.x-object.x,dz=position.z-object.z;
 if(!asset)return Math.hypot(dx,dz,object.y-(position.y??0));
 const c=Math.cos(object.rotation),s=Math.sin(object.rotation),scale=object.scale;
 const localX=c*dx-s*dz,localZ=s*dx+c*dz;
 const outsideX=Math.max(0,Math.abs(localX)-asset.bounds[0]*scale/2);
 const outsideZ=Math.max(0,Math.abs(localZ)-asset.bounds[2]*scale/2);
 const y=position.y??0,outsideY=Math.max(object.y-y,0,y-(object.y+asset.bounds[1]*scale));
 return Math.hypot(outsideX,outsideY,outsideZ);
}
export function nearestUsableObject(position:InteractionPosition,objects:readonly WorldObject[],range=2.7):WorldObject|undefined{
 let nearest:WorldObject|undefined,distance=range;
 for(const object of objects){
  if(['solid','decoration'].includes(object.behavior))continue;
  const candidate=interactionDistanceTo(position,object);
  if(candidate<=range&&(!nearest||candidate<distance)){nearest=object;distance=candidate;}
 }
 return nearest;
}
/** A seated avatar stays attached by ID even when that seat is relocated.
 * Missing/deleted/repurposed seats must not pin the action to an unrelated prop. */
export function interactionObjectFor(position:InteractionPosition,objects:readonly WorldObject[],sittingOn:string|null=null,range=2.7):WorldObject|undefined{
 return (sittingOn?objects.find(o=>o.id===sittingOn&&o.behavior==='seat'):undefined)??nearestUsableObject(position,objects,range);
}
/** Verified from the largest upward-facing horizontal triangles in the shipped
 * chair/bench GLBs: seat top .24, backrest top .47. Heights are above the model's
 * normalized base (the same grounding performed by Stage.Imported). */
const SEAT_SURFACE_HEIGHTS:Readonly<Record<string,number>>={
 'furniture-kit/chair':.24,
 'furniture-kit/bench':.24,
};
export function seatSurfaceYFor(seat:WorldObject):number{
 const asset=getBuildAsset(seat.assetId);
 // Backless seats use their top; other imported seats conservatively use half
 // their bounds, not the top of the backrest. Builtin ObjectView's box top is .575.
 const height=SEAT_SURFACE_HEIGHTS[seat.assetId]??(asset?asset.bounds[1]*(/stool|ottoman|cushionLow/i.test(seat.assetId)?1:.5):.575);
 return seat.y+height*seat.scale;
}
export function seatPoseFor(seat:WorldObject):Pose&{y:number}{
 // Preserve the existing +Z seat anchor, but transform it in object-local units.
 // y remains the base elevation; seatSurfaceYFor supplies the sitting surface.
 const offset=.12*seat.scale;
 return {x:seat.x+Math.sin(seat.rotation)*offset,y:seat.y,z:seat.z+Math.cos(seat.rotation)*offset,angle:seat.rotation,moving:false};
}
export function interactionLabel(object:WorldObject,active:boolean,sitting:boolean):string{
 if(object.behavior==='seat')return sitting?'Stand up':'Sit down';
 if(object.behavior==='light')return active?'Turn off light':'Turn on light';
 if(object.behavior==='door')return `${active?'Close':'Open'} ${object.assetId==='habitat-house-window'?'window':'door'}`;
 if(object.behavior==='switch')return 'Use switch';
 if(object.behavior==='portal')return 'Travel';
 if(object.behavior==='checkpoint')return 'Start course';
 if(object.behavior==='finish')return 'Finish course';
 return 'Interact';
}
