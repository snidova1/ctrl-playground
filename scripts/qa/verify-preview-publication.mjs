import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdir,writeFile} from 'node:fs/promises';
const root=process.env.CTRL_PREVIEW_URL||'http://localhost:3054/world-preview';
const text=async url=>{const r=await fetch(url);assert.equal(r.status,200,'missing published asset '+url);return r.text();};
const html=await text(root),entry=html.match(/<script[^>]+src="([^"]+)"/)[1],css=html.match(/<link[^>]+href="([^"]+)"/)[1];
const assets=new Map();async function crawl(url){if(assets.has(url))return;const source=await text(url);assets.set(url,source);for(const m of source.matchAll(/(?:from\s*|import\s*\()\s*["'](\.\/[^"']+\.js)["']/g))await crawl(new URL(m[1],url).href);}
await crawl(new URL(entry,root).href);const stylesheet=await text(new URL(css,root));assert(stylesheet.includes('.wg-pad'));assert(!stylesheet.includes('[truncated]'),'CSS must be complete, not a truncated tool preview');
let samples=0;const job=spawn(process.execPath,['scripts/world/build-preview.mjs'],{stdio:'inherit'});let done=false;const exit=new Promise((resolve,reject)=>{job.on('error',reject);job.on('exit',code=>{done=true;resolve(code);});});
while(!done){await text(root);await text(new URL(entry,root));samples++;await new Promise(r=>setTimeout(r,30));}
assert.equal(await exit,0);for(const url of assets.keys())await text(url);await text(new URL(css,root));
const report={success:true,oldEntry:entry,retainedModuleCount:assets.size,concurrentSamples:samples};await mkdir('test-results/neighborhood',{recursive:true});await writeFile('test-results/neighborhood/preview-publication.json',JSON.stringify(report,null,2));console.log('PASS atomic preview rebuild keeps cached clients and lazy chunks valid',JSON.stringify(report));
