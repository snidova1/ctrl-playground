import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='test-results/video';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir,size:{width:1280,height:720}}});
const start=performance.now();const page=await context.newPage(),segments=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>console.error('PAGE ERROR:',e.message));page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url());});
const elapsed=()=> (performance.now()-start)/1000;
const ready=async area=>{await page.locator(`[data-habit-view="${area}"][data-scene-ready="true"]`).waitFor({timeout:300000});await page.waitForTimeout(1500);};
const clip=async(name,action)=>{const from=elapsed();await action();segments.push({name,start:from,end:elapsed()});console.log('Recorded',name);};
try{
 await page.goto(`${process.env.CTRL_VIDEO_ORIGIN??'http://localhost:3041'}/preview`,{waitUntil:'domcontentloaded',timeout:120000});await ready('yard');
 await clip('Cottage and garden',async()=>{await page.waitForTimeout(2000);await page.mouse.move(1030,340);await page.mouse.down();await page.mouse.move(1110,355,{steps:20});await page.mouse.up();await page.waitForTimeout(2500);});
 await page.getByRole('button',{name:'Reset camera',exact:true}).click();
 await clip('Golden hour',async()=>{await page.getByRole('button',{name:'Change atmosphere: afternoon',exact:true}).click();await page.waitForTimeout(6000);});
 await page.getByRole('button',{name:'Enter home',exact:true}).click({force:true});await ready('inside');
 await clip('Inside the home',async()=>{await page.waitForTimeout(4000);await page.getByRole('button',{name:'Furnish',exact:true}).click();await page.waitForTimeout(3000);});
 await page.getByRole('button',{name:'Choose Chair',exact:true}).click();
 const floor=await page.evaluate(()=>window.__habitProject(1.2,.025,1.1));await page.mouse.click(floor.x,floor.y);await ready('inside');
 await clip('Decorating',async()=>{await page.waitForTimeout(1500);await page.getByRole('button',{name:'Color Rose',exact:true}).click();await page.waitForTimeout(1000);await page.getByRole('button',{name:'Rotate item',exact:true}).click();await page.waitForTimeout(1500);await page.getByRole('button',{name:'Done',exact:true}).click();await page.waitForTimeout(3000);});
 const video=page.video();await context.close();const path=await video.path();await writeFile(`${dir}/segments.json`,JSON.stringify({path,segments},null,2));console.log(JSON.stringify({path,segments}));
}finally{await context.close().catch(()=>{});if(segments.length)await writeFile(`${dir}/segments.json`,JSON.stringify({path:await page.video().path(),segments},null,2));await browser.close();}
