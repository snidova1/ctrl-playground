import {describe,it,expect} from 'vitest';
import {Object3D,Vector3,Quaternion} from 'three';
import type {VRM} from '@pixiv/three-vrm';
import {CharacterFootIK,solveTwoBoneIK} from '@/features/plaza/characters/foot-ik';
function rig(){
 const root=new Object3D(),hips=new Object3D();hips.position.y=1;root.add(hips);
 const bones:Record<string,Object3D>={hips};
 for(const [side,sign] of [['left',-1],['right',1]] as const){
  const upper=new Object3D(),lower=new Object3D(),foot=new Object3D();upper.position.x=sign*.16;lower.position.y=-.5;foot.position.y=-.5;
  hips.add(upper);upper.add(lower);lower.add(foot);bones[side+'UpperLeg']=upper;bones[side+'LowerLeg']=lower;bones[side+'Foot']=foot;
 }
 root.updateMatrixWorld(true);
 const vrm={humanoid:{getRawBoneNode:(name:string)=>bones[name]??null}} as unknown as VRM;
 return {root,hips,bones,ik:new CharacterFootIK(vrm,root)};
}
describe('compatible raw-bone foot IK',()=>{
 it('reaches slope ground, preserves lengths and never accumulates on frames without mixer advancement',()=>{
  const r=rig(),ground=(x:number)=>x*.2;
  for(let i=0;i<180;i++){r.ik.restore();r.ik.apply(1/60,ground,true);}
  for(const side of ['left','right']){
   const foot=r.bones[side+'Foot'].getWorldPosition(new Vector3()),knee=r.bones[side+'LowerLeg'].getWorldPosition(new Vector3()),hip=r.bones[side+'UpperLeg'].getWorldPosition(new Vector3());
   expect(foot.y).toBeCloseTo(ground(foot.x),3);expect(hip.distanceTo(knee)).toBeCloseTo(.5,6);expect(knee.distanceTo(foot)).toBeCloseTo(.5,6);
  }
  const position=r.hips.position.clone(),q=r.bones.leftUpperLeg.quaternion.clone();
  for(let i=0;i<240;i++){r.ik.restore();r.ik.apply(1/60,ground,true);}
  expect(r.hips.position.distanceTo(position)).toBeLessThan(1e-5);expect(r.bones.leftUpperLeg.quaternion.angleTo(q)).toBeLessThan(1e-4);
 });
 it('releases the animated pose immediately for jump, sit and shared dance, then restores it on landing',()=>{
  const r=rig(),ground=(x:number)=>x*.2;
  for(let i=0;i<60;i++){r.ik.restore();r.ik.apply(1/60,ground,true);}
  r.ik.restore();r.ik.apply(1/60,ground,false);
  expect(r.hips.position.y).toBe(1);expect(r.bones.leftUpperLeg.quaternion.angleTo(new Quaternion())).toBe(0);
  for(let i=0;i<180;i++){r.ik.restore();r.ik.apply(1/60,ground,true);}
  expect(r.hips.position.y).toBeLessThan(1);
 });
 it('rejects degenerate chains and excessive drops instead of producing invalid bones',()=>{
  const bone=new Object3D();expect(solveTwoBoneIK(bone,bone,bone,new Vector3(),new Vector3(1,0,0))).toBe(false);
  const r=rig();for(let i=0;i<60;i++){r.ik.restore();r.ik.apply(1/60,(x)=>Math.abs(x)>.1?-10:0,true);}
  expect(r.hips.position.y).toBe(1);for(const b of Object.values(r.bones))expect(b.quaternion.toArray().every(Number.isFinite)).toBe(true);
 });
});
