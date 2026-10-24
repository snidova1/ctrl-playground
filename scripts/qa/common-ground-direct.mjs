import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.CTRL_QA_ORIGIN??'http://127.0.0.1:3200';
const dir='test-results/common-ground-direct';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const results=[];
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
 try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.locator('main[data-product-area="playable-landing"]').waitFor();
 assert.equal(await page.getByRole('button',{name:/enter common ground/i}).count(),0);
 assert(!/small waiting room|stay in the small waiting room/i.test(await page.locator('body').innerText()));
 const canvas=page.locator('canvas[data-lobby-ready="true"]');await canvas.waitFor();await page.waitForFunction(()=>document.querySelector('canvas')?.getAttribute('data-avatar-ready')==='true',null,{timeout:180000});
 const identity=await page.locator('main.cg-lobby').getAttribute('data-guest-id');assert(identity);
 const z=Number(await canvas.getAttribute('data-guest-z'));
 if(mobile){assert.equal(await page.getByRole('button',{name:'Move forward',exact:true}).count(),0);const box=await page.getByRole('group',{name:'Analog movement control',exact:true}).boundingBox(),runBox=await page.getByRole('button',{name:/Run.*hold to run/}).boundingBox();assert(box&&runBox);const cdp=await context.newCDPSession(page),stick={x:box.x+box.width/2,y:box.y+box.height/2-30,id:1},run={x:runBox.x+runBox.width/2,y:runBox.y+runBox.height/2,id:2};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick]});await page.waitForFunction(z=>Math.abs(Number(document.querySelector('canvas')?.getAttribute('data-guest-z'))-z)>.1,z);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick,run]});await page.waitForFunction(()=>document.documentElement.dataset.ctrlAvatarState==='Run');await page.screenshot({path:`${dir}/phone-analog-run.png`});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>document.documentElement.dataset.ctrlAvatarState==='Idle');}
 else{await page.keyboard.down('w');await page.waitForFunction(z=>Math.abs(Number(document.querySelector('canvas')?.getAttribute('data-guest-z'))-z)>.1,z);await page.keyboard.up('w');}
 const after=Number(await canvas.getAttribute('data-guest-z'));assert(Math.abs(after-z)>.1);
 await page.screenshot({path:`${dir}/${mobile?'phone':'desktop'}.png`});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('main.cg-lobby[data-guest-id]').waitFor();assert.equal(await page.locator('main.cg-lobby').getAttribute('data-guest-id'),identity);
 assert.equal(await page.getByRole('button',{name:/enter common ground/i}).count(),0);assert.deepEqual(errors,[]);
 results.push({origin,mobile,directOutdoorLanding:true,noEntryGate:true,walk:true,guestRestored:true,errors});console.log('COMMON_GROUND_DIRECT_PASS',mobile?'touch':'desktop');
 }catch(error){await page.screenshot({path:`${dir}/failure-${mobile?'phone':'desktop'}.png`});console.log('DIAG',await page.locator('body').innerText());throw error;}finally{await context.close();}
}await writeFile(`${dir}/report.json`,JSON.stringify(results,null,2));}finally{await browser.close();}
