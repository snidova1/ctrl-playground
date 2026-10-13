'use client';
import {useMemo} from 'react';
import {TownAssetInstances} from './town-assets';
import {regionPlanting} from './town-region-layout';
import type {TownDistrictKind} from './town-districts';
/** Existing licensed CC0 geometry, instanced per material and culled with its region. */
export default function TownRegionDressing({district,quality}:{district:TownDistrictKind;quality:'low'|'high'}){
 const plants=useMemo(()=>regionPlanting(district),[district]);
 return <group>
  <TownAssetInstances id='nature-kit/tree_detailed' placements={plants.trees} castShadow={quality==='high'}/>
  <TownAssetInstances id='nature-kit/plant_bushDetailed' placements={plants.shrubs}/>
  <TownAssetInstances id={district==='orchard'?'nature-kit/flower_yellowB':district==='festival'?'nature-kit/flower_redA':'nature-kit/flower_purpleC'} placements={plants.flowers}/>
 </group>;
}
