import {groundAt,type WorldNavigation} from './navigation';
export const PUBLIC_DISTRICTS=[
 {id:'willow-common',name:'Willow Common',description:'Café, fountain, cottages and your neighbors.',x:0,z:16},
 {id:'spring-garden',name:'Spring Garden',description:'Flower beds, garden arches and a quiet walking court.',x:-39,z:0},
 {id:'lantern-market',name:'Lantern Market',description:'Open-air stalls, warm lanterns and a market square.',x:39,z:0},
] as const;
export const GARDEN_BEDS=[[-35,-6],[-43,-6],[-35,6],[-43,6]] as const;
export const MARKET_STALLS=[[35,-8],[43,-8],[35,8],[43,8]] as const;
export function districtAt(x:number){return PUBLIC_DISTRICTS[x< -27?1:x>27?2:0];}
export function districtObstacle(x:number,z:number){
 return [30,34,38,42,46].some(bx=>Math.abs(x-bx)<.5&&Math.abs(Math.abs(z)-3)<.5)||GARDEN_BEDS.some(([bx,bz])=>Math.abs(x-bx)<2.9&&Math.abs(z-bz)<2.4)
  ||MARKET_STALLS.some(([bx,bz])=>Math.abs(x-bx)<2.25&&Math.abs(z-bz)<1.9)
  ||[-28,-47].some(bx=>Math.abs(x-bx)<.6&&Math.abs(Math.abs(z)-2.7)<.6);
}
/** Keep every original Recast cell; extend only the visibly flat outer districts.
 * This is an authored collision grid extension, not a claimed Recast rebake. */
export function withPublicDistricts(base:WorldNavigation):WorldNavigation{
 const minX=-48,maxX=48,minZ=Math.min(base.minZ,-13),maxZ=Math.max(base.minZ+(base.depth-1)*base.step,13),width=Math.round((maxX-minX)/base.step)+1,depth=Math.round((maxZ-minZ)/base.step)+1;
 const coreMaxX=base.minX+(base.width-1)*base.step,coreMaxZ=base.minZ+(base.depth-1)*base.step;
 const heights:Array<number|null>=Array.from({length:width*depth},(_,i)=>{
  const x=minX+i%width*base.step,z=minZ+Math.floor(i/width)*base.step;
  if(x>=base.minX&&x<=coreMaxX&&z>=base.minZ&&z<=coreMaxZ)return groundAt(base,x,z);
  return Math.abs(z)<=13&&!districtObstacle(x,z)?0:null;
 });
 return {...base,generator:base.generator+' + authored flat public districts',minX,minZ,width,depth,heights,walkableCells:heights.filter(h=>h!==null).length};
}
