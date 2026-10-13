/**
 * Static geography for the shared Public World, separate from player-owned
 * Habitat layouts. The renderer and movement rules consume these same shapes.
 * All measurements are metres in the existing Three.js world coordinate frame.
 */
import {TOWN_PROP_OBSTACLES} from './town-prop-layout';
import {harborWaterBlocks} from './town-harbor-geography';
import {REGION_TREE_OBSTACLES} from './town-region-layout';
import {TOWN_DISTRICT_BUILDINGS} from './town-districts';
export const PUBLIC_WORLD_ID='cf000000-0000-4000-8000-000000000001';
export const PUBLIC_WORLD_BOUNDS={minX:-120,maxX:120,minZ:-110,maxZ:110} as const;
export const PUBLIC_WORLD_CANAL={north:-22,south:-17} as const;
export const PUBLIC_WORLD_BRIDGE={halfWidth:3.4,halfLength:3.4,railX:3.15,railHalfWidth:.08} as const;
export const PUBLIC_WORLD_PLAYER_RADIUS=.34;
export const PUBLIC_WORLD_BRIDGES=[
 {x:-1.5,halfWidth:PUBLIC_WORLD_BRIDGE.halfWidth},
 {x:20,halfWidth:PUBLIC_WORLD_BRIDGE.halfWidth},
] as const;
export const PUBLIC_WORLD_BUILDINGS=[
 {x:-23,z:2,width:7,depth:6,levels:2,color:'#e9c69e',roof:'#8d7c67',name:'WILLOW BAKERY'},
 {x:23,z:2,width:7,depth:6,levels:2,color:'#f2d8be',roof:'#7d9e8a',name:'MAKERS HOUSE'},
 {x:-22,z:20,width:8,depth:7,levels:2,color:'#dfbd9e',roof:'#799b79',name:'GARDEN HOUSE'},
 {x:22,z:21,width:8,depth:7,levels:2,color:'#e9e3cc',roof:'#bf866f',name:'ART STUDIO'},
 {x:-12,z:-27,width:7,depth:5,levels:2,color:'#f1d9b0',roof:'#718d82',name:'LAKE COTTAGE'},
 {x:12,z:-27,width:7,depth:5,levels:2,color:'#bcd2c2',roof:'#a17c68',name:'HILL COTTAGE'},
] as const;
export const PUBLIC_WORLD_SHOPS=[
 {x:-8,z:-9,width:9,depth:3.8},
 {x:8,z:-9,width:9,depth:3.8},
] as const;
const bridgeCenterZ=(PUBLIC_WORLD_CANAL.north+PUBLIC_WORLD_CANAL.south)/2;
const bridgeClearWidth=PUBLIC_WORLD_BRIDGE.railX-PUBLIC_WORLD_BRIDGE.railHalfWidth-PUBLIC_WORLD_PLAYER_RADIUS;
const walkableBridge=(x:number)=>PUBLIC_WORLD_BRIDGES.some(b=>Math.abs(x-b.x)<bridgeClearWidth);
/** Exterior structures have their own footprints, not just decorative meshes. */
export function isPublicWorldWalkable(x:number,z:number){
 if(harborWaterBlocks(x,z))return false;
 if(x<PUBLIC_WORLD_BOUNDS.minX||x>PUBLIC_WORLD_BOUNDS.maxX||z<PUBLIC_WORLD_BOUNDS.minZ||z>PUBLIC_WORLD_BOUNDS.maxZ)return false;
 // Stop the whole avatar before the bank, not just its origin. Rails continue
 // past the water, so stepping sideways off an approach is blocked too.
 if(Math.abs(x)<38&&z>PUBLIC_WORLD_CANAL.north-PUBLIC_WORLD_PLAYER_RADIUS&&z<PUBLIC_WORLD_CANAL.south+PUBLIC_WORLD_PLAYER_RADIUS&&!walkableBridge(x))return false;
 if(Math.abs(x)<38&&Math.abs(z-bridgeCenterZ)<PUBLIC_WORLD_BRIDGE.halfLength+PUBLIC_WORLD_PLAYER_RADIUS&&PUBLIC_WORLD_BRIDGES.some(b=>Math.abs(Math.abs(x-b.x)-PUBLIC_WORLD_BRIDGE.railX)<PUBLIC_WORLD_BRIDGE.railHalfWidth+PUBLIC_WORLD_PLAYER_RADIUS))return false;
 if(Math.hypot(x,z+3)<2.25+PUBLIC_WORLD_PLAYER_RADIUS)return false;
 return ![...PUBLIC_WORLD_BUILDINGS,...PUBLIC_WORLD_SHOPS,...TOWN_PROP_OBSTACLES,...TOWN_DISTRICT_BUILDINGS,...REGION_TREE_OBSTACLES].some(h=>Math.abs(x-h.x)<h.width/2+.34&&Math.abs(z-h.z)<h.depth/2+.34);
}
/** Small swept steps prevent running through the riverbanks or home walls. */
export function navigatePublicWorld(from:{x:number;z:number},to:{x:number;z:number}){
 const distance=Math.hypot(to.x-from.x,to.z-from.z);
 const steps=Math.max(1,Math.ceil(distance/.14));
 const dx=(to.x-from.x)/steps,dz=(to.z-from.z)/steps;
 let x=from.x,z=from.z;
 for(let i=0;i<steps;i++){
  if(isPublicWorldWalkable(x+dx,z))x+=dx;
  if(isPublicWorldWalkable(x,z+dz))z+=dz;
 }
 return {x,z};
}
