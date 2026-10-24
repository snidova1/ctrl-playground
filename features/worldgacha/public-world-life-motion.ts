import {GARDEN_BEDS,MARKET_STALLS} from './public-districts';

export type LifePoint={x:number;z:number};
export type LifePatch={
 id:'willow-coffee'|'garden-petals'|'market-tea';
 kind:'steam'|'petal';
 sources:readonly (readonly [number,number,number])[];
 count:number;
};
/** Sources are existing tables/beds/counters, not a world-wide particle field. */
export const PUBLIC_LIFE_PATCHES:readonly LifePatch[]=[
 {id:'willow-coffee',kind:'steam',sources:[[-6,1.08,-8],[-9,1.08,-8]],count:8},
 {id:'garden-petals',kind:'petal',sources:GARDEN_BEDS.map(([x,z])=>[x,.72,z] as const),count:16},
 {id:'market-tea',kind:'steam',sources:[[MARKET_STALLS[2][0]-1.3,1.44,MARKET_STALLS[2][1]-.9]],count:6},
];
export const LIFE_DETAIL_DISTANCE=24;
export function lifeDetailVisible(player:LifePoint,x:number,z:number){return (player.x-x)**2+(player.z-z)**2<LIFE_DETAIL_DISTANCE**2;}
export function lifePatchVisible(patch:LifePatch,player:LifePoint,still=false){
 return !still&&patch.sources.some(([x,,z])=>lifeDetailVisible(player,x,z));
}
export function lifeCount(patch:LifePatch,night:boolean){return patch.kind==='petal'&&night?patch.count/2:patch.count;}
export function lifeStep(dt:number,still=false){return still||!Number.isFinite(dt)?0:Math.min(Math.max(dt,0),.05);}
/** Shared slow gust envelope keeps flowers, hanging signs and cloth in one breeze. */
export function districtBreeze(time:number,phase=0,night=false){
 return (Math.sin(time*.72+phase)*.72+Math.sin(time*1.17+phase*.6)*.28)*(night?.55:1);
}
export type BreezeKind='sign'|'cloth'|'lantern';
type BreezeTarget={group:{rotation:{x:number;z:number}};x:number;z:number;phase:number;kind:BreezeKind};
/** Structural target also allows headless tests to exercise real Three groups. */
export function updateBreezeAnchors(anchors:Iterable<BreezeTarget>,player:LifePoint,time:number,night:boolean,still=false){
 if(still)return;
 for(const anchor of anchors){
  if(!lifeDetailVisible(player,anchor.x,anchor.z))continue;
  const gust=districtBreeze(time,anchor.phase,night);
  anchor.group.rotation.x=gust*(anchor.kind==='cloth'?.09:anchor.kind==='sign'?.025:.035);
  anchor.group.rotation.z=gust*(anchor.kind==='lantern'?.045:.012);
 }
}
export type MotePose={x:number;y:number;z:number;sx:number;sy:number;sz:number;rx:number;ry:number;rz:number};
/** Writes into a reusable target: no frame-time vectors, arrays, or random seeds. */
export function sampleLifeMote(patch:LifePatch,index:number,time:number,night:boolean,out:MotePose){
 const source=patch.sources[index%patch.sources.length],seed=index*2.39996323;
 const u=(time*(patch.kind==='steam'?.22:.085)+index/patch.count)%1;
 const envelope=Math.sin(Math.PI*u),wind=districtBreeze(time,index%patch.sources.length,night);
 if(patch.kind==='steam'){
  out.x=source[0]+u*.21+Math.sin(time*.55+seed)*u*.055;
  out.y=source[1]+u*.8;out.z=source[2]+Math.cos(seed)*u*.09;
  const size=envelope*(.035+u*.115);
  out.sx=size;out.sy=size*1.35;out.sz=size;
  out.rx=0;out.ry=seed;out.rz=0;
 }else{
  // Remain over the flower beds; scale-in/out hides the local loop reset.
  out.x=source[0]+Math.sin(seed)*1.65+u*.4+wind*.12;
  out.y=source[1]+(1-u)*.85;
  out.z=source[2]+Math.cos(seed)*1.25+Math.sin(time*.3+seed)*.15;
  out.sx=.058*envelope;out.sy=.09*envelope;out.sz=.058*envelope;
  out.rx=1.05+Math.sin(time*.7+seed)*.5;out.ry=seed+time*.18;out.rz=wind*.6;
 }
 return out;
}
export function flowerLean(time:number,index:number,night=false){return districtBreeze(time,index*.13,night)*.065;}
