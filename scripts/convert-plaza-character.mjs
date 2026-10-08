// Source: Quaternius Ultimate Animated Character Pack, Worker_Female.fbx (CC0).
// Usage: node scripts/convert-plaza-character.mjs /absolute/path/Worker_Female.fbx
import {readFileSync,writeFileSync} from 'node:fs';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {mergeGroups} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {MeshStandardMaterial} from 'three';
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.();});}
};
if(!process.argv[2])throw Error('Provide the downloaded CC0 Worker_Female.fbx source path.');
const bytes=readFileSync(process.argv[2]);
const scene=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const colors={Skin:'#e3ac8b',Shirt:'#e56a31',Vest:'#f08644',Pants:'#cf602c',Hat:'#db742e',Face:'#f7f5eb',Hair:'#483728'};
scene.traverse(object=>{
  if(!object.isMesh)return;
  // The source mesh and a skeleton bone are both named Body. Animation tracks
  // must bind to the bone; a duplicate mesh name corrupts scale on glTF export.
  object.name='WorkerMesh';
  mergeGroups(object.geometry);
  const old=Array.isArray(object.material)?object.material:[object.material];
  object.material=old.map(m=>new MeshStandardMaterial({name:m.name,color:colors[m.name]??'#80684c',roughness:.85}));
});
const keep=['Idle','Walk','SitDown','PickUp','Victory'];
const animations=scene.animations.filter(a=>keep.some(name=>a.name.endsWith(`|${name}`)));
const glb=await new GLTFExporter().parseAsync(scene,{binary:true,animations});
writeFileSync('public/plaza/models/worker.glb',Buffer.from(glb));
console.log(`Saved animated worker: ${glb.byteLength} bytes; ${animations.length} clips.`);
