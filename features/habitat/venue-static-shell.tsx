'use client';
import {TownAssetInstances} from './town-assets';
import type {venueStaticBatches} from './venue-static-batches';
import VenueWallTrim from './venue-wall-trim';
export default function VenueStaticShell({batches}:{batches:ReturnType<typeof venueStaticBatches>}){
 const walls=batches.groups.get('building-kit/wall-window-square')??[];
 return <><VenueWallTrim walls={walls}/>{[...batches.groups].map(([id,placements])=><TownAssetInstances key={id} id={id} placements={placements} tone={id==='building-kit/floor'?'room-floor':id==='building-kit/wall-window-square'?'room-wall':'room'} castShadow={id!=='building-kit/floor'&&!id.includes('rug')}/>)}</>;
}
