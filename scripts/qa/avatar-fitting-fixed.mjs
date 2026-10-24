import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='test-results/avatar-fitting-fixed';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000);const errors=[],shots=[];page.on('pageerror',e=>errors.push(e.message));
try{
 assert.equal((await page.goto('http://127.0.0.1:3170/avatar-studio')).status(),200);
 for(const gender of ['female','male']){
  await page.getByRole('button',{name:gender==='male'?'Male':'Female',exact:true}).click();
  await page.locator('.hb-avatar-preview[data-avatar-ready="true"]').waitFor();
  const choices=await page.getByRole('combobox',{name:'Hair & outfit model',exact:true}).locator('option').allTextContents();
  if(gender==='male')assert.equal(choices.length,1,'Rejected male studio must be absent');
  await page.getByRole('combobox',{name:'Earrings',exact:true}).selectOption('drops');
  await page.getByRole('combobox',{name:'Neckwear',exact:true}).selectOption('none');
  await page.getByRole('combobox',{name:'Carry & back',exact:true}).selectOption('satchel');
  await page.locator('.hb-avatar-preview[data-avatar-ready="true"]').waitFor();await page.waitForTimeout(800);
  await page.locator('.as-stage').screenshot({path:`${dir}/${gender}-jewelry-bag.png`});shots.push(`${gender}-jewelry-bag.png`);
  await page.getByRole('button',{name:'Walk',exact:true}).click();await page.waitForTimeout(900);
  await page.locator('.as-stage').screenshot({path:`${dir}/${gender}-walking-bag.png`});shots.push(`${gender}-walking-bag.png`);
  await page.getByRole('button',{name:'Relax',exact:true}).click();
  await page.getByRole('combobox',{name:'Neckwear',exact:true}).selectOption('scarf');await page.waitForTimeout(800);
  await page.locator('.as-stage').screenshot({path:`${dir}/${gender}-scarf.png`});shots.push(`${gender}-scarf.png`);
 }
 assert.deepEqual(errors,[]);await writeFile(`${dir}/report.json`,JSON.stringify({shots,errors,maleChoices:1},null,2));console.log('PASS',JSON.stringify(shots));
}finally{await browser.close();}
