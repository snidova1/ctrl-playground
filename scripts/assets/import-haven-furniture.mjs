// Poly Haven CC0 models, public files API. No preview renders are redistributed.
import {NodeIO} from '/tmp/ctrl-asset-tools/node_modules/@gltf-transform/core/dist/index.js';
import {ALL_EXTENSIONS} from '/tmp/ctrl-asset-tools/node_modules/@gltf-transform/extensions/dist/index.js';
import {dedup,prune,weld,simplify,getBounds} from '/tmp/ctrl-asset-tools/node_modules/@gltf-transform/functions/dist/index.js';
import {MeshoptSimplifier} from '/tmp/ctrl-asset-tools/node_modules/meshoptimizer/index.js';
import {createRequire} from 'node:module';
const sharp=createRequire('/tmp/ctrl-asset-tools/package.json')('sharp');
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
const items=[
 ['sofa_03','Willow carved sofa','indoor'],['sofa_02','Tufted velvet sofa','indoor'],
 ['mid_century_lounge_chair','Walnut lounge chair','indoor'],['modern_arm_chair_01','Timber armchair','indoor'],
 ['modern_coffee_table_01','Inlaid coffee table','indoor'],['modern_wooden_cabinet','Slatted oak sideboard','indoor'],
 ['chinese_cabinet','Carved display cabinet','indoor'],['chinese_tea_table','Carved tea table','indoor'],
 ['vintage_day_bed','Floral reading daybed','indoor'],['vintage_oil_lamp','Porcelain floral lamp','indoor'],
 ['Rockingchair_01','Woodland rocking chair','indoor'],['round_wooden_table_01','Round walnut dining table','indoor'],
 ['painted_wooden_bench','Rustic garden bench','outdoor'],['outdoor_table_chair_set_01','Terrace bistro set','outdoor'],
 ['wooden_picnic_table','Woodland picnic table','outdoor'],['planter_box_01','Cedar garden trough','outdoor'],
 ['planter_box_03','Raised herb planter','outdoor'],['watering_can_metal_01','Galvanized watering can','outdoor'],
 ['potted_plant_01','Terracotta leafy tree','outdoor'],['potted_plant_02','Glazed heartleaf planter','indoor'],
 ['potted_plant_04','Ceramic aloe planter','outdoor'],
];
const root='public/plaza/build-kit/haven-cozy',cache='/tmp/ctrl-haven-source';
await mkdir(root,{recursive:true});await mkdir(cache,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
async function fetchBytes(url){for(let n=0;n<3;n++){try{const r=await fetch(url,{headers:{'User-Agent':'CTRL habitat asset import (local development)'},signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(`${r.status} ${url}`);return new Uint8Array(await r.arrayBuffer());}catch(e){if(n===2)throw e;}}}
async function json(url){return JSON.parse(new TextDecoder().decode(await fetchBytes(url)));}
async function cached(url,path){try{return new Uint8Array(await readFile(path));}catch{const b=await fetchBytes(url);await mkdir(dirname(path),{recursive:true});await writeFile(path,b);return b;}}
const manifest=[],provenance=[];
for(const [id,name,setting] of items){
 const meta=await json(`https://api.polyhaven.com/info/${id}`),files=await json(`https://api.polyhaven.com/files/${id}`);
 const spec=files.gltf?.['1k']?.gltf;if(!spec)throw new Error(`No gltf: ${id}`);
 const folder=join(cache,id),path=join(folder,'model.gltf');await cached(spec.url,path);
 for(const [rel,file] of Object.entries(spec.include))await cached(file.url,join(folder,rel));
 const doc=await io.read(path);
 for(const tex of doc.getRoot().listTextures()){
  if(!tex.getImage())continue;
  const img=sharp(tex.getImage()),metadata=await img.metadata();
  const resized=img.resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true});
  const alpha=metadata.hasAlpha;
  tex.setImage(new Uint8Array(await (alpha?resized.png({compressionLevel:9}):resized.jpeg({quality:85})).toBuffer())).setMimeType(alpha?'image/png':'image/jpeg').setURI('');
 }
 await doc.transform(dedup(),prune(),weld());
 function triangles(){let n=0;for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())n+=(p.getIndices()?.getCount()??p.getAttribute('POSITION')?.getCount()??0)/3;return n;}
 const before=triangles();if(before>22000)await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:22000/before,error:.01,lockBorder:false}),prune());
 const scene=doc.getRoot().listScenes()[0],box=getBounds(scene),bounds=box.max.map((v,i)=>Number((v-box.min[i]).toFixed(6))),center=box.max.map((v,i)=>Number(((v+box.min[i])/2).toFixed(6)));
 if(bounds.some(v=>!Number.isFinite(v)||v<=0)||Math.max(...bounds)>8)throw new Error(`Unexpected bounds ${id}: ${bounds}`);
 const out=join(root,id+'.glb');await io.write(out,doc);const bytes=(await stat(out)).size;
 const asset={id:'haven-cozy/'+id,name,category:id.includes('potted_plant')?'nature':'furniture',url:'/plaza/build-kit/haven-cozy/'+id+'.glb',thumbnailUrl:'/plaza/build-kit/haven-cozy/thumbs/'+id+'.webp',bounds,center,groundOffset:Number((-box.min[1]).toFixed(6)),collision:'solid',sourcePack:'haven-cozy',bytes,animationClips:[]};
 manifest.push(asset);provenance.push({id:asset.id,sourceId:id,name,setting,license:'CC0-1.0',source:'https://polyhaven.com/a/'+id,licenseUrl:'https://polyhaven.com/license',authors:meta.authors,originalGltf:spec.url,sourceFiles:spec.include,trianglesBefore:before,trianglesAfter:triangles(),bytes,bounds});
 console.log('IMPORTED',id,bounds,bytes,Math.round(triangles())+' triangles');
}
await writeFile('features/plaza/haven-build-assets.ts',`import type {BuildAsset} from './build-assets';\n/** New textured Poly Haven CC0 models. Generated by scripts/assets/import-haven-furniture.mjs. */\nexport const HAVEN_BUILD_ASSETS:readonly BuildAsset[]=${JSON.stringify(manifest,null,2)};\n`);
await writeFile(root+'/provenance.json',JSON.stringify(provenance,null,2));
await writeFile(root+'/LICENSE.txt','Models: Poly Haven and contributors. CC0 1.0 Universal. https://polyhaven.com/license\nSee provenance.json for original asset URLs, authors and source-file metadata.\nThumbnails are renders made by CTRL from the CC0 model assets, not upstream preview images.\n');
console.log('NEW_FURNITURE_IMPORTED',manifest.length,manifest.reduce((n,a)=>n+a.bytes,0));
