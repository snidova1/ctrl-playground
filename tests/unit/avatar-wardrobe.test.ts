import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {AnimationMixer,DoubleSide,Mesh,MeshBasicMaterial,Raycaster,SkinnedMesh,Vector3,BufferGeometry,Float32BufferAttribute} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMUtils,type VRM} from '@pixiv/three-vrm';
import {headlessAuthoredVrm} from './helpers/authored-vrm';
import {applyWardrobe,availableWardrobeStyles,clearCharacterWardrobe,loadCharacterWardrobe,prepareLoadedWardrobe} from '@/features/plaza/characters/wardrobe';
import {retargetHumanoid} from '@/features/plaza/characters/retarget';

async function garment(){
 const data=readFileSync('public/plaza/characters/wardrobe/darkness-studio.glb'),n=data.readUInt32LE(12),d=JSON.parse(data.subarray(20,20+n).toString());
 d.materials=d.materials.map((m:{name:string})=>({name:m.name}));delete d.textures;delete d.images;delete d.samplers;
 const j=Buffer.from(JSON.stringify(d)),padded=Math.ceil(j.length/4)*4,bin=data.subarray(20+n),out=Buffer.alloc(20+padded+bin.length,32);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded,12);out.writeUInt32LE(0x4e4f534a,16);j.copy(out,20);bin.copy(out,20+padded);
 return prepareLoadedWardrobe((await new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.length),'')).scene);
}
function cloth(vrm:VRM){const result:SkinnedMesh[]=[];vrm.scene.traverse(o=>{if(o instanceof SkinnedMesh&&!o.userData.ctrlWardrobe&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>/_CLOTH$/.test(m.name)))result.push(o);});return result;}
function points(mesh:SkinnedMesh){mesh.skeleton.update();return Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld));}
function geometrySignature(vrm:VRM){const rows:unknown[]=[];vrm.scene.traverse(o=>{if(o instanceof Mesh&&!o.userData.ctrlWardrobe&&!(Array.isArray(o.material)?o.material:[o.material]).some(m=>/_CLOTH$/.test(m.name)))rows.push([o.uuid,o.visible,o.geometry.uuid,o.geometry.groups.map((g:{start:number;count:number;materialIndex?:number})=>({...g}))]);});return rows;}

function torsoClearance(vrm:VRM,garment:SkinnedMesh){
 const skin:SkinnedMesh[]=[];vrm.scene.traverse(o=>{if(o instanceof SkinnedMesh&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name==='F00_002_02_Body_00_SKIN'))skin.push(o);});
 const material=new MeshBasicMaterial({side:DoubleSide});
 const proxy=(m:SkinnedMesh)=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(points(m).flatMap(p=>p.toArray()),3));g.setIndex(m.geometry.index);return new Mesh(g,material);};
 const clothProxy=proxy(garment),body=skin.map(proxy),ray=new Raycaster();let samples=0,minimum=Infinity;
 // Central covered torso, both front/back. No alpha-mask openings near neck,
 // hands or hem are misclassified as coverage. Raycast deformed real triangles.
 for(const y of [1.0,1.08,1.16])for(const x of [-.03,0,.03])for(const side of [-1,1]){
  ray.set(new Vector3(x,y,side),new Vector3(0,0,-side));const a=ray.intersectObject(clothProxy)[0],b=ray.intersectObjects(body)[0];
  if(!b)continue;expect(a,'covered torso garment hit').toBeTruthy();if(a){minimum=Math.min(minimum,b.distance-a.distance);expect(b.distance-a.distance,'cloth must remain outside torso skin').toBeGreaterThan(.001);samples++;}
 }
 clothProxy.geometry.dispose();body.forEach(m=>m.geometry.dispose());material.dispose();expect(samples).toBeGreaterThan(8);return minimum;
}

describe('reviewed skinned Darkness -> actual female-studio rig',()=>{
 it('compact artifact has only reviewed cloth, normalized weights, embedded art and honest provenance',()=>{
  const b=readFileSync('public/plaza/characters/wardrobe/darkness-studio.glb'),d=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),p=JSON.parse(readFileSync('public/plaza/characters/wardrobe/provenance.json','utf8'));
  expect(b.length).toBeLessThan(2*1024*1024);expect(p.triangles).toBe(2882);expect(p.restWarpMaxMeters).toBeGreaterThan(0);expect(p.restWarpMaxMeters).toBeLessThan(.001);
  expect(createHash('sha256').update(b).digest('hex')).toBe(p.artifactSha256);expect(d.materials).toHaveLength(2);expect(d.materials.every((m:{name:string})=>/_CLOTH$/.test(m.name))).toBe(true);expect(d.images).toHaveLength(2);expect(d.images.every((i:{uri?:string})=>i.uri===undefined)).toBe(true);
 });
 for(const quality of ['female-studio.vrm','female-studio-mobile.vrm'])it(`${quality}: binds actual target bones; original cloth silhouette retained at rest and shipped motions`,async()=>{
  const vrm=await headlessAuthoredVrm(`/plaza/characters/anime/${quality}`),loaded=await garment(),old=cloth(vrm),untouched=geometrySignature(vrm);
  const handle=applyWardrobe(vrm,'ctrl-anime-female-studio',loaded);
  try{
   expect(handle.meshes).toHaveLength(2);expect(old.every(o=>!o.visible)).toBe(true);expect(geometrySignature(vrm)).toEqual(untouched);
   const targetBones=new Set(old.flatMap(o=>o.skeleton.bones));
   for(const mesh of handle.meshes){expect(mesh.skeleton.bones.every(b=>targetBones.has(b))).toBe(true);const w=mesh.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)expect(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)).toBeCloseTo(1,5);}
   // Native and donor use the same dress template family, but sleeve shape and
   // weights differ. Preserve donor weights, assert <=12mm rest / <=18mm motion
   // deviation, and check torso skin clearance separately (not zero-delta parity).
   const pairs=handle.meshes.map(mesh=>{const reference=old.find(o=>(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name===(Array.isArray(mesh.material)?mesh.material[0]:mesh.material).name))!;expect(reference).toBeTruthy();const native=points(reference);return {mesh,reference,indices:points(mesh).map(p=>{let best=Infinity,index=-1;native.forEach((q,i)=>{const dist=p.distanceToSquared(q);if(dist<best){best=dist;index=i;}});expect(Math.sqrt(best)).toBeLessThan(.012);return index;})};});
   let maximumDeviation=0;
   const assertFit=(label:string)=>{vrm.scene.updateMatrixWorld(true);for(const {mesh,reference,indices} of pairs){const native=points(reference),actual=points(mesh);const max=Math.max(...actual.map((p,i)=>p.distanceTo(native[indices[i]])));maximumDeviation=Math.max(maximumDeviation,max);expect(max,label).toBeLessThan(label==='rest'?.012:.018);expect(actual.every(p=>p.toArray().every(Number.isFinite))).toBe(true);}};
   assertFit('rest');const clearance=torsoClearance(vrm,handle.meshes[0]);console.info('wardrobe torso minimum clearance (m)',quality,clearance);const rest=points(handle.meshes[0]);
   const motionBytes=readFileSync('public/plaza/characters/humanoid-motions.glb'),motion=await new GLTFLoader().parseAsync(motionBytes.buffer.slice(motionBytes.byteOffset,motionBytes.byteOffset+motionBytes.length),'');
   const mixer=new AnimationMixer(vrm.scene),clips=retargetHumanoid(motion,vrm);let moved=0;
   for(const name of ['Idle','Walk','Interact']){const clip=clips.find(c=>c.name===name)!;expect(clip).toBeTruthy();mixer.stopAllAction();mixer.clipAction(clip).reset().play();for(const f of [0,.2,.4,.6,.8]){mixer.setTime(clip.duration*f);vrm.update(0);assertFit(`${name}@${f}`);moved=Math.max(moved,...points(handle.meshes[0]).map((p,i)=>p.distanceTo(rest[i])));}}
   expect(moved).toBeGreaterThan(.02);mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);
   // Additional arm-up and seated leg deformation, without claiming cloth sim.
   vrm.humanoid.resetNormalizedPose();vrm.humanoid.getRawBoneNode('leftUpperArm')!.rotation.z=.8;vrm.humanoid.getRawBoneNode('rightUpperLeg')!.rotation.x=-1;vrm.scene.updateMatrixWorld(true);assertFit('arm-up/seated-leg');
   console.info('wardrobe fit maximum deviation (m)',quality,maximumDeviation);
  }finally{handle.dispose();handle.dispose();expect(old.every(o=>o.visible)).toBe(true);expect(geometrySignature(vrm)).toEqual(untouched);expect(loaded.disposed).toBe(true);VRMUtils.deepDispose(vrm.scene);}
 });
 it('rejects other bodies before modifying source; unsupported/source do not fetch',async()=>{
  expect(availableWardrobeStyles('ctrl-anime-female').map(s=>s.id)).toEqual(['source']);expect(availableWardrobeStyles('ctrl-anime-male').map(s=>s.id)).toEqual(['source']);
  const vrm=await headlessAuthoredVrm('/plaza/characters/anime/female-studio-mobile.vrm'),loaded=await garment(),before=cloth(vrm).map(m=>m.visible);
  expect(()=>applyWardrobe(vrm,'ctrl-anime-male',loaded)).toThrow(/unsupported/);expect(cloth(vrm).map(m=>m.visible)).toEqual(before);
  expect(await loadCharacterWardrobe(vrm,'ctrl-anime-male','darkness-studio')).toEqual({status:'unsupported'});expect(await loadCharacterWardrobe(vrm,'ctrl-anime-female-studio','source')).toEqual({status:'source'});loaded.dispose();clearCharacterWardrobe(vrm);VRMUtils.deepDispose(vrm.scene);
 });
});
