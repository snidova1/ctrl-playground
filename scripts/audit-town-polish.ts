import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BUILD_ASSETS} from '../features/plaza/build-assets';
import {TOWN_PLANTING_MODELS} from '../features/habitat/town-planting-models';
import {makeActivityCounter} from '../features/habitat/town-activity-counter';
import {makeTownRoof,type TownRoofKind} from '../features/habitat/town-roof';

const ids=[...new Set(Object.values(TOWN_PLANTING_MODELS).flat())];
const models=ids.map(id=>{
 const asset=BUILD_ASSETS.find(a=>a.id===id);if(!asset)throw Error('Uninstalled model: '+id);
 const path='public'+asset.url,bytes=readFileSync(path);
 if(bytes.readUInt32LE(0)!==0x46546c67)throw Error('Invalid GLB: '+path);
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 const primitives=gltf.meshes.flatMap((m:{primitives:unknown[]})=>m.primitives);
 const triangles=primitives.reduce((sum:number,p:{mode?:number;indices?:number;attributes:{POSITION:number}})=>{
  if((p.mode??4)!==4)throw Error('Non-triangle primitive: '+id);
  return sum+gltf.accessors[p.indices??p.attributes.POSITION].count/3;
 },0);
 return {id,path,bytes:statSync(path).size,sha256:createHash('sha256').update(bytes).digest('hex'),
  triangles,meshPrimitives:primitives.length,materials:gltf.materials?.length??0,textures:gltf.textures?.length??0,
  bounds:asset.bounds,source:'https://kenney.nl/assets/nature-kit',license:'CC0-1.0',creator:'Kenney',
  installation:'existing local GLB; newly curated visible use, not a new downloaded pack',
  scale:'largest axis normalized to the existing placement size',lod:'instanced per model; existing district culling and quality selection',
  destinations:Object.entries(TOWN_PLANTING_MODELS).filter(([,models])=>models.includes(id)).map(([d])=>d)};
});
const roofs=(['hip','gambrel','clerestory'] as TownRoofKind[]).map(kind=>{
 const geometry=makeTownRoof(7,6,1.6,kind);const triangles=geometry.getAttribute('position').count/3;geometry.dispose();
 return {kind,source:'CTRL original authored geometry',triangles,materials:2,additionalModelDownloadBytes:0,
  footprint:'Existing solid building + existing 0.35m eave; no door/collision/location changes',
  destinations:'town-architecture.tsx and batched town-region-architecture.tsx'};
});
const counterParts=makeActivityCounter();
const activityCounter={source:'CTRL original authored joinery',meshPrimitives:counterParts.length,triangles:counterParts.reduce((n,g)=>n+g.getAttribute('position').count/3,0),footprint:[1.8,1.3],additionalModelDownloadBytes:0};counterParts.forEach(g=>g.dispose());
const manifest={version:1,verifiedDate:'2026-10-16',baseline:'599624b8c29f94800fd2024d95a3190dc4b54c52',
 scope:'Selective authored roofs/facades, curated bundled planting, six room wall finishes; gameplay and saved layouts retained',
 counts:{curatedModels:models.length,newDownloadedModels:0,uniqueLocalModelBytes:models.reduce((s,m)=>s+m.bytes,0)},
 activityCounter,modelStatsAre:'source GLB metrics, not measured device FPS or whole-scene draw calls',models,roofs,
 replacements:[{from:'nature-kit/tree_detailed repeated everywhere',to:'TOWN_PLANTING_MODELS district-specific buckets',collision:'unchanged shared tree centers and solid footprints'},
  {from:'uniform gable roofs',to:'original hip/gambrel/clerestory roof volumes and district facade details',collision:'unchanged authoritative buildings'},
  {from:'plain activity-station box',to:'original batched wood counter; orchard fruit requires a real persisted usedAt receipt',collision:'unchanged solid station footprint'},
  {from:'same cream finish in six public rooms',to:'six cloned wall finishes; existing glass/materials/furniture/seat/lamp IDs retained',newDrawCalls:0}],
 externalCandidates:[{source:'https://quaternius.com/packs/ultimatestylizednature.html',license:'CC0-1.0',status:'not imported',
  evidence:'Official public glTF BirchTree_2 download returned Google Drive quota-exceeded HTML on 2026-10-16; rejected as model bytes'},
  {source:'https://quaternius.com/packs/ultimatetexturedbuildings.html',license:'CC0-1.0',status:'not imported; FBX/OBJ/Blend conversion required'},
  {source:'https://tools.oyasumi-gamedev.com/worldgacha/',status:'P2 pilot attempted in browser with 2km / 256 grid / 300m near view / seed 301610 / low+light display; WebGL context creation failed (GL_RENDERER Disabled), repeated once after reload; no generation, recipe or model export claimed'},
  {source:'https://polyhaven.com/',status:'No material/HDRI imported; existing authored stylized materials retained'}],
 remaining:'Broader hero furniture and activity-prop breadth, independently owned 16-character imports, WorldGacha pilot, physical phone GPU and full reference-stack visual acceptance remain unverified'};
mkdirSync('docs/assets',{recursive:true});writeFileSync('docs/assets/CTRL_TOWN_POLISH_MANIFEST.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest.counts));
