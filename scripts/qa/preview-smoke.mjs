import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin=process.env.CTRL_STAGING_ORIGIN;
assert(origin?.startsWith('https://ctrl-staging.'),'Staging origin required');
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const results=[];
try{
 for(const mobile of [false,true]){
  const label=mobile?'phone':'desktop';
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960},hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[],api=[],assetFailures=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
  page.on('response',r=>{if(r.status()>=400&&(/\.(glb|vrm|png|webp)(\?|$)/.test(r.url())))assetFailures.push(r.url());});
  const click=async name=>{const b=page.getByRole('button',{name,exact:true});if(mobile)await b.tap();else await b.click();};
  const ready=async area=>{await page.locator(`[data-habit-view="${area}"][data-scene-ready="true"]`).waitFor({timeout:120000});await page.waitForTimeout(1200);};
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2')));
  const project=(x,y,z)=>page.evaluate(([x,y,z])=>window.__habitProject(x,y,z),[x,y,z]);
  const response=await page.goto(`${origin}/preview`,{waitUntil:'domcontentloaded',timeout:90000});assert.equal(response.status(),200);
  await ready('yard');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2'))?.room?.length===8);
  assert.equal(await page.getByRole('alert').count(),0);assert.equal(await page.getByRole('button',{name:'Edit home',exact:true}).count(),0);
  assert.equal(await page.locator('input[type="number"]').count(),0,'No XYZ form');
  await page.screenshot({path:`test-results/habit-${label}-yard.png`});
  await click('Masuk rumah');await ready('inside');
  await page.screenshot({path:`test-results/habit-${label}-room-before.png`});
  await click('▣ Tas perabot');await click('Pilih Kursi');
  const floor=await project(1.2,.025,1.1);assert(floor.visible);if(mobile)await page.touchscreen.tap(floor.x,floor.y);else await page.mouse.click(floor.x,floor.y);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2'))?.room?.length===9);
  await ready('inside');const placed=(await saved()).room.at(-1);assert.equal(placed.assetId,'furniture-kit/chair');
  await click('Warna Rose');await click('Putar barang');
  await page.waitForFunction(id=>{const d=JSON.parse(localStorage.getItem('ctrl-habit-local-v2'));return d.colors[id]==='#ca94a5'&&d.room.find(o=>o.id===id).rotation>0;},placed.id);
  await click('✓ Selesai');
  const start=await project(placed.x,.58,placed.z),end=await project(placed.x+1.05,.58,placed.z+.15);
  if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y,id:1}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/12,y:start.y+(end.y-start.y)*i/12,id:1}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();}
  await page.waitForFunction(({id,x})=>Math.abs(JSON.parse(localStorage.getItem('ctrl-habit-local-v2')).room.find(o=>o.id===id).x-x)>.2,{id:placed.id,x:placed.x});
  await page.screenshot({path:`test-results/habit-${label}-direct-editor.png`});
  const changed=await saved();await page.reload({waitUntil:'domcontentloaded'});await ready('yard');assert.deepEqual(await saved(),changed,'Furniture/colors survive reload');
  await click('Masuk rumah');await ready('inside');const moved=changed.room.find(o=>o.id===placed.id),point=await project(moved.x,.58,moved.z);
  if(mobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
  await click('Simpan barang');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2')).room.length===8);
  await click('◉ Cat rumah');await click('Cat Cream');await click('Selesai');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ctrl-habit-local-v2')).house.wallColor==='#f3dfb5');
  await page.waitForTimeout(1000);await page.screenshot({path:`test-results/habit-${label}-room.png`});
  await click('Keluar rumah');await ready('yard');
  assert.deepEqual(errors,[],'No browser runtime errors');assert.deepEqual(assetFailures,[],'No missing visual assets');assert.deepEqual(api,[],'No wallet/private APIs');
  results.push({device:label,enterExit:true,manualPlacement:true,dragInput:mobile?'CDP touch':'mouse',rotateColor:true,reloadPersistence:true,remove:true,wallPaint:true,pageErrors:errors});
  await context.close();
 }
 await writeFile('test-results/preview-smoke.json',JSON.stringify({url:`${origin}/preview`,originalProceduralFurniture:true,devices:results},null,2));
 console.log('Habit PC + phone direct-decoration and persistence acceptance passed.');
}catch(error){for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:'test-results/habit-failure.png'}).catch(()=>{});throw error;}finally{await browser.close();}
