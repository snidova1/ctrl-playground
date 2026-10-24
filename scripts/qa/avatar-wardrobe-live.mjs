import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='test-results/avatar-wardrobe-live';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({baseURL:process.env.CTRL_AVATAR_QA_ORIGIN??'http://127.0.0.1:3173',viewport:{width:1440,height:1000}});page.setDefaultTimeout(120000);const errors=[],requests=[],cases=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/wardrobe/'))requests.push({url:r.url(),status:r.status()});});
try{
 await page.goto('/avatar-studio',{waitUntil:'domcontentloaded',timeout:180000});
 await page.waitForFunction(()=>document.querySelector('.hb-avatar-preview')?.dataset.avatarReady==='true'&&document.documentElement.dataset.ctrlAvatarRenderer==='anime-vrm-mtoon');
 await page.getByRole('combobox',{name:'Body & outfit model',exact:true}).selectOption('alternate');
 await page.getByRole('button',{name:'Clear accessories',exact:true}).click();
 const hairChoices=await page.getByRole('combobox',{name:'Hairstyle',exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value));
 const costumeChoices=(await page.getByRole('combobox',{name:'Costume',exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value))).filter(id=>!process.env.CTRL_AVATAR_QA_COSTUME||id===process.env.CTRL_AVATAR_QA_COSTUME);
 for(const hair of hairChoices)for(const costume of costumeChoices){
  await page.getByRole('combobox',{name:'Hairstyle',exact:true}).selectOption(hair);await page.getByRole('combobox',{name:'Costume',exact:true}).selectOption(costume);
  await page.waitForFunction(({hair,costume})=>document.querySelector('.hb-avatar-preview')?.dataset.avatarReady==='true'&&document.documentElement.dataset.ctrlAvatarModel==='ctrl-anime-female-studio'&&document.documentElement.dataset.ctrlAvatarHairStyle===hair&&document.documentElement.dataset.ctrlAvatarWardrobe===costume,{hair,costume});
  await page.waitForTimeout(800);await page.locator('.as-stage').screenshot({path:`${dir}/${hair}-${costume}.png`});cases.push({hair,costume});
  if(costume!=='source'){await page.getByRole('button',{name:'Walk',exact:true}).click();await page.waitForTimeout(800);await page.locator('.as-stage').screenshot({path:`${dir}/${hair}-${costume}-walk.png`});await page.getByRole('button',{name:'Relax',exact:true}).click();}
 }
 // Orbit the actual canvas to inspect seams that front-only pictures can hide.
 const canvas=page.locator('.hb-avatar-preview canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();assert(box);
 for(const angle of ['side','rear','other-side','front-restored']){
  const x=box.x+box.width*.7,y=box.y+box.height*.45;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-box.height/4,y,{steps:14});await page.mouse.up();await page.waitForTimeout(450);
  if(angle!=='front-restored')await page.locator('.as-stage').screenshot({path:`${dir}/last-combination-${angle}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('combobox',{name:'Costume',exact:true}).selectOption('darkness-studio');await page.waitForTimeout(700);await page.screenshot({path:`${dir}/mobile-creator.png`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const primary=page.getByRole('group',{name:'Character model and compatible styles',exact:true});assert.equal(await primary.getByRole('combobox').count(),4);
 assert((await primary.boundingBox()).y<(await page.getByRole('group',{name:'Accessory style presets',exact:true}).boundingBox()).y);
 for(const select of await primary.getByRole('combobox').all())assert((await select.boundingBox()).height>=44);
 await primary.screenshot({path:`${dir}/mobile-primary-controls.png`});
 assert(requests.some(r=>r.status===200&&r.url.endsWith('.glb')));assert.deepEqual(errors,[]);await writeFile(`${dir}/report.json`,JSON.stringify({cases,requests,errors,mobileOverflow:false},null,2));console.log('PASS',JSON.stringify(cases));
}catch(e){console.log('DIAG',JSON.stringify(await page.evaluate(()=>({data:{...document.documentElement.dataset},alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent),ready:document.querySelector('.hb-avatar-preview')?.dataset.avatarReady,selected:[...document.querySelectorAll('select')].map(s=>[s.getAttribute('aria-label'),s.value])}))));await page.screenshot({path:`${dir}/failure.png`,fullPage:true});throw e;}finally{await browser.close();}
