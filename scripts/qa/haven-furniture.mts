import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {HAVEN_BUILD_ASSETS} from '../../features/plaza/haven-build-assets';
import {aimAtValidFloor} from './helpers/furniture-aim';
const origin=process.env.CTRL_QA_ORIGIN??'http://127.0.0.1:3242',dir=`test-results/new-furniture/${origin.includes('127.0.0.1')?'source':'live'}`;await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const errors:string[]=[],checks:string[]=[];
try{
 // Every public GLB must be the exact locally rendered/validated binary, not an HTML fallback.
 for(const a of HAVEN_BUILD_ASSETS){const r=await fetch(origin+a.url);assert(r.ok,`${r.status} ${a.url}`);const bytes=Buffer.from(await r.arrayBuffer()),local=await readFile('public'+a.url);assert.equal(bytes.length,a.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(local).digest('hex'));const thumb=await fetch(origin+a.thumbnailUrl);assert(thumb.ok);assert((await thumb.arrayBuffer()).byteLength>1000);}
 checks.push('all-21-model-binaries-match-validated-local-renders-and-all-thumbnails-load');
 for(const mobile of [true,false]){
  const label=mobile?'phone':'desktop',context=await browser.newContext({viewport:mobile?{width:390,height:760}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
  const ready=()=>p.waitForFunction(()=>document.documentElement.dataset.ctrlHouseReady==='true'&&Number(document.documentElement.dataset.ctrlAvatarMeshCount)>0);
  await p.goto(origin+'/habitat-test',{waitUntil:'domcontentloaded'});await ready();
  await p.getByRole('button',{name:'Perabot',exact:true}).click();await p.getByRole('button',{name:'Save & play',exact:true}).click();
  const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('ctrl-habitat-test-v1')!).objects.length);
  await p.getByRole('button',{name:'Perabot',exact:true}).click();await p.getByRole('button',{name:'Browse Willow interiors',exact:true}).click();
  assert.equal(await p.locator('.hb-build-assets > button').count(),13);
  await p.waitForFunction(()=>Array.from(document.querySelectorAll<HTMLImageElement>('.hb-build-asset-art img')).slice(0,3).every(i=>i.complete&&i.naturalWidth>0));await p.screenshot({path:`${dir}/indoor-catalog-${label}.png`});
  await p.getByRole('button',{name:'Add Willow carved sofa',exact:true}).click();
  const cdp=await context.newCDPSession(p);await aimAtValidFloor(p,cdp);
  await p.waitForFunction(()=>{try{return JSON.parse(document.documentElement.dataset.ctrlFurnitureGhost!).meshes>2;}catch{return false;}});
  await p.screenshot({path:`${dir}/new-sofa-ghost-${label}.png`});await p.getByRole('button',{name:'Batalkan penempatan',exact:true}).click();
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('ctrl-habitat-test-v1')!).objects.length),before);
  await p.getByRole('button',{name:'Browse Garden & terrace',exact:true}).click();assert.equal(await p.locator('.hb-build-assets > button').count(),8);
  await p.waitForFunction(()=>Array.from(document.querySelectorAll<HTMLImageElement>('.hb-build-asset-art img')).slice(0,3).every(i=>i.complete&&i.naturalWidth>0));await p.screenshot({path:`${dir}/outdoor-catalog-${label}.png`});
  await p.getByRole('button',{name:'Add Terrace bistro set',exact:true}).click();await aimAtValidFloor(p,cdp);
  await p.waitForFunction(()=>{try{return JSON.parse(document.documentElement.dataset.ctrlFurnitureGhost!).meshes>2;}catch{return false;}});await p.screenshot({path:`${dir}/new-bistro-ghost-${label}.png`});
  await p.getByRole('button',{name:'Pasang perabot',exact:true}).click();await p.getByRole('button',{name:'Save & play',exact:true}).click();await p.reload({waitUntil:'domcontentloaded'});await ready();
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('ctrl-habitat-test-v1')!).objects);
  assert.equal(saved.length,before+1);assert(saved.some((o:{assetId:string})=>o.assetId==='haven-cozy/outdoor_table_chair_set_01'));
  await p.waitForResponse(r=>r.url().includes('/haven-cozy/outdoor_table_chair_set_01.glb')&&r.ok(),{timeout:1000}).catch(()=>{});
  await p.waitForTimeout(1000);await p.screenshot({path:`${dir}/new-bistro-saved-${label}.png`});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push(`${label}:new-indoor-13-outdoor-8-real-model-ghost-cancel-confirm-save-reload`);await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${dir}/report.json`,JSON.stringify({origin,checks,errors,models:HAVEN_BUILD_ASSETS.length,mobile:'Chromium touch emulation, not physical device'},null,2));console.log('NEW_FURNITURE_PUBLIC_QA_PASS',checks);
}finally{await browser.close();}
