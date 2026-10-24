import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='test-results/avatar-independent-hair';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({baseURL:process.env.CTRL_AVATAR_QA_ORIGIN??'http://127.0.0.1:3173',viewport:{width:1440,height:1000}});page.setDefaultTimeout(120000);const errors=[],models=[],cases=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\.vrm(?:\?|$)/.test(r.url()))models.push(r.url());});
try{
 await page.goto('/avatar-studio',{waitUntil:'domcontentloaded',timeout:180000});
 await page.waitForFunction(()=>document.querySelector('.hb-avatar-preview')?.dataset.avatarReady==='true');
 for(const [gender,look] of [['female','alternate'],['male','original']]){
  await page.getByRole('button',{name:gender==='male'?'Male':'Female',exact:true}).click();
  await page.getByRole('combobox',{name:'Body & outfit model',exact:true}).selectOption(look);
  await page.getByRole('button',{name:'Clear accessories',exact:true}).click();
  const styles=await page.getByRole('combobox',{name:'Hairstyle',exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value));
  for(const style of styles){
   await page.getByRole('combobox',{name:'Hairstyle',exact:true}).selectOption(style);
   await page.waitForFunction(({gender,look,style})=>document.querySelector('.hb-avatar-preview')?.dataset.avatarReady==='true'&&document.documentElement.dataset.ctrlAvatarModel===`ctrl-anime-${gender}${look==='alternate'?'-studio':''}`&&document.documentElement.dataset.ctrlAvatarHairStyle===style,{gender,look,style});
   await page.waitForTimeout(800);await page.locator('.as-stage').screenshot({path:`${dir}/${gender}-${style}.png`});
   cases.push({gender,look,style,model:await page.evaluate(()=>document.documentElement.dataset.ctrlAvatarModel)});
   if(style.startsWith('cc0-')){
    const canvas=page.locator('.hb-avatar-preview canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();assert(box);
    for(let quarter=0;quarter<4;quarter++){
     const x=box.x+box.width*.7,y=box.y+box.height*.45;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-box.height/4,y,{steps:12});await page.mouse.up();await page.waitForTimeout(350);
     if(quarter<2)await page.locator('.as-stage').screenshot({path:`${dir}/${gender}-${style}-${quarter===0?'side':'rear'}.png`});
    }
   }
  }
  await page.getByRole('combobox',{name:'Expression',exact:true}).selectOption('happy');await page.waitForTimeout(500);
  await page.getByRole('combobox',{name:'Expression',exact:true}).selectOption('sad');await page.waitForTimeout(500);
  await page.getByRole('combobox',{name:'Expression',exact:true}).selectOption('neutral');await page.waitForTimeout(500);
 }
 assert.deepEqual(errors,[]);await writeFile(`${dir}/report.json`,JSON.stringify({cases,models,errors},null,2));console.log('PASS',JSON.stringify(cases));
}finally{await browser.close();}
