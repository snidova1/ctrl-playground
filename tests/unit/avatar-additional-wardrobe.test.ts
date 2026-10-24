import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {AnimationMixer,DoubleSide,Mesh,MeshBasicMaterial,Raycaster,SkinnedMesh,Vector3,Vector4,Matrix4,BufferGeometry,Float32BufferAttribute} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMUtils,type VRM} from '@pixiv/three-vrm';
import {headlessAuthoredVrm} from './helpers/authored-vrm';
import {applyWardrobe,prepareLoadedWardrobe} from '@/features/plaza/characters/wardrobe';
import {retargetHumanoid} from '@/features/plaza/characters/retarget';

async function garment(id:string){
 const data=readFileSync(`public/plaza/characters/wardrobe/${id}.glb`),n=data.readUInt32LE(12),d=JSON.parse(data.subarray(20,20+n).toString());
 d.materials=d.materials.map((m:{name:string})=>({name:m.name}));delete d.textures;delete d.images;delete d.samplers;
 const j=Buffer.from(JSON.stringify(d)),padded=Math.ceil(j.length/4)*4,bin=data.subarray(20+n),out=Buffer.alloc(20+padded+bin.length,32);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded,12);out.writeUInt32LE(0x4e4f534a,16);j.copy(out,20);bin.copy(out,20+padded);
 return prepareLoadedWardrobe((await new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.length),'')).scene);
}
function meshes(vrm:VRM){const result:SkinnedMesh[]=[];vrm.scene.traverse(o=>{if(o instanceof SkinnedMesh&&!o.userData.ctrlWardrobe)result.push(o);});return result;}
function points(mesh:SkinnedMesh){mesh.skeleton.update();return Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld));}
function signature(vrm:VRM){return meshes(vrm).map(m=>[m.uuid,m.visible,m.geometry.uuid,m.geometry.groups.map(g=>({...g})),m.skeleton.bones.map(b=>b.uuid)]);}
function clearance(vrm:VRM,garment:SkinnedMesh){
 const material=new MeshBasicMaterial({side:DoubleSide});
 const proxy=(m:SkinnedMesh)=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(points(m).flatMap(p=>p.toArray()),3));g.setIndex(m.geometry.index);return new Mesh(g,material);};
 const a=proxy(garment),body=meshes(vrm).filter(o=>(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name==='F00_002_02_Body_00_SKIN')).map(proxy),ray=new Raycaster();let samples=0,minimum=Infinity;
 for(const y of [1,1.08,1.16])for(const x of [-.03,0,.03])for(const side of [-1,1]){
  ray.set(new Vector3(x,y,side),new Vector3(0,0,-side));const c=ray.intersectObject(a)[0],b=ray.intersectObjects(body)[0];
  if(!b)continue;expect(c,'central covered torso hit').toBeTruthy();if(c){minimum=Math.min(minimum,b.distance-c.distance);expect(b.distance-c.distance,'no central torso skin penetration').toBeGreaterThan(.001);samples++;}
 }
 a.geometry.dispose();body.forEach(m=>m.geometry.dispose());material.dispose();expect(samples).toBeGreaterThan(8);return minimum;
}
// Independent explicit CPU LBS formula, compared to Three's deformed vertices.
function assertLBS(mesh:SkinnedMesh){
 const p=mesh.geometry.attributes.position,j=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight;
 for(let i=0;i<p.count;i+=17){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.bindMatrix),actual=mesh.getVertexPosition(i,new Vector3()),expected=new Vector3(),js=new Vector4(j.getX(i),j.getY(i),j.getZ(i),j.getW(i)),ws=new Vector4(w.getX(i),w.getY(i),w.getZ(i),w.getW(i));
  for(let k=0;k<4;k++){const n=js.getComponent(k),matrix=new Matrix4().multiplyMatrices(mesh.skeleton.bones[n].matrixWorld,mesh.skeleton.boneInverses[n]);expected.addScaledVector(v.clone().applyMatrix4(matrix),ws.getComponent(k));}
  expected.applyMatrix4(mesh.bindMatrixInverse);expect(expected.distanceTo(actual)).toBeLessThan(1e-5);
 }
}

describe('additional reviewed CC0 wardrobe: real target CPU deformation',()=>{
 for(const id of ['vita-studio']){
  it(`${id}: compact garment-only licensed artifact`,()=>{
   const b=readFileSync(`public/plaza/characters/wardrobe/${id}.glb`),d=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),p=JSON.parse(readFileSync(`public/plaza/characters/wardrobe/${id}.provenance.json`,'utf8'));
   expect(b.length).toBeLessThan(1024*1024);expect(createHash('sha256').update(b).digest('hex')).toBe(p.artifactSha256);expect(p.license).toBe('CC0-1.0');expect(p.missingWeightedBones).toEqual([]);expect(p.weightedBones).toHaveLength(44);expect(p.triangles).toBe(2882);expect(p.textures.every((t:{outputSize:number[]})=>t.outputSize.every(n=>n<=1024))).toBe(true);
   expect(d.extras.ctrlWardrobe).toMatchObject({id,supportedCharacterId:'ctrl-anime-female-studio',targetRestBound:true});expect(d.meshes).toHaveLength(1);expect(d.materials).toHaveLength(2);expect(d.materials.every((m:{name:string})=>/_CLOTH$/.test(m.name))).toBe(true);expect(d.meshes[0].primitives.every((p:{targets?:unknown})=>!p.targets)).toBe(true);expect(d.images.every((i:{uri?:string})=>!i.uri)).toBe(true);
  });
  for(const quality of ['female-studio.vrm','female-studio-mobile.vrm'])it(`${id}/${quality}: actual bones, rest coverage, 15 animation frames, arm and seated leg`,async()=>{
   const vrm=await headlessAuthoredVrm(`/plaza/characters/anime/${quality}`),loaded=await garment(id),before=signature(vrm),native=meshes(vrm),bones=new Set(native.flatMap(m=>m.skeleton.bones)),handle=applyWardrobe(vrm,'ctrl-anime-female-studio',loaded);
   try{
    expect(handle.meshes).toHaveLength(2);expect(native.filter(m=>(Array.isArray(m.material)?m.material:[m.material]).some(a=>/_CLOTH$/.test(a.name))).every(m=>!m.visible)).toBe(true);
    const skin=()=>signature(vrm).filter((_,i)=>!(Array.isArray(native[i].material)?native[i].material:[native[i].material]).some(m=>/_CLOTH$/.test(m.name)));
    expect(skin()).toEqual(before.filter((_,i)=>!(Array.isArray(native[i].material)?native[i].material:[native[i].material]).some(m=>/_CLOTH$/.test(m.name))));
    for(const m of handle.meshes){expect(m.skeleton.bones.every(b=>bones.has(b))).toBe(true);const w=m.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)expect(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)).toBeCloseTo(1,5);assertLBS(m);}
    const min=clearance(vrm,handle.meshes[0]),rest=handle.meshes.map(points);let moved=0;
    const bytes=readFileSync('public/plaza/characters/humanoid-motions.glb'),motion=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
    const mixer=new AnimationMixer(vrm.scene),clips=retargetHumanoid(motion,vrm);
    for(const name of ['Idle','Walk','Interact']){const clip=clips.find(c=>c.name===name)!;expect(clip).toBeTruthy();mixer.stopAllAction();mixer.clipAction(clip).reset().play();for(const f of [0,.2,.4,.6,.8]){mixer.setTime(clip.duration*f);vrm.update(0);vrm.scene.updateMatrixWorld(true);for(const [k,m] of handle.meshes.entries()){assertLBS(m);const ps=points(m);expect(ps.every(p=>p.toArray().every(Number.isFinite))).toBe(true);moved=Math.max(moved,...ps.map((p,i)=>p.distanceTo(rest[k][i])));}}}
    expect(moved).toBeGreaterThan(.02);mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);vrm.humanoid.resetNormalizedPose();vrm.humanoid.getRawBoneNode('leftUpperArm')!.rotation.z=.8;vrm.humanoid.getRawBoneNode('rightUpperLeg')!.rotation.x=-1;vrm.scene.updateMatrixWorld(true);for(const m of handle.meshes)assertLBS(m);
    console.info(JSON.stringify({id,quality,minimumRestTorsoClearance:min,maximumAnimatedDisplacement:moved,frames:15}));
   }finally{handle.dispose();handle.dispose();expect(signature(vrm)).toEqual(before);expect(loaded.disposed).toBe(true);VRMUtils.deepDispose(vrm.scene);}
  });
  it(`${id}: wrong body, missing bones and wrong rest binds reject before masking`,async()=>{
   const vrm=await headlessAuthoredVrm('/plaza/characters/anime/female-studio-mobile.vrm'),loaded=await garment(id),before=signature(vrm);const donor:SkinnedMesh[]=[];loaded.scene.traverse(o=>{if(o instanceof SkinnedMesh)donor.push(o);});
   expect(()=>applyWardrobe(vrm,'ctrl-anime-male',loaded)).toThrow(/unsupported/);const bone=donor[0].skeleton.bones[0],name=bone.name;bone.name='missing-reviewed-bone';expect(()=>applyWardrobe(vrm,'ctrl-anime-female-studio',loaded)).toThrow(/missing/);bone.name=name;
   donor[0].skeleton.boneInverses[0].elements[12]+=.1;expect(()=>applyWardrobe(vrm,'ctrl-anime-female-studio',loaded)).toThrow(/rest skeleton/);expect(signature(vrm)).toEqual(before);loaded.dispose();VRMUtils.deepDispose(vrm.scene);
  });
 }
});
