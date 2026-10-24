import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const dir=path.resolve('test-results/anime-video');await mkdir(`${dir}/frames`,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,recordVideo:{dir,size:{width:1440,height:1000}}});
const page=await context.newPage();page.setDefaultTimeout(120000);
const segments=[],errors=[],models=[];const started=Date.now();let clipStart=0,stage;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\.vrm(\?|$)/.test(r.url()))models.push(r.url());});
const click=name=>page.getByRole('button',{name,exact:true}).click();
async function capture(gender,action,seconds,move){
 const start=Date.now();
 while(Date.now()-start<seconds*1000){
  if(move)await move(Math.min(1,(Date.now()-start)/(seconds*1000)));
  await page.waitForTimeout(80);
 }
 segments.push({gender,action,start:(start-started)/1000,end:(Date.now()-started)/1000});
 console.log(gender,action,'recorded');
}
try{
 assert.equal((await page.goto('http://127.0.0.1:3168/avatar-studio',{waitUntil:'domcontentloaded'})).status(),200);
 for(const gender of ['female','male']){
  await click(gender==='female'?'Female':'Male');
  await page.waitForFunction(g=>document.querySelector('.hb-avatar-preview')?.dataset.avatarReady==='true'&&document.documentElement.dataset.ctrlAvatarModel===`ctrl-anime-${g}`,gender);
  await click('Relax');await page.waitForTimeout(600);
  if(!clipStart){clipStart=(Date.now()-started)/1000;stage=await page.locator('.as-stage').boundingBox();}
  await capture(gender,'idle',1.4);
  const box=await page.locator('.as-preview canvas').boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.45;
  await page.mouse.move(x,y);await page.mouse.down();
  await capture(gender,'rotate',3.6,p=>page.mouse.move(x+Math.sin(p*Math.PI*2)*125,y));
  await page.mouse.move(x,y);await page.mouse.up();
  await click('Walk');await capture(gender,'walk',3.2);
  await click('Say hello');await capture(gender,'wave',2.6);
  await click('Relax');await click('Face detail');await page.waitForTimeout(500);await capture(gender,'face-detail',2.5);await click('Face detail');
 }
 assert.deepEqual(errors,[]);assert(models.some(x=>x.includes('/anime/female.vrm'))&&models.some(x=>x.includes('/anime/male.vrm')));
 const clipEnd=(Date.now()-started)/1000;
 await context.close();const video=await page.video().path();
 await writeFile(`${dir}/capture.json`,JSON.stringify({source:'Actual local CTRL browser recording',clipStart,clipEnd,stage,video,segments,models,errors},null,2));
 console.log('CAPTURE_COMPLETE',video);
}finally{await browser.close();}
