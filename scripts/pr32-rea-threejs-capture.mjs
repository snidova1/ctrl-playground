/**
 * Run a reproducible, read-only REA observation of official open-source
 * three.js browser examples in a dedicated CI sandbox.
 *
 * Browser DevTools protocol is localhost-only. No user login, wallet, API
 * key or repo credential enters the page. REA captures observable evidence;
 * findings are not reverse-engineered source code or approval to copy art.
 *
 * This script is CI-only: GitHub setup-node v24 meets REA v6's engine floor.
 */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const exec=promisify(execFile);
const port=9222,endpoint='http://127.0.0.1:'+port;
const out=path.resolve('test-results/pr32-threejs-rea');
const demos=[
 {id:'toon',url:'https://threejs.org/examples/webgl_materials_toon.html',sources:true},
 {id:'sky',url:'https://threejs.org/examples/webgl_shaders_sky.html',sources:false},
 {id:'gtao',url:'https://threejs.org/examples/webgl_postprocessing_gtao.html',sources:false},
];
function selectedTarget(targets,url){
 const match=targets.find(t=>t.type==='page'&&t.url.startsWith(url));
 if(!match?.id)throw Error('Chrome CDP target not found for '+url);
 return match.id;
}
async function getTargets(){
 const response=await fetch(endpoint+'/json/list',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('CDP /json/list: HTTP '+response.status);
 return response.json();
}
async function reaInspect(target,demo){
 const args=['-y','rea-agents@6.5.0','inspect-web-page',endpoint,target,
  '--observation-ms','1000',...(demo.sources?['--include-script-sources']:[]),'--json'];
 const {stdout,stderr}=await exec('npx',args,{timeout:180000,maxBuffer:36*1024*1024});
 if(stderr)await writeFile(path.join(out,demo.id+'-rea-stderr.txt'),stderr);
 const parsed=JSON.parse(stdout);
 await writeFile(path.join(out,demo.id+'-rea-evidence.json'),JSON.stringify(parsed));
 return parsed;
}
await mkdir(out,{recursive:true});
const browser=await chromium.launch({
 headless:true,args:['--remote-debugging-address=127.0.0.1',
 '--remote-debugging-port='+port,'--enable-webgl','--use-gl=angle',
 '--use-angle=swiftshader','--no-sandbox']
});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const report=[];
try{
 for(const demo of demos){
  console.log('Inspect official three.js example',demo.url);
  const response=await page.goto(demo.url,{waitUntil:'domcontentloaded',timeout:60000});
  if(!response?.ok())throw Error('Demo unavailable: '+demo.url+' '+response?.status());
  await page.waitForTimeout(1700);
  const target=selectedTarget(await getTargets(),demo.url);
  // REA observation is the primary result; optional screenshot must never
  // fail the research just because costly GTAO stalls software WebGL capture.
  const evidence=await reaInspect(target,demo);
  let screenshotCaptured=false;
  try{
   if(demo.id!=='gtao'){
    await page.screenshot({path:path.join(out,demo.id+'-browser.png'),timeout:12000});
    screenshotCaptured=true;
   }
  }catch(error){
   await writeFile(path.join(out,demo.id+'-screenshot-limitation.txt'),String(error));
  }
  const entry={
   demo:demo.id,origin:new URL(demo.url).origin,url:demo.url,
   reaVersion:'6.5.0',node:process.version,cdp:'localhost',
   observedWithRea:true,consoleCapture:'not-inferred',
   evidenceFile:demo.id+'-rea-evidence.json',
   screenshotFile:screenshotCaptured?demo.id+'-browser.png':null,
   evidenceKeys:Object.keys(evidence),retainedScriptSources:demo.sources,
  };
  report.push(entry);
  console.log('REA evidence saved for',demo.id,entry.evidenceKeys);
 }
 await writeFile(path.join(out,'report.json'),JSON.stringify({
  disclaimer:'These are observed browser captures, not a proof of equivalent game rendering.',
  demoCount:report.length,items:report
 },null,2));
}finally{await browser.close();}
if(report.length!==3)throw Error('Required evidence incomplete');
console.log('Completed three source-backed REA investigations of official Three.js demos.');
