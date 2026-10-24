import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdir,readFile,stat,symlink,writeFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
const require=createRequire(import.meta.url);
const {build}=require(require.resolve('esbuild',{paths:[require.resolve('vite')]}));
const out=resolve(process.env.CTRL_COZY_PREVIEW_DIR??'/tmp/ctrl-cozy-life-preview');
await mkdir(out,{recursive:true});
for(const name of ['worlds','plaza','assets'])await symlink(resolve('public',name),resolve(out,name),'dir').catch(error=>{if(error.code!=='EEXIST')throw error;});
// REAL route components; only next/dynamic's browser loading wrapper is replaced.
// No fake progression, storage fixture, action interception, or server success.
await build({
 define:{'process.env.NEXT_PUBLIC_CTRL_MODULAR_COLLECTIONS':JSON.stringify('disabled')},
 stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Habitat from './features/habitat/habitat-test';import World from './features/worldgacha/app';document.documentElement.dataset.cozySourcePreview='true';createRoot(document.getElementById('root')).render(location.pathname==='/public-world'?<World/>:<Habitat/>);`,resolveDir:process.cwd(),sourcefile:'cozy-life-preview.jsx',loader:'jsx'},
 outfile:resolve(out,'cozy-life-preview.js'),jsx:'automatic',bundle:true,format:'esm',platform:'browser',logLevel:'warning',
 plugins:[{name:'source-only-next-dynamic',setup(builder){builder.onResolve({filter:/^next\/dynamic$/},()=>({path:'next-dynamic',namespace:'preview'}));builder.onLoad({filter:/.*/,namespace:'preview'},()=>({contents:"import React,{lazy,Suspense} from 'react';export default function dynamic(loader){const C=lazy(loader);return function Dynamic(props){return React.createElement(Suspense,{fallback:null},React.createElement(C,props));}}",loader:'js',resolveDir:process.cwd()}));}}],
});
await writeFile(resolve(out,'index.html'),'<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/cozy-life-preview.css"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}*{box-sizing:border-box}</style></head><body><div id="root"></div><script type="module" src="/cozy-life-preview.js"></script></body></html>');
console.log('COZY_LIFE_SOURCE_BUNDLE_PASS',out,'Guest/browser-only fixture. Public World route guard, signed accounts and API persistence NOT tested.');
if(process.argv.includes('--serve')){
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.vrm':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.svg':'image/svg+xml'};
 createServer(async(req,res)=>{
  try{
   const path=decodeURIComponent(new URL(req.url??'/', 'http://localhost').pathname);
   // This source fixture has no accounts or server. Explicit unauthenticated
   // refusal allows the REAL discover client to choose labeled guest storage.
   if(path.startsWith('/api/')){res.writeHead(401,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'WALLET_SESSION_REQUIRED',detail:'Source preview has no authenticated server session.'}));return;}
   const file=resolve(out,['/','/habitat-test','/public-world'].includes(path)?'index.html':'.'+path);
   if(!file.startsWith(out+sep)){res.writeHead(403);res.end();return;}
   const info=await stat(file);if(!info.isFile())throw new Error('Not a file');
   res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
 }).listen(Number(process.env.PORT??3243),'127.0.0.1',()=>console.log(`COZY_LIFE_SOURCE_READY http://127.0.0.1:${process.env.PORT??3243}`));
}
