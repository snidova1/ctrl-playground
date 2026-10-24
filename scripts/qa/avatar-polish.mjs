import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='test-results/avatar-polish';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000);const errors=[],shots=[];page.on('pageerror',e=>errors.push(e.message));
try{
 assert.equal((await page.goto(process.env.CTRL_STAGING_ORIGIN+'/avatar-studio')).status(),200);
 await page.locator('.hb-avatar-preview[data-avatar-ready="true"]').waitFor();
 const necks=await page.getByRole('combobox',{name:'Neckwear',exact:true}).locator('option').evaluateAll(es=>es.map(e=>e.value));
 assert(!necks.includes('pendant'),'Pendant must be absent');
 await page.getByRole('combobox',{name:'Hair',exact:true}).selectOption('auburn');
 for(const name of ['Artist','Cozy','Scholar','Ribbon','Dreamer','Everyday']){
  const btn=page.getByRole('group',{name:'Accessory style presets'}).getByRole('button',{name:new RegExp('^'+name)});
  await btn.click();assert.equal(await btn.getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('combobox',{name:'Hair',exact:true}).inputValue(),'auburn');
  await page.locator('.hb-avatar-preview[data-avatar-ready="true"]').waitFor();await page.waitForTimeout(600);
  await page.locator('.as-stage').screenshot({path:`${dir}/${name.toLowerCase()}.png`});shots.push(name);
 }
 await page.getByRole('button',{name:'Clear accessories',exact:true}).click();
 for(const name of ['Headwear','Eyewear','Earrings','Neckwear','Carry & back'])assert.equal(await page.getByRole('combobox',{name,exact:true}).inputValue(),'none');
 await page.getByRole('group',{name:'Accessory style presets'}).screenshot({path:`${dir}/preset-controls.png`});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${dir}/mobile-creator.png`,fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal overflow');
 assert.deepEqual(errors,[]);await writeFile(`${dir}/report.json`,JSON.stringify({shots,pendantAbsent:true,preservesHair:true,clearVerified:true,mobileOverflow:false,errors},null,2));console.log('PASS',shots);
}finally{await browser.close();}
