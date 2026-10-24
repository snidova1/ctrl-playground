import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {AnimationMixer} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {headlessAuthoredVrm} from './helpers/authored-vrm';
import {retargetHumanoid} from '@/features/plaza/characters/retarget';
import {fitSeatedHands} from '@/features/plaza/characters/seated-arms';
import {seatedHandClearance} from '@/features/plaza/characters/seated-hand-contact';
describe('real AIRI seated palm/thigh contact',()=>{
 it('keeps visible palms/fingers above thigh skin, not just hip above seat',async()=>{
  const vrm=await headlessAuthoredVrm('/plaza/characters/airi-reference/avatar-sample-a-mobile.vrm');
  const data=readFileSync('public/plaza/characters/humanoid-motions.glb'),motion=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer,'');
  const source=retargetHumanoid(motion,vrm),original=JSON.stringify(source.map(c=>c.toJSON()));
  const clips=fitSeatedHands(source,vrm),clip=clips.find(c=>c.name==='Seated')!,mixer=new AnimationMixer(vrm.scene);mixer.clipAction(clip).play();
  expect(JSON.stringify(source.map(c=>c.toJSON()))).toBe(original);
  for(const name of ['SitDown','Seated'])for(const track of source.find(c=>c.name===name)!.tracks.filter(t=>!/UpperArm|LowerArm|Hand\.quaternion/.test(t.name))){const fitted=clips.find(c=>c.name===name)!.tracks.find(t=>t.name===track.name)!;expect(Array.from(fitted.values)).toEqual(Array.from(track.values));}
  for(const time of [.3,.8,1.5]){mixer.setTime(time);vrm.update(0);for(const side of ['left','right'] as const){const result=seatedHandClearance(vrm,side);console.log('REAL_SEATED_HAND',time,side,result);expect(result,`${side} actual hand must be over a thigh`).toBeDefined();expect(result!.clearance,`${side} palm/fingers penetrate posed thigh at ${time}`).toBeGreaterThanOrEqual(.003);}}
  mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);
 });
});
