import {createRequire} from 'node:module';
import {mkdir,rm,writeFile,readFile,readdir,rename} from 'node:fs/promises';
import {resolve,basename} from 'node:path';import {gzipSync} from 'node:zlib';
const require=createRequire((process.env.CTRL_WORLD_TOOLS_DIR||'/tmp/ctrl-world-tools')+'/package.json');const {build}=require('esbuild');
const out=resolve('public/worlds/neighborhood/app'),staging=resolve(`public/worlds/neighborhood/.build-${process.pid}-${Date.now()}`);await mkdir(out,{recursive:true});await mkdir(staging,{recursive:true});
try{
 const result=await build({stdin:{contents:"import {createElement} from 'react';import {createRoot} from 'react-dom/client';import App from './features/worldgacha/app';createRoot(document.getElementById('world-root')).render(createElement(App));",resolveDir:process.cwd(),sourcefile:'preview-entry.tsx',loader:'tsx'},outdir:staging,entryNames:'play-[hash]',chunkNames:'chunk-[hash]',bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',jsx:'automatic',minify:true,legalComments:'linked',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'standalone-preview-only',setup(build){build.onResolve({filter:/^next\/dynamic$/},()=>({path:resolve('scripts/world/preview-dynamic.mjs')}));}}],metafile:true});
 if(result.warnings.length)throw new Error('Preview build warnings: '+result.warnings.map(w=>w.text).join('; '));
 const entry=Object.entries(result.metafile.outputs).find(([name])=>/^play-.*\.js$/.test(basename(name)));if(!entry)throw new Error('Missing hashed preview entry');
 const js=basename(entry[0]),css=entry[1].cssBundle?basename(entry[1].cssBundle):null;let total=0;
 for(const name of await readdir(staging)){if(!/\.(js|css)$/.test(name))continue;const bytes=await readFile(staging+'/'+name);await writeFile(staging+'/'+name+'.gz',gzipSync(bytes,{level:9}));total+=bytes.length;}
 // Publish immutable chunks FIRST. Keep old chunks so already-open clients never lose lazy imports.
 for(const name of await readdir(staging))await rename(staging+'/'+name,out+'/'+name);
 const html='<!doctype html><html lang="en" data-build="'+js+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#c4d0b4"><title>Willow Common · CTRL</title>'+(css?'<link rel="stylesheet" href="/worlds/neighborhood/app/'+css+'">':'')+'</head><body style="margin:0"><div id="world-root"></div><script type="module" src="/worlds/neighborhood/app/'+js+'"></script></body></html>';
 const htmlPath=resolve('public/worlds/neighborhood/play.html'),next=htmlPath+'.next-'+process.pid;await writeFile(next,html);await rename(next,htmlPath);
 console.log('Atomic production preview built:',js,Object.keys(result.metafile.outputs).length,'outputs,',total,'uncompressed JS/CSS bytes. Old clients retain their chunks.');
}finally{await rm(staging,{recursive:true,force:true});}
