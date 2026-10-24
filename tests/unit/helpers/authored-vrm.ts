import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils,type VRM} from '@pixiv/three-vrm';

/** Actual shipped vertices, indices, skin weights and bones; shader/image data only
 * is removed from an in-memory copy to run without DOM/GPU. Never edits assets. */
export async function headlessAuthoredVrm(path:string):Promise<VRM>{
 const data=readFileSync(`public${path}`),oldLength=data.readUInt32LE(12);
 const doc=JSON.parse(data.subarray(20,20+oldLength).toString());
 doc.materials=doc.materials.map((m:{name?:string})=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],roughnessFactor:1,metallicFactor:0}}));
 if(doc.extensions?.VRM)doc.extensions.VRM.materialProperties=doc.materials.map((m:{name?:string})=>({name:m.name,shader:'VRM_USE_GLTFSHADER',renderQueue:2000,floatProperties:{},vectorProperties:{},textureProperties:{},keywordMap:{},tagMap:{}}));
 delete doc.images;delete doc.textures;delete doc.samplers;
 const json=Buffer.from(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4,bin=data.subarray(20+oldLength),out=Buffer.alloc(20+length+bin.length,32);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);bin.copy(out,20+length);
 const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
 const result=await loader.parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.length),'');
 const vrm=result.userData.vrm as VRM;VRMUtils.removeUnnecessaryVertices(vrm.scene);VRMUtils.combineSkeletons(vrm.scene);VRMUtils.combineMorphs(vrm);VRMUtils.rotateVRM0(vrm);vrm.scene.updateMatrixWorld(true);return vrm;
}
