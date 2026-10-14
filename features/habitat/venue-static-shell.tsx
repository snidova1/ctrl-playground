'use client';
import {TownAssetInstances} from './town-assets';
import type {venueStaticBatches} from './venue-static-batches';
export default function VenueStaticShell({batches}:{batches:ReturnType<typeof venueStaticBatches>}){
 return <>{[...batches.groups].map(([id,placements])=><TownAssetInstances key={id} id={id} placements={placements} castShadow={id.includes('wall')}/>)}</>;
}
