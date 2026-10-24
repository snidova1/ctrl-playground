import {chromium,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.CTRL_QA_ORIGIN??'http://127.0.0.1:3246',label=process.env.CTRL_ART_LABEL??'before',dir=resolve('test-results/entry-art-target',label);
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CTRL_QA_CHROME??'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const results:unknown[]=[],errors:string[]=[];let active:Page|undefined;
try{
 for(const mobile of [false,true]){
  const mode=mobile?'phone':'desktop',context=await browser.newContext({baseURL:origin,viewport:mobile?{width:390,height:760}:{width:1000,height:760},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}),page=await context.newPage();active=page;page.setDefaultTimeout(60_000);page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{const path=new URL(r.url()).pathname;if(r.status()>=400&&['/plaza/','/worlds/','/assets/','/entry-art-preview','/cozy-life-preview'].some(prefix=>path.startsWith(prefix)))errors.push(`${r.status()} ${path}`);});
  await page.addInitScript(()=>{(window as unknown as {doorEvents:unknown[]}).doorEvents=[];window.addEventListener('ctrl-house-door-feedback',e=>(window as unknown as {doorEvents:unknown[]}).doorEvents.push((e as CustomEvent).detail));});
  const response=await page.goto('/habitat-test',{waitUntil:'domcontentloaded'});assert.equal(response?.status(),200);
  await page.waitForFunction(()=>document.documentElement.dataset.ctrlHouseReady==='true'&&Number(document.documentElement.dataset.ctrlAvatarMeshCount)>0);
  await page.getByRole('button',{name:/Open door$/}).waitFor();
  await page.screenshot({path:resolve(dir,`${mode}-closed.png`),timeout:120_000});
  const layout=await page.evaluate(()=>({x:document.querySelector('.hb-house-location')?.getAttribute('data-player-x'),z:document.querySelector('.hb-house-location')?.getAttribute('data-player-z'),camera:document.documentElement.dataset.ctrlHouseCamera,storage:localStorage.getItem('ctrl-habitat-test-v1'),overflow:document.documentElement.scrollWidth>innerWidth,avatar:document.documentElement.dataset.ctrlAvatarMeshCount}));assert.equal(layout.overflow,false);
  if(process.argv.includes('--exercise')){
   assert.equal(await page.evaluate(()=>(window as unknown as {doorEvents:unknown[]}).doorEvents.length),0);
   if(mobile)await page.getByRole('button',{name:/Open door$/}).tap();else await page.keyboard.press('KeyE');
   await page.getByRole('button',{name:/Close door$/}).waitFor();
   await page.waitForFunction(()=>{const data=JSON.parse(document.documentElement.dataset.ctrlHouseDoorAngles??'[]') as {angle:number}[];return data.some(d=>Math.abs(d.angle+Math.PI/2)<.015);});
   await page.screenshot({path:resolve(dir,`${mode}-open.png`),timeout:120_000});
   const shell=await page.evaluate(()=>({walls:document.documentElement.dataset.ctrlHouseShellVisible,roof:document.documentElement.dataset.ctrlHouseRoofVisible}));assert.equal(shell.walls,'true');assert.equal(shell.roof,'true');
   if(mobile)await page.getByRole('button',{name:/Close door$/}).tap();else await page.keyboard.press('KeyE');
   await page.getByRole('button',{name:/Open door$/}).waitFor();
   await page.waitForFunction(()=>{const data=JSON.parse(document.documentElement.dataset.ctrlHouseDoorAngles??'[]') as {angle:number}[];return data.length>0&&data.every(d=>Math.abs(d.angle)<.015);});
   const feedback=await page.evaluate(()=>(window as unknown as {doorEvents:{active:boolean;audioScheduled:boolean;audioState:string}[]}).doorEvents);assert.equal(feedback.length,2);assert.equal(feedback[0].active,true);assert.equal(feedback[1].active,false);for(const event of feedback){assert.equal(event.audioScheduled,true);assert.equal(event.audioState,'running');}
   const sound=page.getByRole('button',{name:'Door sounds',exact:true});if(mobile)await sound.tap();else await sound.click();assert.equal(await sound.getAttribute('aria-pressed'),'false');
   if(mobile)await page.getByRole('button',{name:/Open door$/}).tap();else{await page.keyboard.down('KeyE');await page.getByRole('button',{name:/Close door$/}).waitFor();await page.keyboard.down('KeyE');await page.keyboard.up('KeyE');}
   await page.getByRole('button',{name:/Close door$/}).waitFor();
   await page.waitForFunction(()=>JSON.parse(document.documentElement.dataset.ctrlHouseDoorAngles??'[]').some((d:{angle:number})=>Math.abs(d.angle+Math.PI/2)<.015));
   if(mobile)await page.getByRole('button',{name:/Close door$/}).tap();else await page.keyboard.press('KeyE');
   await page.getByRole('button',{name:/Open door$/}).waitFor();
   await page.waitForFunction(()=>{const data=JSON.parse(document.documentElement.dataset.ctrlHouseDoorAngles??'[]') as {angle:number}[];return data.length>0&&data.every(d=>Math.abs(d.angle)<.015);});
   const muted=await page.evaluate(()=>(window as unknown as {doorEvents:{audioScheduled:boolean}[]}).doorEvents);assert.equal(muted.length,4);for(const event of muted.slice(2))assert.equal(event.audioScheduled,false);
   if(mobile)await sound.tap();else await sound.click();
   // Approach/enter through the real controller, never by assigning a pose ref.
   const center=mobile?195:500,cdp=mobile?await context.newCDPSession(page):null;
   if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center,y:300,id:8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center-86,y:300,id:8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(center,300);await page.mouse.down();await page.mouse.move(center-86,300,{steps:8});await page.mouse.up();}
   if(mobile)await page.getByRole('button',{name:/Open door$/}).tap();else await page.keyboard.press('KeyE');
   await page.waitForFunction(()=>JSON.parse(document.documentElement.dataset.ctrlHouseDoorAngles??'[]').some((d:{angle:number})=>Math.abs(d.angle+Math.PI/2)<.015));
   if(cdp){const box=await page.getByRole('group',{name:'Analog movement control',exact:true}).boundingBox();assert(box);const x=box.x+box.width/2,y=box.y+box.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:9}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-36,id:9}]});}
   else await page.keyboard.down('KeyW');
   try{await page.waitForFunction(()=>{const location=document.querySelector<HTMLOutputElement>('.hb-house-location');return location?.dataset.houseInside==='true'&&Number(location.dataset.playerZ)<.7;});}finally{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('KeyW');}
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.ctrlHouseShellVisible),'true');assert.equal(await page.evaluate(()=>document.documentElement.dataset.ctrlHouseRoofVisible),'true');
   await page.screenshot({path:resolve(dir,`${mode}-inside.png`),timeout:120_000});
   if(mobile)await page.getByRole('button',{name:/Close door$/}).tap();else await page.keyboard.press('KeyE');
   await page.getByRole('button',{name:/Open door$/}).waitFor();
   let audioStats:unknown;
   if(!mobile&&label==='public'){
    const rendered=await page.evaluate(async()=>{const modulePath='/entry-door-audio.js';const module=await import(/* @vite-ignore */ modulePath);const audio=new OfflineAudioContext(1,24000,24000);module.scheduleDoorSound(audio,false,0);const result=await audio.startRendering(),samples=Array.from(result.getChannelData(0));let peak=0,total=0;for(const sample of samples){peak=Math.max(peak,Math.abs(sample));total+=sample*sample;}return {samples,sampleRate:result.sampleRate,peak,rms:Math.sqrt(total/samples.length)};});
    assert(rendered.rms>.0001&&rendered.peak<.5);const wav=Buffer.alloc(44+rendered.samples.length*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rendered.sampleRate,24);wav.writeUInt32LE(rendered.sampleRate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);rendered.samples.forEach((sample,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),44+i*2));await writeFile(resolve(dir,'door-close-rendered.wav'),wav);audioStats={peak:rendered.peak,rms:rendered.rms,sampleRate:rendered.sampleRate};
   }
   assert.equal(await page.evaluate(()=>localStorage.getItem('ctrl-habitat-test-v1')),layout.storage);
   results.push({mode,layout,feedback,audioStats,checks:['actual-input-open-close','actual-door-mesh-angles-settled','walls-and-roof-intact','no-startup-feedback','one-confirmed-feedback-per-state-change','mute-disables-sound',...(mobile?[]:['held-E-no-repeat-toggle']),'real-control-walk-through-door','walls-and-roof-intact-while-inside','no-layout-rewrite']});
  }else results.push({mode,layout});
  await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(dir,'report.json'),JSON.stringify({status:'PASS',origin,label,results,errors,scope:'Actual source route; desktop and phone Chromium/touch emulation. Not a signed-server or physical-device test.'},null,2));console.log('ENTRY_ART_TARGET_PASS',label,dir);
}catch(e){await writeFile(resolve(dir,'report.json'),JSON.stringify({status:'FAIL',label,error:String(e),results,errors},null,2));if(active&&!active.isClosed())await active.screenshot({path:resolve(dir,'failure.png'),timeout:15_000}).catch(()=>{});throw e;}finally{await browser.close();}
