'use client';
import {useMemo} from 'react';
import {TownAssetInstances,type AssetPlacement} from './town-assets';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_SHOPS} from './public-world-geography';

/**
 * PR32 Storybook Garden.
 *
 * This is not tiny disconnected procedural primitives pretending to be
 * flowers. Every plant is a real bundled CC0 Kenney Nature Kit 3D mesh, and
 * instances share their GPU geometry/material. The curated garden islands
 * are composed for the real third-person camera: warm foreground bouquets,
 * midground flower borders, and mixed foliage around buildings.
 *
 * Artistic planting is non-collidable. The server-authoritative paths, job
 * hotspots and house footprints are completely unchanged.
 */
type Island=readonly [number,number,number,number,number];
const ISLANDS:readonly Island[]=[
 // Planted shoulders of the narrow path in the default player-facing camera.
 // Distinct smaller near-field islands break up the former empty tan cross.
 [-7.4,2.0,2.7,3.1,56],[7.4,2.0,2.7,3.1,56],
 [-7.9,-4.2,2.2,2.7,45],[7.9,-4.2,2.2,2.7,45],
 [-7.9,12.7,2.9,1.8,43],[7.9,12.7,2.9,1.8,43],
 // Coffee shop and flower market flanking the fountain.
 [-12,0,3.4,5.3,45],[12,0,3.4,5.3,45],
 [-13,-6,3.6,3.2,38],[13,-6,3.6,3.2,38],
 // Foreground: large planted masses along the player's approach, not on path.
 [-11,18,4.2,4.6,65],[11,18,4.2,4.6,65],
 [-11,29,3.9,4.6,52],[11,29,3.9,4.6,52],
 // The two cottage gardens.
 [-28,11,4.5,3.8,50],[29,11,4.5,3.8,50],
 [-28,26,4.8,3.4,45],[28,27,4.8,3.4,45],
 // Water's edge beyond the shops.
 [-12,-15,3.0,2.6,30],[12,-15,3.0,2.6,30],
];

function hash(seed:number){
 const n=Math.sin(seed*128.17+4.829)*43758.5453;
 return n-Math.floor(n);
}
function safeToPlant(x:number,z:number){
 // Keep roads visible, flowerheads out of the fountain, and footpaths clear.
 if(Math.abs(x)<3.7&&z>-17&&z<38)return false;
 if(z>6.45&&z<11.1)return false; // crosswalk
 if(Math.hypot(x,z+3)<5.8)return false;
 return ![...PUBLIC_WORLD_BUILDINGS,...PUBLIC_WORLD_SHOPS].some(h=>
  Math.abs(x-h.x)<h.width/2+1.8&&Math.abs(z-h.z)<h.depth/2+1.8);
}
export type StorybookPlantKind='red'|'yellow'|'purple'|'grass';
export function storybookPlantings(quality:'low'|'high'){
 const sets:Record<StorybookPlantKind,AssetPlacement[]>={
  red:[],yellow:[],purple:[],grass:[],
 };
 ISLANDS.forEach(([cx,cz,rx,rz,count],island)=>{
  for(let i=0;i<count;i++){
   if(quality==='low'&&i%2!==0)continue;
   const seed=island*800+i*4.367;
   const a=hash(seed+1)*Math.PI*2,r=Math.sqrt(hash(seed+2));
   const x=cx+Math.cos(a)*rx*r,z=cz+Math.sin(a)*rz*r;
   if(!safeToPlant(x,z))continue;
   const which=(i*7+island*3)%10;
   const kind:StorybookPlantKind=which<3?'red':which<6?'yellow':which<8?'purple':'grass';
   sets[kind].push({
    x,z,y:.04,
    size:(kind==='grass'?.72:.31)+hash(seed+3)*(kind==='grass'?.27:.19),
    yaw:hash(seed+4)*Math.PI*2
   });
  }
 });
 return sets;
}
export default function TownAnimeGarden({quality}:{quality:'low'|'high'}){
 const plants=useMemo(()=>storybookPlantings(quality),[quality]);
 return <group name="PR32-CC0-Storybook-Garden">
  <TownAssetInstances id="nature-kit/flower_redA" placements={plants.red}/>
  <TownAssetInstances id="nature-kit/flower_yellowB" placements={plants.yellow}/>
  <TownAssetInstances id="nature-kit/flower_purpleC" placements={plants.purple}/>
  <TownAssetInstances id="nature-kit/grass_leafsLarge" placements={plants.grass}/>
 </group>;
}
