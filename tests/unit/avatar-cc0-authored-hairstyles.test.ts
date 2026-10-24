import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {AnimationClip,AnimationMixer,Box3,Mesh,QuaternionKeyframeTrack,SkinnedMesh,Vector3} from 'three';
import {VRMUtils,type VRM} from '@pixiv/three-vrm';
import {attachAuthoredHair,authoredFaceBounds,clearCharacterHair,hairDonors,isAuthoredHair} from '@/features/plaza/characters/hairstyles';
import {headlessAuthoredVrm} from './helpers/authored-vrm';

function hairs(vrm:VRM){const meshes:SkinnedMesh[]=[];vrm.scene.traverse(o=>{if(o instanceof SkinnedMesh&&isAuthoredHair(o))meshes.push(o);});return meshes;}
function point(mesh:SkinnedMesh,vertex:number,vrm:VRM){mesh.skeleton.update();return mesh.getVertexPosition(vertex,new Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(vrm.humanoid.getRawBoneNode('head')!.matrixWorld.clone().invert());}

// Test-only registration exercises the real production attachment, without editing
// the parent's registry/catalog. IDs are unique per target so tests cannot race.
const donors=hairDonors as unknown as Record<string,{target:string;asset:string}>;
describe('new compact CC0 hair donors / real CPU skinning',()=>{
 for(const style of ['cc0-shino-long','cc0-shibu-bob'])for(const targetFile of ['female-studio','male'])for(const suffix of ['','-mobile']){
  it(`${style} -> ${targetFile}${suffix}: face fit, authored binds, head motion, body AnimationMixer`,async()=>{
   const target=await headlessAuthoredVrm(`/plaza/characters/anime/${targetFile}${suffix}.vrm`);
   const donor=await headlessAuthoredVrm(`/plaza/characters/hairstyles/${style}${suffix}.vrm`);
   const characterId=`ctrl-anime-${targetFile}`,testId=`${style}-${targetFile}${suffix}`;
   donors[testId]={target:characterId,asset:style};
   const source=hairs(donor),old=hairs(target),from=authoredFaceBounds(donor),to=authoredFaceBounds(target);
   const refs=source.map(mesh=>({mesh,geometry:mesh.geometry,uv:mesh.geometry.attributes.uv,weights:mesh.geometry.attributes.skinWeight,skeleton:mesh.skeleton,bind:mesh.bindMatrix.clone(),inverse:mesh.skeleton.boneInverses.map(m=>m.clone()),vertex:mesh.geometry.index?.getX(0)??0}));
   const before=refs.map(r=>point(r.mesh,r.vertex,donor));
   const body:Mesh[]=[];target.scene.traverse(o=>{if(o instanceof Mesh&&!isAuthoredHair(o))body.push(o);});
   const bodyRefs=body.map(m=>({geometry:m.geometry,material:m.material,visible:m.visible}));
   try{
    const binding=attachAuthoredHair(target,donor,characterId,testId as never);
    expect(binding.hairs.length).toBeGreaterThan(20);
    expect(binding.scale.toArray().every(n=>n>=.85&&n<=1.18)).toBe(true);
    const expected=before.map(p=>p.clone().sub(from.getCenter(new Vector3())).multiply(binding.scale).add(to.getCenter(new Vector3())));
    for(const [i,r] of refs.entries()){
     expect(r.mesh.geometry).toBe(r.geometry);expect(r.mesh.geometry.attributes.uv).toBe(r.uv);expect(r.mesh.geometry.attributes.skinWeight).toBe(r.weights);expect(r.mesh.skeleton).toBe(r.skeleton);
     expect(r.mesh.bindMatrix.equals(r.bind)).toBe(true);r.inverse.forEach((v,k)=>expect(r.mesh.skeleton.boneInverses[k].equals(v)).toBe(true));
     expect(point(r.mesh,r.vertex,target).distanceTo(expected[i])).toBeLessThan(1e-5);
    }
    expect(old.every(m=>!m.visible)).toBe(true);
    binding.root.traverse(o=>{if(o instanceof Mesh)expect(isAuthoredHair(o)).toBe(true);else if(o.name!=='CTRL authored hairstyle')expect(o.name.startsWith('CTRLHairDonor::')).toBe(true);});
    const size=new Box3().setFromObject(binding.root).getSize(new Vector3());
    expect(size.x).toBeGreaterThan(.15);expect(size.x).toBeLessThan(.55);expect(size.z).toBeLessThan(.5);expect(size.y).toBeLessThan(.9);
    if(style==='cc0-shino-long')expect(size.y).toBeGreaterThan(.4);
    else expect(size.y).toBeLessThan(.4);
    const arm=target.humanoid.getNormalizedBoneNode('leftUpperArm')!;
    expect(target.scene.getObjectByName(arm.name)).toBe(arm);
    const staticArm=donor.humanoid.getNormalizedBoneNode('leftUpperArm')!,staticQ=staticArm.quaternion.clone();
    const mixer=new AnimationMixer(target.scene);
    mixer.clipAction(new AnimationClip('body-binding',1,[new QuaternionKeyframeTrack(`${arm.name}.quaternion`,[0],[.247403959,0,0,.968912421])])).play();
    mixer.update(0);expect(arm.quaternion.x).toBeGreaterThan(.2);expect(staticArm.quaternion.equals(staticQ)).toBe(true);
    mixer.stopAllAction();mixer.uncacheRoot(target.scene);
    for(const [x,y,z] of [[.25,.6,.1],[-.3,-.6,-.1],[0,0,0]]){
     target.humanoid.getNormalizedBoneNode('head')!.rotation.set(x,y,z);target.humanoid.update();target.scene.updateMatrixWorld(true);
     for(const [i,r] of refs.entries())expect(point(r.mesh,r.vertex,target).distanceTo(expected[i])).toBeLessThan(1e-5);
    }
    body.forEach((m,i)=>{expect(m.geometry).toBe(bodyRefs[i].geometry);expect(m.material).toBe(bodyRefs[i].material);expect(m.visible).toBe(bodyRefs[i].visible);});
    console.log(JSON.stringify({style,target:targetFile,quality:suffix?'low':'high',fitScale:binding.scale.toArray(),fitShift:to.getCenter(new Vector3()).sub(from.getCenter(new Vector3()).multiply(binding.scale)).toArray(),hairBounds:size.toArray(),hairMeshes:binding.hairs.length}));
   }finally{clearCharacterHair(target);delete donors[testId];VRMUtils.deepDispose(target.scene);}
  });
 }
 it('delivers compact licensed donors with distinct authored topology, not color variants',()=>{
  const docs=['cc0-shino-long','cc0-shibu-bob'].map(style=>{
   const bytes=readFileSync(`public/plaza/characters/hairstyles/${style}.vrm`);expect(bytes.length).toBeLessThan(3_000_000);
   const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
   expect(doc.extensions.VRM.meta.licenseName).toBe('CC0');expect(doc.extensions.VRM.meta.allowedUserName).toBe('Everyone');
   expect(doc.extensions.VRM.humanoid.humanBones.length).toBeGreaterThan(20);
   for(const mesh of doc.meshes)for(const p of mesh.primitives){
    const name=doc.materials[p.material].name;expect(/HAIR|Face_00_SKIN/i.test(name)).toBe(true);
    expect(p.attributes.TEXCOORD_0).toBeTypeOf('number');expect(p.attributes.WEIGHTS_0).toBeTypeOf('number');
   }
   return doc;
  });
  expect(docs[0].meshes.reduce((n:number,m:{primitives:unknown[]})=>n+m.primitives.length,0)).not.toBe(docs[1].meshes.reduce((n:number,m:{primitives:unknown[]})=>n+m.primitives.length,0));
 });
});
