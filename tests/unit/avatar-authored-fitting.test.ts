import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {AnimationMixer,Box3,Group,Mesh,SkinnedMesh,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils,type VRM} from '@pixiv/three-vrm';
import {applyCharacterAccessories,clearCharacterAccessories} from '@/features/plaza/characters/accessories';
import {availableAuthoredLooks,defaultAppearance,resolveCharacter} from '@/features/plaza/characters/catalog';
import {retargetHumanoid} from '@/features/plaza/characters/retarget';

interface GeometryDocument {
 materials:Array<{name?:string;pbrMetallicRoughness?:unknown}>;
 extensions?:{VRM?:{materialProperties:unknown[]}};
 images?:unknown;textures?:unknown;samplers?:unknown;
}
/** Parse real shipped mesh/skin/rig data in Node. Only textures/material shaders are
 * removed from an in-memory GLB copy so no DOM, GPU, network or authored file edit
 * is needed. This is geometric clearance coverage, NOT a screenshot acceptance. */
async function headlessVrm(path:string):Promise<VRM>{
 const data=readFileSync(`public${path}`),oldLength=data.readUInt32LE(12);
 const doc=JSON.parse(data.subarray(20,20+oldLength).toString()) as GeometryDocument;
 doc.materials=doc.materials.map(m=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],roughnessFactor:1,metallicFactor:0}}));
 if(doc.extensions?.VRM)doc.extensions.VRM.materialProperties=doc.materials.map(m=>({name:m.name,shader:'VRM_USE_GLTFSHADER',renderQueue:2000,floatProperties:{},vectorProperties:{},textureProperties:{},keywordMap:{},tagMap:{}}));
 delete doc.images;delete doc.textures;delete doc.samplers;
 const json=Buffer.from(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4,bin=data.subarray(20+oldLength),out=Buffer.alloc(20+length+bin.length,32);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);bin.copy(out,20+length);
 const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
 const result=await loader.parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.length),'');
 const vrm=result.userData.vrm as VRM;VRMUtils.rotateVRM0(vrm);vrm.scene.updateMatrixWorld(true);return vrm;
}
function accessoryMeshes(vrm:VRM){
 const found:Mesh[]=[];vrm.scene.traverse(o=>{if(o instanceof Group&&o.userData.ctrlAccessory)o.traverse(child=>{if(child instanceof Mesh)found.push(child);});});return found;
}
function clothAndHairFronts(vrm:VRM){
 const chest=vrm.humanoid.getNormalizedBoneNode('chest')!.getWorldPosition(new Vector3());
 const head=vrm.humanoid.getNormalizedBoneNode('head')!.getWorldPosition(new Vector3());
 let bag=-Infinity,hair=-Infinity;
 vrm.scene.traverse(o=>{
  if(!(o instanceof Mesh))return;if(o instanceof SkinnedMesh)o.skeleton.update();
  const names=(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.name).join(',');
  const cloth=/CLOTH/i.test(names),hairstyle=/HAIR/i.test(names);if(!cloth&&!hairstyle)return;
  for(let i=0;i<o.geometry.attributes.position.count;i++){
   const v=o.getVertexPosition(i,new Vector3()).applyMatrix4(o.matrixWorld);
   const c=v.clone().sub(chest),h=v.clone().sub(head);
   if(cloth&&Math.abs(c.x-.105)<.08&&c.y<-.20&&c.y>-.38)bag=Math.max(bag,c.z);
   if(hairstyle&&Math.abs(h.x)>.12&&Math.abs(h.x)<.17&&h.y<0&&h.y>-.1)hair=Math.max(hair,h.z);
  }
 });return {chest,head,bag,hair};
}
const motionData=readFileSync('public/plaza/characters/humanoid-motions.glb');

describe('accessory clearance against actual accepted VRM surfaces and motion',()=>{
 for(const gender of ['female','male'] as const)for(const {id:lookId} of availableAuthoredLooks(gender)){
  it(`${gender}/${lookId}: retired pendant stays absent; earrings and bag clear real surfaces and sampled hands`,async()=>{
   const appearance={...defaultAppearance,gender,lookId};
   const vrm=await headlessVrm(resolveCharacter(appearance).assets.low);
   try{
    if(lookId==='airi'||lookId==='airi-b'){
     applyCharacterAccessories(vrm,{...appearance,headwearId:'beret',eyewearId:'round',earringId:'drops',neckwearId:'scarf',backwearId:'satchel'});
     expect(accessoryMeshes(vrm),'unfitted legacy overlays must never be added to complete presets').toHaveLength(0);
     expect(vrm.scene.userData.ctrlAccessoryCount).toBe(0);
     return;
    }
    const surface=clothAndHairFronts(vrm);
    expect(Number.isFinite(surface.bag)).toBe(true);
    applyCharacterAccessories(vrm,{...appearance,neckwearId:'pendant'});vrm.scene.updateMatrixWorld(true);
    expect(accessoryMeshes(vrm)).toHaveLength(0);
    expect(vrm.scene.userData.ctrlAccessoryCount).toBe(0);
    applyCharacterAccessories(vrm,{...appearance,earringId:'drops'});vrm.scene.updateMatrixWorld(true);
    if(Number.isFinite(surface.hair)){
     const ornament=new Box3();accessoryMeshes(vrm).filter(o=>o.geometry.type!=='TubeGeometry').forEach(o=>ornament.union(new Box3().setFromObject(o)));
     expect(ornament.min.z-surface.head.z-surface.hair).toBeGreaterThan(.008);
    }
    applyCharacterAccessories(vrm,{...appearance,backwearId:'satchel'});vrm.scene.updateMatrixWorld(true);
    const bag=accessoryMeshes(vrm)[0],back=new Box3().setFromObject(bag).min.z-surface.chest.z;
    expect(back-surface.bag).toBeGreaterThan(.003);
    expect(back-surface.bag).toBeLessThan(.035);
    const motion=await new GLTFLoader().parseAsync(motionData.buffer.slice(motionData.byteOffset,motionData.byteOffset+motionData.length),'');
    const mixer=new AnimationMixer(vrm.scene),clips=retargetHumanoid(motion,vrm);
    for(const name of ['Idle','Walk','Interact']){
     const clip=clips.find(c=>c.name===name)!;mixer.stopAllAction();mixer.clipAction(clip).reset().play();
     for(const fraction of [0,.2,.4,.6,.8]){
      mixer.setTime(clip.duration*fraction);vrm.update(0);vrm.scene.updateMatrixWorld(true);
      const bounds=new Box3().setFromObject(bag);
      for(const hand of ['leftHand','rightHand'] as const){
       const point=vrm.humanoid.getRawBoneNode(hand)!.getWorldPosition(new Vector3());
       expect(bounds.distanceToPoint(point),`${name}@${fraction}/${hand}`).toBeGreaterThan(.035);
      }
     }
    }
    mixer.stopAllAction();mixer.uncacheRoot(vrm.scene);
   }finally{clearCharacterAccessories(vrm);VRMUtils.deepDispose(vrm.scene);}
  });
 }
});
