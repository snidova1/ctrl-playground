import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {AnimationClip,AnimationMixer,Box3,Mesh,QuaternionKeyframeTrack,SkinnedMesh,Vector3} from 'three';
import {VRMUtils,type VRM} from '@pixiv/three-vrm';
import {attachAuthoredHair,authoredFaceBounds,clearCharacterHair,hairDonor,isAuthoredHair} from '@/features/plaza/characters/hairstyles';
import {availableHairStyles,decorationDefaults,defaultAppearance,hairStyles,isCharacterAppearance,normalizeAppearance,resolveCharacter,seededAppearance} from '@/features/plaza/characters/catalog';
import {characterProfileInputSchema} from '@/domain/habitat';
import {headlessAuthoredVrm} from './helpers/authored-vrm';
function hairs(vrm:VRM){const result:SkinnedMesh[]=[];vrm.scene.traverse(o=>{if(o instanceof SkinnedMesh&&isAuthoredHair(o))result.push(o);});return result;}
function headLocal(mesh:SkinnedMesh,vertex:number,vrm:VRM){mesh.skeleton.update();return mesh.getVertexPosition(vertex,new Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(vrm.humanoid.getRawBoneNode('head')!.matrixWorld.clone().invert());}

describe('independent authored hairstyles: real shipped geometry, not hats/tints',()=>{
 for(const [targetFile,donorFile,characterId,style] of [
  ['female-studio','male','ctrl-anime-female-studio','vroid-short'],
  ['male','female-studio','ctrl-anime-male','vroid-layered'],
 ] as const)for(const quality of ['high','low'] as const){
  it(`${characterId}/${style}/${quality}: keeps donor skin/UVs/materials and follows animated target head without changing body`,async()=>{
   const suffix=quality==='low'?'-mobile':'',target=await headlessAuthoredVrm(`/plaza/characters/anime/${targetFile}${suffix}.vrm`),donor=await headlessAuthoredVrm(`/plaza/characters/anime/${donorFile}${suffix}.vrm`);
   const original=hairs(target),source=hairs(donor),references=source.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,skeleton:mesh.skeleton,weights:mesh.geometry.attributes.skinWeight,uv:mesh.geometry.attributes.uv,bind:mesh.bindMatrix.clone(),inverse:mesh.skeleton.boneInverses.map(m=>m.clone())}));
   const body:Mesh[]=[];target.scene.traverse(o=>{if(o instanceof Mesh&&!isAuthoredHair(o))body.push(o);});
   const bodyRefs=body.map(m=>({geometry:m.geometry,material:m.material,matrix:m.matrix.clone(),visible:m.visible}));
   const from=authoredFaceBounds(donor),to=authoredFaceBounds(target),before=source.map(m=>headLocal(m,m.geometry.index?.getX(0)??0,donor));
   const binding=attachAuthoredHair(target,donor,characterId,style);
   try{
    expect(binding.hairs.length).toBe(donorFile==='male'?114:108);
    // Donor normalized bone names must not steal live animation bindings.
    const arm=target.humanoid.getNormalizedBoneNode('leftUpperArm')!;
    expect(target.scene.getObjectByName(arm.name)).toBe(arm);
    const mixer=new AnimationMixer(target.scene);
    const clip=new AnimationClip('hair-binding-regression',1,[new QuaternionKeyframeTrack(`${arm.name}.quaternion`,[0],[.247403959,0,0,.968912421])]);
    mixer.clipAction(clip).play();mixer.update(0);expect(arm.quaternion.x).toBeGreaterThan(.2);
    mixer.stopAllAction();mixer.uncacheRoot(target.scene);
    expect(original.every(mesh=>!mesh.visible)).toBe(true);
    for(const [i,reference] of references.entries()){
     const mesh=reference.mesh;expect(mesh.geometry).toBe(reference.geometry);expect(mesh.material).toBe(reference.material);expect(mesh.skeleton).toBe(reference.skeleton);
     expect(mesh.geometry.attributes.skinWeight).toBe(reference.weights);expect(mesh.geometry.attributes.uv).toBe(reference.uv);expect(mesh.bindMatrix.equals(reference.bind)).toBe(true);
     reference.inverse.forEach((matrix,k)=>expect(mesh.skeleton.boneInverses[k].equals(matrix)).toBe(true));
     const expected=before[i].clone().sub(from.getCenter(new Vector3())).multiply(binding.scale).add(to.getCenter(new Vector3()));
     expect(headLocal(mesh,mesh.geometry.index?.getX(0)??0,target).distanceTo(expected)).toBeLessThan(1e-5);
    }
    binding.root.traverse(o=>{if(o instanceof Mesh)expect(isAuthoredHair(o)).toBe(true);});
    const size=new Box3().setFromObject(binding.root).getSize(new Vector3());
    expect(size.x).toBeGreaterThan(.2);expect(size.x).toBeLessThan(.5);expect(size.y).toBeLessThan(.5);expect(size.z).toBeLessThan(.4);
    const normalized=target.humanoid.getNormalizedBoneNode('head')!;
    for(const [x,y,z] of [[.2,.4,0],[-.2,-.5,.1],[0,0,0]]){
     normalized.rotation.set(x,y,z);target.humanoid.update();target.scene.updateMatrixWorld(true);
     for(const mesh of binding.hairs.slice(0,8)){
      const vertex=mesh.geometry.index?.getX(0)??0,expected=before[source.indexOf(mesh)].clone().sub(from.getCenter(new Vector3())).multiply(binding.scale).add(to.getCenter(new Vector3()));
      expect(headLocal(mesh,vertex,target).distanceTo(expected)).toBeLessThan(1e-5);
     }
    }
    body.forEach((mesh,i)=>{expect(mesh.geometry).toBe(bodyRefs[i].geometry);expect(mesh.material).toBe(bodyRefs[i].material);expect(mesh.matrix.equals(bodyRefs[i].matrix)).toBe(true);expect(mesh.visible).toBe(bodyRefs[i].visible);});
   }finally{clearCharacterHair(target);expect(original.every(mesh=>mesh.visible)).toBe(true);VRMUtils.deepDispose(target.scene);}
  });
 }
 it('accepts only source/allowlisted geometry IDs, persists separately from hair color and preserves legacy model choices',()=>{
  for(const gender of ['female','male'] as const)for(const lookId of ['original','alternate'] as const){
   const legacy={version:1,gender,variantId:'clay',hairId:'silver',eyeId:'jade',skinId:'deep',lookId} as const;
   const repaired=normalizeAppearance(legacy,gender,'original');
   expect(repaired).toEqual({...decorationDefaults,...legacy,lookId:gender==='male'?'original':lookId});
   expect(repaired.hairStyleId).toBeUndefined();expect(isCharacterAppearance(legacy)).toBe(true);
   expect(resolveCharacter(repaired).assets.low).not.toContain('/male-studio');
   for(const style of availableHairStyles(gender,repaired.lookId)){
    const appearance={...repaired,hairStyleId:style.id};
    expect(characterProfileInputSchema.parse({name:'Resident',character:gender,appearance}).appearance).toEqual(appearance);
    expect(normalizeAppearance(appearance,gender,'original')).toEqual(appearance);
   }
  }
  for(const hairStyleId of ['hat','tint','https://evil.invalid/hair.vrm','Fumiriya']){
   const appearance={...defaultAppearance,hairStyleId};expect(isCharacterAppearance(appearance)).toBe(false);
   expect(characterProfileInputSchema.safeParse({name:'Resident',character:'female',appearance}).success).toBe(false);
  }
  expect(availableHairStyles('female','original').map(s=>s.id)).toEqual(['source']);
  expect(hairDonor('ctrl-anime-female','vroid-short')).toBeNull();
  expect(normalizeAppearance({...defaultAppearance,hairStyleId:'vroid-short'},'female','original').hairStyleId).toBe('source');
 });
 it('deterministically rolls only compatible hairstyles without overriding paired legacy look IDs',()=>{
  const reached=new Set<string>();
  for(const gender of ['female','male'] as const)for(let i=0;i<128;i++){
   const appearance=seededAppearance(`hair:${i}`,gender);expect(seededAppearance(`hair:${i}`,gender)).toEqual(appearance);
   expect(availableHairStyles(gender,appearance.lookId).some(style=>style.id===appearance.hairStyleId)).toBe(true);
   expect(normalizeAppearance(appearance,gender,'original')).toEqual(appearance);reached.add(appearance.hairStyleId!);
  }
  expect(reached).toEqual(new Set(hairStyles.filter(s=>!('characterId'in s)).map(s=>s.id)));
 });
 it('retains actual source texture references and only uses accepted CC0 HairSample donor exports',()=>{
  for(const filename of ['male','female-studio']){
   const data=readFileSync(`public/plaza/characters/anime/${filename}.vrm`),doc=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
   expect(doc.extensions.VRM.meta.licenseName).toBe('CC0');
   expect(doc.extensions.VRM.meta.allowedUserName).toBe('Everyone');
   const materials=doc.materials.filter((m:{name:string})=>/HAIR/i.test(m.name));expect(materials.length).toBeGreaterThan(0);
   for(const material of materials)expect(material.pbrMetallicRoughness.baseColorTexture.index).toBeTypeOf('number');
  }
 });
});
