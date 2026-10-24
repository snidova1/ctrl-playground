import type {LifeWorldView} from '@/domain/cozy-life';
import {collideWorld,type WorldObject,type WorldState} from './types';
import {lifeFootprint} from '@/features/cozy-life/world-placement';
type Point={x:number;z:number};
export function collideHabitatLife(from:Point,to:Point,objects:WorldObject[],states:WorldState['states'],view?:LifeWorldView|null):Point{
 const props=[...(view?.gardenAnchor?[lifeFootprint(view.gardenAnchor,'garden')]:[]),...(view?.decorations??[]).map(d=>lifeFootprint(d,d.itemId))];
 if(!props.length)return collideWorld(from,to,objects,states);
 const blocked=(p:Point)=>props.some(o=>Math.abs(p.x-o.x)<o.rx+.28&&Math.abs(p.z-o.z)<o.rz+.28);
 const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.1));const dx=(to.x-from.x)/steps,dz=(to.z-from.z)/steps;let point={...from};
 for(let i=0;i<steps;i++){
  const x=collideWorld(point,{x:point.x+dx,z:point.z},objects,states);if(!blocked(x)||blocked(point))point=x;
  const z=collideWorld(point,{x:point.x,z:point.z+dz},objects,states);if(!blocked(z)||blocked(point))point=z;
 }
 return point;
}
