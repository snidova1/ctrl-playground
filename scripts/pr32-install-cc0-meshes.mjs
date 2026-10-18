/**
 * PR32: materialize independently authored textured CC0 GLBs.
 * GitHub Actions has network access; the local ChatGPT runner does not.
 * No secret/token or account required to download these assets.
 *
 * Run: node scripts/pr32-install-cc0-meshes.mjs
 * Source: https://grab3d.com/developers/ (static API v1)
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const SOURCE='https://grab3d.com';
const OUTPUT=path.resolve('public/assets/pr32');
const MODELS=[
 'bakery','cottage-house','farmhouse','flower-shop','garden-shed',
 'log-cabin','cafe','willow-tree',
 'oak-tree','cherry-blossom-tree','bush','daisy-patch',
];
const MAX_BYTES=5_000_000;
const REQUIRED_ORIGIN='procedural';
const TIMEOUT_MS=40000;

async function fetchChecked(url){
 const u=new URL(url);
 if(u.origin!==SOURCE)throw Error('Third-party or redirected URL not allowlisted: '+url);
 const ctrl=new AbortController();
 const timeout=setTimeout(()=>ctrl.abort(),TIMEOUT_MS);
 try{
  // This provider publishes static files with access-control allow-origin '*'.
  const res=await fetch(url,{signal:ctrl.signal,redirect:'error',headers:{accept:'application/json,model/gltf-binary,*/*'}});
  if(!res.ok)throw Error('HTTP '+res.status+': '+url);
  return res;
 }finally{clearTimeout(timeout);}
}
const downloaded=[];
await mkdir(OUTPUT,{recursive:true});
for(const slug of MODELS){
 const metadata=await (await fetchChecked(SOURCE+'/api/v1/models/'+slug+'.json')).json();
 if(metadata.slug!==slug||metadata.license!=='CC0-1.0')
  throw Error('Reject model missing explicit CC0-1.0: '+slug);
 if(metadata.origin?.method!==REQUIRED_ORIGIN||metadata.origin?.aiContent!==false)
  throw Error('Reject generated base mesh or unclear origin: '+slug);
 if(metadata.tier!=='lightweight'||!metadata.specs?.dimensionsMeters)
  throw Error('Missing lightweight meter dimensions: '+slug);
 const candidates=metadata.files.filter(f=>f.format==='glb'&&f.bytes>32&&f.bytes<MAX_BYTES);
 const file=candidates.find(f=>f.variant==='light')??candidates.find(f=>f.variant==='full');
 if(!file)throw Error('No lightweight-compatible GLB: '+slug);
 const source=new URL(file.url);
 if(source.origin!==SOURCE||!source.pathname.startsWith('/dl/'+slug+'/')||!source.pathname.endsWith('.glb'))
  throw Error('Unexpected download source: '+file.url);
 const response=await fetchChecked(source.toString());
 const data=Buffer.from(await response.arrayBuffer());
 if(data.length!==file.bytes||data.toString('ascii',0,4)!=='glTF')
  throw Error('Invalid GLB magic or size: '+slug);
 const sha256=createHash('sha256').update(data).digest('hex');
 await writeFile(path.join(OUTPUT,slug+'.glb'),data);
 downloaded.push({
  slug,file:slug+'.glb',bytes:data.length,sha256,
  dimensionsMeters:metadata.specs.dimensionsMeters,triangles:metadata.specs.triangles,
  license:'CC0-1.0',origin:metadata.origin.method,aiContent:false,
  source:metadata.page,download:source.toString(),
 });
 console.log('Verified CC0 mesh:',slug,data.length,sha256.slice(0,14));
}
await writeFile(path.join(OUTPUT,'manifest.json'),JSON.stringify({
 source:'Grab3D static JSON API v1', license:'CC0-1.0',models:downloaded,
},null,2)+'\n');
console.log('Verified and staged',downloaded.length,'independent textured GLB assets');
