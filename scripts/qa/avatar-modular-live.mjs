import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='test-results/avatar-modular-main';await mkdir(dir,{recursive:true});
const origin=process.env.CTRL_AVATAR_QA_ORIGIN??'http://127.0.0.1:3180';
const b=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const p=await b.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(90000);const errors=[],badAssets=[],assets=[],cases=[];
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('/characters/modular/')){assets.push(r.url());if(r.status()>=400)badAssets.push([r.url(),r.status()]);}});
const control=name=>p.getByRole('combobox',{name,exact:true});
async function ready(family,expected={}){await p.waitForFunction(({family,expected})=>{const d=document.documentElement.dataset;if(document.querySelector('.hb-avatar-preview')?.dataset.avatarReady!=='true'||d.ctrlAvatarModularFamily!==family)return false;const parts=JSON.parse(d.ctrlAvatarModularParts??'[]');return Object.entries(expected).every(([slot,id])=>id==='none'?!parts.some(p=>p.startsWith(slot+'/')):parts.includes(`${slot}/${id}`));},{family,expected});}
try{
 await p.goto(origin+'/avatar-studio',{waitUntil:'domcontentloaded'});await ready('drophunter');
 for(const family of ['drophunter','neurohacker']){
  await control('Body & outfit model').selectOption(`modular:${family}`);await ready(family);
  const slots={hair:'Hairstyle',top:'Top',bottom:'Bottom',shoes:'Shoes'};const lists={};
  for(const [slot,label]of Object.entries(slots)){lists[slot]=await control(label).locator('option').evaluateAll(o=>o.map(x=>x.value));assert.equal(lists[slot].length,slot==='bottom'?9:10);}
  // One batched matrix covers every main-part option once per family, without build per item.
  for(let i=0;i<10;i++){
   const expected={};for(const [slot,label]of Object.entries(slots)){const id=lists[slot][i%lists[slot].length];await control(label).selectOption(id);expected[slot]=id;}
   await ready(family,expected);await p.waitForTimeout(200);cases.push({family,...expected});
   if([0,3,6,9].includes(i))await p.locator('.as-stage').screenshot({path:`${dir}/${family}-${i}.png`});
  }
  // Also assert actual native optional layer rendering, not just schema/UI options.
  const outer=await control('Outer layer').locator('option').nth(1).getAttribute('value'),accessory=await control('Native accessory').locator('option').nth(1).getAttribute('value');
  await control('Outer layer').selectOption(outer);await control('Native accessory').selectOption(accessory);await ready(family,{outer,accessory});await p.locator('.as-stage').screenshot({path:`${dir}/${family}-layered.png`});await control('Outer layer').selectOption('none');await control('Native accessory').selectOption('none');await ready(family);
  await p.getByRole('button',{name:'Walk',exact:true}).click();await p.waitForTimeout(800);await p.locator('.as-stage').screenshot({path:`${dir}/${family}-walk.png`});await p.getByRole('button',{name:'Relax',exact:true}).click();await control('Expression').selectOption('happy');await p.waitForTimeout(250);
 }
 const desktopInstance=await p.evaluate(()=>document.documentElement.dataset.ctrlAvatarInstance);await p.setViewportSize({width:390,height:844});await ready('neurohacker');await p.waitForFunction(old=>!!document.documentElement.dataset.ctrlAvatarInstance&&document.documentElement.dataset.ctrlAvatarInstance!==old,desktopInstance);await p.waitForTimeout(600);await p.locator('.as-stage').screenshot({path:`${dir}/phone-avatar.png`});const primary=p.getByRole('group',{name:'Character model and compatible styles',exact:true});await primary.screenshot({path:`${dir}/phone-controls.png`});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(const select of await primary.getByRole('combobox').all())assert((await select.boundingBox()).height>=44);assert(assets.some(url=>url.includes('-mobile.vrm')));
 assert.deepEqual(errors,[]);assert.deepEqual(badAssets,[]);await writeFile(`${dir}/report.json`,JSON.stringify({cases,errors,badAssets,lowAssetsLoaded:assets.filter(u=>u.includes('-mobile.vrm')),mobileOverflow:false},null,2));console.log('PASS MAIN CTRL',cases.length,'combinations; all 78 main part choices covered; native optional layers, walk, expression and phone low assets');
}catch(e){console.log('DIAG',JSON.stringify(await p.evaluate(()=>({data:{...document.documentElement.dataset},alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent)}))));await p.screenshot({path:`${dir}/failure.png`,fullPage:true});throw e;}finally{await b.close();}
