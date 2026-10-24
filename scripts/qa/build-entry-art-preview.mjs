import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile,cp,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{build}=require(require.resolve('esbuild',{paths:[require.resolve('vite')]}));
const out=resolve(process.env.CTRL_ENTRY_PREVIEW_DIR??'/tmp/ctrl-entry-art-preview'),assets=resolve(out,'public');await mkdir(assets,{recursive:true});
// Pin the actual models used by this source revision. Older staging lacks these paths.
await cp(resolve('public/plaza/build-kit'),resolve(assets,'plaza/build-kit'),{recursive:true,filter:async source=>(await stat(source)).isDirectory()||/\.(glb|gltf|png|jpe?g|webp|bin|ktx2|txt|md)$/i.test(source)});
for(const path of ['plaza/characters/humanoid-motions.glb','plaza/characters/airi-reference/avatar-sample-a-mobile.vrm']){await mkdir(resolve(assets,path,'..'),{recursive:true});await cp(resolve('public',path),resolve(assets,path));}
await build({
 define:{'process.env.NEXT_PUBLIC_CTRL_MODULAR_COLLECTIONS':JSON.stringify('disabled')},
 stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import Habitat from './features/habitat/habitat-test';document.documentElement.dataset.entryArtPreview='true';createRoot(document.getElementById('root')).render(<Habitat/>);",resolveDir:process.cwd(),sourcefile:'entry-art-preview.jsx',loader:'jsx'},
 outfile:resolve(assets,'entry-art-preview.js'),jsx:'automatic',bundle:true,format:'esm',platform:'browser',minify:true,logLevel:'warning',
 plugins:[{name:'source-next-dynamic-wrapper',setup(b){b.onResolve({filter:/^next\/dynamic$/},()=>({path:'next-dynamic',namespace:'preview'}));b.onLoad({filter:/.*/,namespace:'preview'},()=>({contents:"import React,{lazy,Suspense} from 'react';export default function dynamic(loader){const C=lazy(loader);return function Dynamic(props){return React.createElement(Suspense,{fallback:null},React.createElement(C,props));}}",loader:'js',resolveDir:process.cwd()}));}}],
});
await build({entryPoints:['features/habitat/house-door-audio.ts'],outfile:resolve(assets,'entry-door-audio.js'),bundle:true,format:'esm',platform:'browser',logLevel:'warning'});
await writeFile(resolve(assets,'index.html'),'<!doctype html><html lang="id"><head><title>CTRL · House entry visual target</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/entry-art-preview.css"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}*{box-sizing:border-box}</style></head><body><div id="root"></div><script type="module" src="/entry-art-preview.js"></script></body></html>');
await writeFile(resolve(out,'worker.mjs'),`// Isolated anonymous source preview. No D1, wallet auth, sessions or API proxy.
export default{async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/'))return Response.json({code:'WALLET_SESSION_REQUIRED',detail:'Anonymous art reference: browser-only progress, no account session.'},{status:401});
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(['/public-world','/habitat'].includes(url.pathname))return Response.redirect('https://ctrl-staging.suhiro211.workers.dev'+url.pathname,302);
 if(['/','/habitat-test'].includes(url.pathname))url.pathname='/index.html';
 return env.ASSETS.fetch(new Request(url,request));
}};`);
const config={name:'ctrl-entry-preview',main:'worker.mjs',compatibility_date:'2026-01-01',workers_dev:true,assets:{directory:'public',binding:'ASSETS',run_worker_first:true,html_handling:'none'}};
await writeFile(resolve(out,'wrangler.json'),JSON.stringify(config,null,2));
const hash=createHash('sha256').update(await readFile(resolve(assets,'entry-art-preview.js'))).digest('hex');await writeFile(resolve(assets,'entry-build.json'),JSON.stringify({kind:'anonymous-source-art-target',bundleSha256:hash,source:'features/habitat/habitat-test.tsx',accountBackend:false},null,2));
console.log('ENTRY_PREVIEW_BUILD_PASS',out,'bundleSha256='+hash);
