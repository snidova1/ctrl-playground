import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin=process.env.CTRL_STAGING_ORIGIN;
assert(origin&&/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin),'Isolated loopback origin required');
const dir='test-results/anime-vrm';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const results=[];
try{
 for(const mobile of [false,true]){
  const device=mobile?'phone':'desktop';
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage();page.setDefaultTimeout(90000);
  const errors=[],models=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/shader|webglprogram|validate_status/i.test(m.text()))errors.push(m.text());});
  page.on('request',r=>{if(/\.(vrm|glb)(\?|$)/i.test(r.url()))models.push(r.url());if(r.method()==='POST'&&new URL(r.url()).pathname.startsWith('/api/'))writes.push(r.url());});

  const click=async(name)=>{const target=page.getByRole('button',{name,exact:true});if(mobile)await target.tap();else await target.click();};
  assert.equal((await page.goto(`${origin}/avatar-studio`,{waitUntil:'domcontentloaded'})).status(),200);
  await page.locator('.hb-avatar-preview[data-avatar-ready="true"]').waitFor();
  for(const gender of ['female','male']){
   await click(gender==='female'?'Female':'Male');
   await page.locator(`[data-avatar-gender="${gender}"]`).waitFor();
   await page.waitForFunction(g=>document.querySelector('.hb-avatar-preview')?.getAttribute('data-avatar-ready')==='true'&&document.documentElement.dataset.ctrlAvatarModel===`ctrl-anime-${g}`,gender);
   await page.waitForTimeout(750);
   await page.screenshot({path:`${dir}/${device}-${gender}-full.png`,fullPage:true});
   await click('Face detail');await page.waitForTimeout(750);
   await page.locator('.as-stage').screenshot({path:`${dir}/${device}-${gender}-face.png`});
   await click('Face detail');
  }
  await page.getByRole('combobox',{name:'Hair',exact:true}).selectOption('ink');
  await page.getByRole('combobox',{name:'Eyes',exact:true}).selectOption('ocean');
  await page.getByRole('combobox',{name:'Skin',exact:true}).selectOption('deep');
  await page.getByRole('combobox',{name:'Wardrobe',exact:true}).selectOption('slate');
  await click('Walk');await page.waitForTimeout(700);
  const before=await page.locator('.as-preview canvas').screenshot();
  await page.waitForTimeout(350);
  const after=await page.locator('.as-preview canvas').screenshot();
  assert(!before.equals(after),'Rendered character animation must advance, not only button state');
  await click('Say hello');await page.waitForTimeout(700);
  await page.screenshot({path:`${dir}/${device}-custom-wave.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Studio stays within the viewport');
  const actualModels=models.filter(url=>/\.vrm(\?|$)/i.test(url));
  assert(actualModels.length>=2,'Both actual VRM models must be requested');
  assert(actualModels.every(url=>new URL(url).pathname.startsWith('/plaza/characters/anime/')),'Use the new authored anime models, not the rejected legacy/procedural avatars');
  assert.deepEqual(writes,[],'Studio must not mutate wallet/profile/Habitat state');
  assert.deepEqual(errors,[],'No runtime or shader failures');
  results.push({device,renderer:'anime-vrm-mtoon',genders:['female','male'],faceDetail:true,appearanceControls:true,animatedPixels:true,actualModelRequests:actualModels,privateWrites:writes,errors});
  await context.close();
 }
 await writeFile(`${dir}/report.json`,JSON.stringify({origin,devices:results},null,2));
 console.log('Proper anime VRM PC + phone: PASS (both actual authored anime models, face detail, colors, rendered animation, zero private writes).');
}finally{await browser.close();}
