import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {HAVEN_BUILD_ASSETS} from '../../features/plaza/haven-build-assets';
const require=createRequire(import.meta.url),{build}=require(require.resolve('esbuild',{paths:[require.resolve('vite')]})),sharp=createRequire('/tmp/ctrl-asset-tools/package.json')('sharp');
await build({entryPoints:['scripts/assets/haven-preview.ts'],bundle:true,format:'esm',platform:'browser',outfile:'/tmp/ctrl-furniture-preview/haven-preview.js',logLevel:'warning'});
await writeFile('/tmp/ctrl-furniture-preview/haven-preview.html','<!doctype html><html><body style="margin:0"><script type="module" src="/haven-preview.js"></script></body></html>');
await mkdir('public/plaza/build-kit/haven-cozy/thumbs',{recursive:true});await mkdir('test-results/new-furniture',{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const results=[];try{
const p=await browser.newPage({viewport:{width:384,height:384}}),errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:3242/haven-preview.html');await p.waitForFunction(()=>typeof (window as any).renderFurniture==='function');
for(const asset of HAVEN_BUILD_ASSETS){
 const result=await p.evaluate(async(url)=>await (window as any).renderFurniture(url),asset.url);assert(result.meshes>0);assert(result.triangles>0);
 const bytes=await p.locator('canvas').screenshot();await sharp(bytes).resize(256,256).webp({quality:88}).toFile('public'+asset.thumbnailUrl);
 results.push({id:asset.id,...result});console.log('RENDERED_NEW_MODEL',asset.id,result.triangles);
}
assert.deepEqual(errors,[]);await writeFile('test-results/new-furniture/model-renders.json',JSON.stringify({models:results,errors},null,2));
// Contact sheet consists only of our renders of the CC0 models, not website previews.
const composite=[];for(let i=0;i<HAVEN_BUILD_ASSETS.length;i++){const a=HAVEN_BUILD_ASSETS[i];composite.push({input:await readFile('public'+a.thumbnailUrl),left:(i%4)*256,top:Math.floor(i/4)*290});const svg=`<svg width="256" height="34"><rect width="256" height="34" fill="#f1ebdc"/><text x="8" y="20" fill="#354735" font-size="13" font-family="sans-serif">${a.name}</text></svg>`;composite.push({input:Buffer.from(svg),left:(i%4)*256,top:Math.floor(i/4)*290+256});}
await sharp({create:{width:1024,height:Math.ceil(HAVEN_BUILD_ASSETS.length/4)*290,channels:3,background:'#f1ebdc'}}).composite(composite).jpeg({quality:90}).toFile('test-results/new-furniture/ctrl-new-furniture.jpg');
}finally{await browser.close();}
console.log('NEW_FURNITURE_RENDER_PASS',results.length);
