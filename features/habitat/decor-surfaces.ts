import {Ray,Vector3} from 'three';
import {getBuildAsset} from '@/features/plaza/build-assets';
import type {WorldObject} from './types';
// Only authored, flat rectangular tabletops. Corner/round desks need actual surface meshes.
const TABLETOPS=new Set([...['desk','table','tableCloth','tableCoffee','tableCoffeeGlass','tableCoffeeGlassSquare','tableCoffeeSquare','tableCross','tableCrossCloth','tableGlass'].map(id=>`furniture-kit/${id}`),'haven-cozy/modern_coffee_table_01','haven-cozy/chinese_tea_table']);
export function isTabletopDecoration(object:WorldObject){
 const asset=getBuildAsset(object.assetId);
 return !!asset&&!['seat','door','portal','checkpoint','finish'].includes(object.behavior)
  &&(asset.category==='food'||/^furniture-kit\/(books|plantSmall[123]|lampRoundTable|lampSquareTable|radio|laptop|television|speaker|bear)$/.test(object.assetId)||/^haven-cozy\/(potted_plant_04|vintage_oil_lamp)$/.test(object.assetId));
}
/** Flat authored table surfaces only; every footprint corner must fit, including rotations. */
export function findDecorSurface(ray:Ray,object:WorldObject,objects:readonly WorldObject[]){
 if(!isTabletopDecoration(object)||ray.direction.y>=-1e-8)return null;
 const own=getBuildAsset(object.assetId)!;
 const halfW=own.bounds[0]*object.scale/2,halfD=own.bounds[2]*object.scale/2;
 let nearest:{x:number;y:number;z:number;distance:number;supportId:string}|null=null;
 for(const support of objects){
  if(support.id===object.id||!TABLETOPS.has(support.assetId))continue;
  const asset=getBuildAsset(support.assetId)!;
  const y=support.y+asset.bounds[1]*support.scale;
  const distance=(y-ray.origin.y)/ray.direction.y;
  if(distance<=0||distance>25||(nearest&&distance>=nearest.distance))continue;
  const hit=ray.at(distance,new Vector3());
  // Fine snap is deliberate for tiny desk ornaments, rather than the floor's 25cm grid.
  const x=Math.round(hit.x*20)/20,z=Math.round(hit.z*20)/20;
  const c=Math.cos(support.rotation),s=Math.sin(support.rotation);
  const oc=Math.cos(object.rotation),os=Math.sin(object.rotation);
  const fits=[-1,1].every(a=>[-1,1].every(b=>{
   const wx=x+a*halfW*oc+b*halfD*os-support.x;
   const wz=z-a*halfW*os+b*halfD*oc-support.z;
   return Math.abs(wx*c-wz*s)<=asset.bounds[0]*support.scale/2-.005
    &&Math.abs(wx*s+wz*c)<=asset.bounds[2]*support.scale/2-.005;
  }));
  if(fits)nearest={x,y,z,distance,supportId:support.id};
 }
 return nearest;
}
