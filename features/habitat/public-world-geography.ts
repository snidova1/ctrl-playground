/**
 * Static geography for the shared Public World, separate from player-owned
 * Habitat layouts. The renderer and movement rules consume these same shapes.
 * All measurements are metres in the existing Three.js world coordinate frame.
 */
export const PUBLIC_WORLD_ID='cf000000-0000-4000-8000-000000000001';
export const PUBLIC_WORLD_BOUNDS={minX:-32,maxX:32,minZ:-30,maxZ:31} as const;
export const PUBLIC_WORLD_CANAL={north:-22,south:-17} as const;
export const PUBLIC_WORLD_BRIDGES=[
 {x:-1.5,halfWidth:3.6},
 {x:20,halfWidth:3.5},
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
const walkableBridge=(x:number)=>PUBLIC_WORLD_BRIDGES.some(b=>Math.abs(x-b.x)<b.halfWidth);
/** Exterior structures have their own footprints, not just decorative meshes. */
export function isPublicWorldWalkable(x:number,z:number){
 if(x<PUBLIC_WORLD_BOUNDS.minX||x>PUBLIC_WORLD_BOUNDS.maxX||z<PUBLIC_WORLD_BOUNDS.minZ||z>PUBLIC_WORLD_BOUNDS.maxZ)return false;
 if(z>PUBLIC_WORLD_CANAL.north&&z<PUBLIC_WORLD_CANAL.south&&!walkableBridge(x))return false;
 return ![...PUBLIC_WORLD_BUILDINGS,...PUBLIC_WORLD_SHOPS].some(h=>Math.abs(x-h.x)<h.width/2+.34&&Math.abs(z-h.z)<h.depth/2+.34);
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
