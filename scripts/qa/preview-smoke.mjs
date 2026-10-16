import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin=process.env.CTRL_STAGING_ORIGIN;
assert(origin && (/^https:\/\/ctrl-staging\.[\w.-]+$/.test(origin)||/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)),'Staging or loopback preview origin required');
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const results=[];
try{
 for(const mobile of [false,true]){
  const label=mobile?'phone':'desktop';
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960},hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[],api=[],assetFailures=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error'&&/shader|webglprogram|validate_status/i.test(message.text()))errors.push(message.text());});
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
  page.on('response',r=>{if(r.status()>=400&&(/\.(glb|vrm|png|webp)(\?|$)/.test(r.url())))assetFailures.push(r.url());});
  const click=async name=>{const b=page.getByRole('button',{name,exact:true});if(mobile)await b.tap();else await b.click();};
  const ready=async area=>{await page.locator(`[data-habit-view="${area}"][data-scene-ready="true"]`).waitFor({timeout:240000});await page.waitForTimeout(1200);};
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2')));
  const project=(x,y,z)=>page.evaluate(([x,y,z])=>window.__habitProject(x,y,z),[x,y,z]);
  const response=await page.goto(`${origin}/preview`,{waitUntil:'domcontentloaded',timeout:90000});assert.equal(response.status(),200);
  await ready('yard');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2'))?.room?.length===8);
  const toon=await page.evaluate(()=>({materials:Number(document.documentElement.dataset.ctrlAvatarToonCount),expressions:Number(document.documentElement.dataset.ctrlAvatarExpressionCount)}));
  assert(toon.materials>0,'Actual lilToon materials must be loaded, not only the dependency');
  assert(toon.expressions>0,'VRM expressions must remain available');
  const doorBox=await page.getByRole('button',{name:'Enter home',exact:true}).boundingBox();assert(doorBox.height>=44,'Door remains touch accessible');
  assert.equal(await page.getByRole('button',{name:/Masuk rumah|Keluar rumah|Tas perabot/}).count(),0,'HUD uses English');
  assert.equal(await page.getByRole('alert').filter({hasText:/We couldn't open your home|VRoid character unavailable/}).count(),0);assert.equal(await page.getByRole('button',{name:'Edit home',exact:true}).count(),0);
  assert.equal(await page.locator('input[type="number"]').count(),0,'No XYZ form');
  await page.screenshot({path:`test-results/habit-${label}-yard.png`});
  let previous='afternoon';
  for(const preset of ['golden','sunset','dusk','afternoon']){
   if(!mobile&&preset==='sunset')await page.keyboard.press('t');else await click(`Change atmosphere: ${previous}`);
   await page.locator(`[data-atmosphere="${preset}"]`).waitFor();await page.waitForTimeout(4200);
   await page.screenshot({path:`test-results/habit-${label}-${preset}.png`});previous=preset;
  }
  await click('Enter home');await ready('inside');
  await page.screenshot({path:`test-results/habit-${label}-room-before.png`});
  await click('Furnish');await click('Choose Chair');
  const floor=await project(1.2,.025,1.1);assert(floor.visible);if(mobile)await page.touchscreen.tap(floor.x,floor.y);else await page.mouse.click(floor.x,floor.y);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2'))?.room?.length===9);
  await ready('inside');const placed=(await saved()).room.at(-1);assert.equal(placed.assetId,'furniture-kit/chair');
  await click('Color Rose');await click('Rotate item');
  await page.waitForFunction(id=>{const d=JSON.parse(localStorage.getItem('ctrl-habit-local-v2'));return d.colors[id]==='#ca94a5'&&d.room.find(o=>o.id===id).rotation>0;},placed.id);
  await click('Done');
  const start=await project(placed.x,.58,placed.z),end=await project(placed.x+1.05,.58,placed.z+.15);
  if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y,id:1}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/12,y:start.y+(end.y-start.y)*i/12,id:1}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();}
  await page.waitForFunction(({id,x})=>Math.abs(JSON.parse(localStorage.getItem('ctrl-habit-local-v2')).room.find(o=>o.id===id).x-x)>.2,{id:placed.id,x:placed.x});
  await page.screenshot({path:`test-results/habit-${label}-direct-editor.png`});
  const changed=await saved();await page.reload({waitUntil:'domcontentloaded'});await ready('yard');assert.deepEqual(await saved(),changed,'Furniture/colors survive reload');
  await click('Enter home');await ready('inside');const moved=changed.room.find(o=>o.id===placed.id),point=await project(moved.x,.58,moved.z);
  if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
  await click('Store item');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2')).room.length===8);
  await click('Paint home');await click('Paint Cream');await click('Done');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2')).house.wallColor==='#f3dfb5');
  await page.waitForTimeout(1000);await page.screenshot({path:`test-results/habit-${label}-room.png`});
  await click('Exit home');await ready('yard');
  assert.deepEqual(errors,[],'No browser runtime errors');assert.deepEqual(assetFailures,[],'No missing visual assets');assert.deepEqual(api,[],'No wallet/private APIs');
  results.push({device:label,toon,englishHud:true,doorTouchTargetHeight:doorBox.height,atmospherePresets:['afternoon','golden','sunset','dusk'],shaderErrorsChecked:true,enterExit:true,manualPlacement:true,dragInput:mobile?'CDP touch':'mouse',rotateColor:true,reloadPersistence:true,remove:true,wallPaint:true,pageErrors:errors});
  await context.close();
 }
 await writeFile('test-results/preview-smoke.json',JSON.stringify({url:`${origin}/preview`,browser:browser.version(),originalProceduralFurniture:true,devices:results},null,2));
 console.log('Habit PC + phone direct-decoration and persistence acceptance passed.');
}catch(error){for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:'test-results/habit-failure.png'}).catch(()=>{});throw error;}finally{await browser.close();}
