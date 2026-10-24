import {describe,expect,it} from 'vitest';
import {Group,Object3D,Vector3} from 'three';
import {PUBLIC_LIFE_PATCHES,LIFE_DETAIL_DISTANCE,districtBreeze,flowerLean,lifeCount,lifeDetailVisible,lifePatchVisible,lifeStep,sampleLifeMote,updateBreezeAnchors,type BreezeKind,type MotePose} from '../../features/worldgacha/public-world-life-motion';
import {GARDEN_BEDS,MARKET_STALLS,districtObstacle} from '../../features/worldgacha/public-districts';
const pose=():MotePose=>({x:0,y:0,z:0,sx:0,sy:0,sz:0,rx:0,ry:0,rz:0});

describe('localized public world life without extra residents',()=>{
 it('has precisely three small instanced patches tied to existing features',()=>{
  expect(PUBLIC_LIFE_PATCHES.map(p=>p.id)).toEqual(['willow-coffee','garden-petals','market-tea']);
  expect(PUBLIC_LIFE_PATCHES.reduce((n,p)=>n+p.count,0)).toBe(30);
  expect(PUBLIC_LIFE_PATCHES[1].sources.map(([x,,z])=>[x,z])).toEqual(GARDEN_BEDS);
  const [teaX,,teaZ]=PUBLIC_LIFE_PATCHES[2].sources[0];
  expect(Math.abs(teaX-MARKET_STALLS[2][0])).toBeLessThan(1.85);
  expect(Math.abs(teaZ-MARKET_STALLS[2][1])).toBeLessThan(1.4);
  expect(districtObstacle(teaX,teaZ)).toBe(true);
 });
 it('culls local life by player distance, including the exact boundary, and hides motes when still',()=>{
  expect(lifeDetailVisible({x:0,z:0},LIFE_DETAIL_DISTANCE-.01,0)).toBe(true);
  expect(lifeDetailVisible({x:0,z:0},LIFE_DETAIL_DISTANCE,0)).toBe(false);
  for(const p of PUBLIC_LIFE_PATCHES){
   const [x,,z]=p.sources[0];expect(lifePatchVisible(p,{x,z})).toBe(true);
   expect(lifePatchVisible(p,{x,z},true)).toBe(false);
   expect(lifePatchVisible(p,{x:x+100,z})).toBe(false);
  }
 });
 it('uses half the petals and gentler wind at night without inventing glowing fauna',()=>{
  for(const p of PUBLIC_LIFE_PATCHES)expect(lifeCount(p,true)).toBe(p.kind==='petal'?p.count/2:p.count);
  expect(districtBreeze(3,.4,true)).toBeCloseTo(districtBreeze(3,.4,false)*.55);
  expect(flowerLean(3,4,true)).toBeCloseTo(flowerLean(3,4,false)*.55);
 });
 it('does not advance under reduced motion and caps tab-resume delta',()=>{
  expect(lifeStep(.016,true)).toBe(0);expect(lifeStep(200)).toBe(.05);
  expect(lifeStep(-1)).toBe(0);expect(lifeStep(NaN)).toBe(0);expect(lifeStep(Infinity)).toBe(0);
  expect(lifeStep(.016)).toBe(.016);
 });
 it('samples finite deterministic poses in bounded source neighborhoods with reusable targets',()=>{
  for(const patch of PUBLIC_LIFE_PATCHES)for(let t=0;t<48;t+=.37)for(let i=0;i<patch.count;i++){
   const out=pose(),[x,y,z]=patch.sources[i%patch.sources.length];
   expect(sampleLifeMote(patch,i,t,false,out)).toBe(out);
   expect(sampleLifeMote(patch,i,t,false,pose())).toEqual(out);
   expect(Object.values(out).every(Number.isFinite)).toBe(true);
   expect(out.sx).toBeGreaterThanOrEqual(0);expect(out.sy).toBeGreaterThanOrEqual(0);
   expect(Math.abs(out.x-x)).toBeLessThan(patch.kind==='steam'?.28:2.2);
   expect(Math.abs(out.z-z)).toBeLessThan(patch.kind==='steam'?.1:1.41);
   expect(out.y).toBeGreaterThanOrEqual(y);expect(out.y-y).toBeLessThanOrEqual(.86);
  }
 });
 it('fades smoke and petals out at loop seams rather than teleporting full-size puffs',()=>{
  for(const patch of PUBLIC_LIFE_PATCHES){
   const rate=patch.kind==='steam'?.22:.085,period=1/rate;
   expect(sampleLifeMote(patch,0,0,false,pose()).sx).toBe(0);
   expect(sampleLifeMote(patch,0,period-.0001,false,pose()).sx).toBeLessThan(.0001);
   expect(sampleLifeMote(patch,0,period+.0001,false,pose()).sx).toBeLessThan(.0001);
   expect(sampleLifeMote(patch,0,period*.5,false,pose()).sx).toBeGreaterThan(.025);
  }
 });
 it('moves existing hanging geometry about fixed suspension points, with frozen/distant anchors untouched',()=>{
  for(const kind of ['sign','cloth','lantern'] as BreezeKind[]){
   const group=new Group();group.position.set(35,3.27,6.4);
   const hanging=new Object3D();hanging.position.y=-.2;group.add(hanging);
   const anchor={group,x:35,z:6.4,phase:.3,kind};
   group.updateMatrixWorld(true);const before=hanging.getWorldPosition(new Vector3());
   updateBreezeAnchors([anchor],{x:35,z:6.4},2,false);
   group.updateMatrixWorld(true);
   expect(group.position.toArray()).toEqual([35,3.27,6.4]);
   expect(hanging.getWorldPosition(new Vector3()).distanceTo(before)).toBeGreaterThan(.0001);
   expect(Math.abs(group.rotation.x)).toBeLessThan(.091);expect(Math.abs(group.rotation.z)).toBeLessThan(.046);
   const frozen=group.quaternion.toArray();
   updateBreezeAnchors([anchor],{x:35,z:6.4},8,false,true);expect(group.quaternion.toArray()).toEqual(frozen);
   updateBreezeAnchors([anchor],{x:-39,z:0},8,false);expect(group.quaternion.toArray()).toEqual(frozen);
  }
 });
 it('keeps flower movement restrained over the existing beds',()=>{
  const samples=Array.from({length:120},(_,i)=>flowerLean(i*.2,i));
  expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(.065);
  expect(new Set(samples.map(n=>n.toFixed(3))).size).toBeGreaterThan(20);
 });
});
