'use client';
import {useMemo} from 'react';
import {TownAssetInstances} from './town-assets';
import {TOWN_PLANTING_MODELS} from './town-planting-models';
import {regionPlanting} from './town-region-layout';
import type {TownDistrictKind} from './town-districts';
import {townGroundHeight} from '@/domain/town-terrain';
/** Existing licensed CC0 geometry, instanced per material and culled with its region. */
export default function TownRegionDressing({district,quality}:{district:TownDistrictKind;quality:'low'|'high'}){
 const plants=useMemo(()=>{
  const p=regionPlanting(district);
  const ground=(items:typeof p.trees)=>items.map(v=>({...v,y:townGroundHeight(v.x,v.z)}));
  return {trees:ground(p.trees),shrubs:ground(p.shrubs),flowers:ground(p.flowers)};
 },[district]);
 return <group>
  {TOWN_PLANTING_MODELS[district].map((id,index,models)=><TownAssetInstances key={id} id={id} placements={plants.trees.filter((_,i)=>i%models.length===index)} castShadow={quality==='high'}/>)}
  <TownAssetInstances id='nature-kit/plant_bushDetailed' placements={plants.shrubs}/>
  <TownAssetInstances id={district==='orchard'?'nature-kit/flower_yellowB':district==='festival'?'nature-kit/flower_redA':'nature-kit/flower_purpleC'} placements={plants.flowers}/>
 </group>;
}
