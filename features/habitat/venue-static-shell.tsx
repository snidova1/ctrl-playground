'use client';
import {TownAssetInstances} from './town-assets';
import type {venueStaticBatches} from './venue-static-batches';
import VenueWallTrim from './venue-wall-trim';
const WALL_COLORS:Readonly<Record<string,string>>={tea:'#e5d7be',studio:'#d7dfd5',post:'#ddd0c5',boats:'#cbdadd',music:'#dcd0b7',plants:'#d8dfc5'};
export default function VenueStaticShell({batches,feature}:{batches:ReturnType<typeof venueStaticBatches>;feature?:string}){
 const walls=batches.groups.get('building-kit/wall-window-square')??[];
 return <><VenueWallTrim walls={walls}/>{[...batches.groups].map(([id,placements])=><TownAssetInstances key={id} id={id} placements={placements} tint={id==='building-kit/wall-window-square'?WALL_COLORS[feature??'']:undefined} tone={id==='building-kit/floor'?'room-floor':id==='building-kit/wall-window-square'?'room-wall':'room'} castShadow={id!=='building-kit/floor'&&!id.includes('rug')}/>)}</>;
}
