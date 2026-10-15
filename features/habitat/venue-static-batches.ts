import {getBuildAsset} from '@/features/plaza/build-assets';
import type {WorldObject} from './types';
import type {AssetPlacement} from './town-assets';

/** Read-only public-room shells only. Seats, lights, doors and authored home
 * objects retain their existing interactive ObjectView and saved identity. */
export function venueStaticBatches(objects:readonly WorldObject[]){
 const groups=new Map<string,AssetPlacement[]>(),ids=new Set<string>();
 for(const o of objects){
  if(o.behavior!=='decoration'&&o.behavior!=='solid')continue;
  const asset=getBuildAsset(o.assetId);if(!asset)continue;
  const placements=groups.get(o.assetId)??[];
  placements.push({x:o.x,y:o.y,z:o.z,size:o.scale*Math.max(...asset.bounds),yaw:o.rotation});
  groups.set(o.assetId,placements);ids.add(o.id);
 }
 return {groups,ids};
}
