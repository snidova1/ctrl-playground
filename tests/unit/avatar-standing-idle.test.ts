import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {AnimationClip,AnimationMixer,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils,type VRM,type VRMHumanBoneName} from '@pixiv/three-vrm';
import {relaxedIdle} from '../../features/plaza/characters/relaxed-idle';
async function rig(file:string){
 const b=readFileSync(file),n=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+n));
 g.materials=g.materials.map((m:{name:string})=>({name:m.name}));g.images=[];g.textures=[];g.samplers=[];
 if(g.extensions.VRM){delete g.extensions.VRM.materialProperties;delete g.extensions.VRM.meta.texture;}
 const j=Buffer.from(JSON.stringify(g)),p=Buffer.alloc(Math.ceil(j.length/4)*4,32);j.copy(p);const bin=b.subarray(20+n),h=Buffer.alloc(20);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(20+p.length+bin.length,8);h.writeUInt32LE(p.length,12);h.writeUInt32LE(0x4e4f534a,16);
 const bytes=Buffer.concat([h,p,bin]),loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const vrm=gltf.userData.vrm as VRM;VRMUtils.rotateVRM0(vrm);return vrm;
}
describe('standing idle on the actual hosted male and female rigs',()=>{
 for(const gender of ['male','female'] as const)it(`${gender}: symmetric uncrossed stance, male visibly wider, hands down`,async()=>{
  const vrm=await rig(gender==='male'?'public/plaza/characters/anime/male-mobile.vrm':'public/plaza/characters/airi-reference/avatar-sample-a-mobile.vrm');
  const at=(bone:VRMHumanBoneName)=>vrm.humanoid.getRawBoneNode(bone)!.getWorldPosition(new Vector3());
  const widths=[];
  for(const poseGender of ['female','male'] as const){
   const mixer=new AnimationMixer(vrm.scene);mixer.clipAction(relaxedIdle(new AnimationClip('Idle',6,[]),vrm,poseGender)).play();mixer.update(.25);vrm.update(0);vrm.scene.updateMatrixWorld(true);
   const left=at('leftFoot'),right=at('rightFoot'),hipWidth=Math.abs(at('leftUpperLeg').x-at('rightUpperLeg').x),width=Math.abs(left.x-right.x);
   widths.push(width);expect((left.x-right.x)*(at('leftUpperLeg').x-at('rightUpperLeg').x)).toBeGreaterThan(0);
   expect(Math.abs(left.y-right.y)).toBeLessThan(.015);expect(at('leftHand').y).toBeLessThan(at('leftUpperArm').y-.2);expect(at('rightHand').y).toBeLessThan(at('rightUpperArm').y-.2);
   if(poseGender==='male')expect(width-hipWidth,'male stance must visibly extend beyond hip-width, not read as feet together').toBeGreaterThan(.1);
   mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);
  }
  expect(widths[1]-widths[0]).toBeGreaterThan(.14);VRMUtils.deepDispose(vrm.scene);
 });
});
