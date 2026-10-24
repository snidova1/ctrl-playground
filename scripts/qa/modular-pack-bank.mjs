import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='test-results/modular-pack-smoke';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const looks=[
 {family:'drophunter',head:'ponytail',chest:'hoodie',legs:'cargopants',feet:'sneakers'},
 {family:'drophunter',head:'short',chest:'fulljacket',legs:'casualshorts',feet:'hightop'},
 {family:'drophunter',head:'buns',chest:'sweater',legs:'skirt',feet:'dressboots'},
 {family:'drophunter',head:'straight',chest:'lightshirt',legs:'waistshorts',feet:'thinshoe'},
 {family:'neurohacker',head:'short',chest:'fancysuit',legs:'suitpants',feet:'dressshoes'},
 {family:'neurohacker',head:'hairshort',chest:'dressrobe',legs:'tightjeans',feet:'fantasyboots'},
 {family:'neurohacker',head:'braided',chest:'streetware',legs:'streetpants',feet:'runningshoes'},
 {family:'neurohacker',head:'straightdown',chest:'sweater',legs:'rolleduppants',feet:'simpleshoes'},
];
try{
 const page=await browser.newPage({viewport:{width:1100,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300));});
 await page.goto('http://127.0.0.1:3182/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.packPreview?.ready,null,{timeout:90000});
 const bodies={},results=[];
 for(const [i,look]of looks.entries()){
  await page.evaluate(async look=>{await window.packPreview.setLook(look);window.packPreview.turn(0);window.packPreview.pose(-1.1);},look);await page.waitForTimeout(300);
  const state=await page.evaluate(()=>({ready:window.packPreview.ready,family:window.packPreview.family,selection:window.packPreview.selection,bodyInstance:window.packPreview.bodyInstance,parts:window.packPreview.parts}));assert(state.ready);for(const slot of ['head','chest','legs','feet'])assert.equal(state.selection[slot],look[slot]);
  if(bodies[look.family])assert.equal(state.bodyInstance,bodies[look.family],'Body identity changed during part swaps');else bodies[look.family]=state.bodyInstance;
  for(const slot of ['head','chest','legs','feet'])assert.equal(await page.locator(`#slot-${slot} option`).count(),slot==='legs'?9:10);
  await page.screenshot({path:`${dir}/look-${i+1}.png`});results.push({look,state});
  if(i===0||i===7){await page.evaluate(()=>window.packPreview.turn(Math.PI));await page.waitForTimeout(250);await page.screenshot({path:`${dir}/look-${i+1}-rear.png`});await page.evaluate(()=>{window.packPreview.turn(0);window.packPreview.pose(-.2);});await page.waitForTimeout(250);await page.screenshot({path:`${dir}/look-${i+1}-raised.png`});}
 }
 await page.getByRole('button',{name:'Walk preview',exact:true}).click();await page.waitForTimeout(1500);await page.screenshot({path:`${dir}/walk.png`});assert.deepEqual(errors,[]);
 await writeFile(`${dir}/bank-report.json`,JSON.stringify({results,bodyIdentityPreserved:true,errors},null,2));console.log('PASS',results.length,'source combinations, preserved body per family, category option counts, arm pose, walk, zero browser errors');
}finally{await browser.close();}
