import type {GardenBed} from '@/domain/cozy-life';
import type {WorldObject} from '@/features/habitat/types';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {getHouseConfig, HOUSE_CELL_SIZE, HOUSE_ORIGIN, isHouseObject} from '@/features/habitat/modular-house';
import {getFurniturePlacementBounds} from '@/features/habitat/furniture-placement';

export type LifePoint = {x:number;z:number};
export type LifeCraftId = 'flower-pot'|'wooden-bench';
export type LifeDecoration = LifePoint & {id:string;itemId:LifeCraftId;rotation:number};
export interface LifeWorldView {beds:readonly GardenBed[];gardenAnchor?:LifePoint;decorations?:readonly LifeDecoration[]}
export type LifePlacementKind = 'garden'|LifeCraftId;
/** Existing CC0 assets, loaded only after a successful explicit placement. */
export const LIFE_CRAFT_MODELS = {
  'flower-pot': {assetId:'furniture-kit/plantSmall2',scale:4},
  'wooden-bench': {assetId:'haven-cozy/painted_wooden_bench',scale:1.35},
} as const;
export const LIFE_BED_OFFSETS = [{x:-1.05,z:-.85},{x:1.05,z:-.85},{x:-1.05,z:.85},{x:1.05,z:.85}] as const;
export const LIFE_GARDEN_SIZE = {width:3.8,depth:3.0} as const;
export const LIFE_INTERACTION_RANGE = 2.8;
type Footprint = LifePoint & {rx:number;rz:number};
export function lifeFootprint(point:LifePoint,kind:LifePlacementKind):Footprint {
  if(kind==='garden')return {...point,rx:LIFE_GARDEN_SIZE.width/2,rz:LIFE_GARDEN_SIZE.depth/2};
  const model=LIFE_CRAFT_MODELS[kind],asset=getBuildAsset(model.assetId)!;
  // Circumscribed circle remains safe for every persisted craft rotation.
  const radius=Math.hypot(asset.bounds[0],asset.bounds[2])*model.scale/2;
  return {...point,rx:radius,rz:radius};
}
const overlaps=(a:Footprint,b:Footprint,padding=.45)=>Math.abs(a.x-b.x)<a.rx+b.rx+padding&&Math.abs(a.z-b.z)<a.rz+b.rz+padding;
export function isLifePlacementFree(objects:readonly WorldObject[],kind:LifePlacementKind,point:LifePoint,existingDecorations:readonly LifeDecoration[]=[],gardenAnchor?:LifePoint):boolean {
  const a=lifeFootprint(point,kind);
  if(![point.x,point.z].every(Number.isFinite)||point.x < -13||point.x > 13||point.z < -7||point.z > 11||a.x-a.rx < -14||a.x+a.rx > 14||a.z-a.rz < -8||a.z+a.rz > 12)return false;
  // Reserve the whole home, not just wall segments (including legacy fallback home).
  if(getHouseConfig(objects).cells.some(cell=>overlaps(a,{x:HOUSE_ORIGIN.x+cell.x*HOUSE_CELL_SIZE,z:HOUSE_ORIGIN.z+cell.z*HOUSE_CELL_SIZE,rx:HOUSE_CELL_SIZE/2+.25,rz:HOUSE_CELL_SIZE/2+.25})))return false;
  // Keep the central approach walkable rather than putting crops across the front door.
  if(overlaps(a,{x:0,z:6,rx:.85,rz:6},.25))return false;
  if(objects.some(object=>{
    if(isHouseObject(object))return false;
    const [w,,d]=getFurniturePlacementBounds(object).map(n=>n*object.scale);
    const c=Math.abs(Math.cos(object.rotation)),s=Math.abs(Math.sin(object.rotation));
    return overlaps(a,{x:object.x,z:object.z,rx:(c*w+s*d)/2,rz:(s*w+c*d)/2});
  }))return false;
  if(gardenAnchor&&overlaps(a,lifeFootprint(gardenAnchor,'garden')))return false;
  return !existingDecorations.some(decor=>overlaps(a,lifeFootprint(decor,decor.itemId)));
}
/** Pure, deterministic, bounded search. Never clamps an occupied position into validity. */
export function findLifePlacement(objects:readonly WorldObject[],kind:LifePlacementKind,existingDecorations:readonly LifeDecoration[]=[],gardenAnchor?:LifePoint):LifePoint|null {
  const candidates:LifePoint[]=[];
  for(let z=-7;z<=11;z++)for(let x=-13;x<=13;x++)candidates.push({x,z});
  candidates.sort((a,b)=>(Math.abs(a.x)-6)**2+(a.z-4)**2-((Math.abs(b.x)-6)**2+(b.z-4)**2)||b.x-a.x||a.z-b.z);
  return candidates.find(point=>isLifePlacementFree(objects,kind,point,existingDecorations,gardenAnchor))??null;
}
export interface LifeInteractionTarget extends LifePoint {id:string;tab:'garden'|'craft';distance:number}
/** Parent can call this from its existing E handler; no global key listener is installed. */
export function nearestLifeInteraction(pose:LifePoint|undefined,view:LifeWorldView,range=LIFE_INTERACTION_RANGE):LifeInteractionTarget|null {
  if(!pose||![pose.x,pose.z,range].every(Number.isFinite)||range<0)return null;
  const targets:Array<Omit<LifeInteractionTarget,'distance'>>=[];
  if(view.gardenAnchor)for(const [index,offset] of LIFE_BED_OFFSETS.entries())targets.push({id:`garden-${index}`,tab:'garden',x:view.gardenAnchor.x+offset.x,z:view.gardenAnchor.z+offset.z});
  for(const decor of view.decorations??[])targets.push({...decor,tab:'craft'});
  let best:LifeInteractionTarget|null=null;
  for(const target of targets){const distance=Math.hypot(target.x-pose.x,target.z-pose.z);if(distance<=range&&(!best||distance<best.distance))best={...target,distance};}
  return best;
}
export const nearestLifeTarget = nearestLifeInteraction;
