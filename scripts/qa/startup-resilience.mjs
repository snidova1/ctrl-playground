import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {writeFile,mkdir} from 'node:fs/promises';
const root=process.env.CTRL_PREVIEW_URL||'http://localhost:3054/world-preview';
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={success:false,url:root,steps:[]};let page;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(()=>{for(const C of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext]){if(!C)continue;const original=C.prototype.getExtension;C.prototype.getExtension=function(name){return name==='EXT_color_buffer_float'?null:original.call(this,name);};}});page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/plaza/characters/*.vrm',r=>r.abort('failed'));
 const start=Date.now();await page.goto(root,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('main[data-ready="true"]',{timeout:20000});
 const d=await page.locator('canvas').evaluate(c=>({...c.dataset}));assert.equal(d.worldReady,'true');assert.equal(d.animeTarget,'ldr8');const unique=await page.locator('canvas').evaluate(c=>{const g=c.getContext('webgl2'),p=new Uint8Array(16*16*4);g.readPixels(c.width/2-8,c.height/2-8,16,16,g.RGBA,g.UNSIGNED_BYTE,p);return new Set(Array.from({length:256},(_,i)=>`${p[i*4]},${p[i*4+1]},${p[i*4+2]}`)).size;});assert(unique>4,'LDR framebuffer must contain real image detail, not a blank screen');assert.equal(await page.getByRole('heading',{name:'Opening Willow Common…'}).count(),0);
 report.steps.push({name:'world opens with every VRM download failing',milliseconds:Date.now()-start,data:d});
 const before={x:+d.worldX,z:+d.worldZ};const button=await page.getByRole('button',{name:'Move forward'}).boundingBox();assert(button);await page.mouse.move(button.x+button.width/2,button.y+button.height/2);await page.mouse.down();try{await page.waitForFunction(({x,z})=>{const c=document.querySelector('canvas');return c&&Math.hypot(+c.dataset.worldX-x,+c.dataset.worldZ-z)>.25;},before,{timeout:12000});}finally{await page.mouse.up();}
 report.steps.push({name:'movement remains usable despite failed character assets'});
 await page.unroute('**/plaza/characters/*.vrm');await page.getByRole('button',{name:'Retry characters',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.avatarReady==='true',null,{timeout:90000});
 report.steps.push({name:'characters recover in place without reloading the world',data:await page.locator('canvas').evaluate(c=>({...c.dataset}))});assert.deepEqual(errors,[]);report.success=true;
}catch(e){report.failure=String(e.stack||e);if(page&&!page.isClosed()){report.diagnostic=await page.evaluate(()=>({main:{...document.querySelector('main')?.dataset},canvas:{...document.querySelector('canvas')?.dataset},text:document.body.innerText.slice(-2000)}));}console.error(report.failure,JSON.stringify(report.diagnostic));process.exitCode=1;}finally{await mkdir('test-results/neighborhood',{recursive:true});await writeFile('test-results/neighborhood/startup-resilience.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
