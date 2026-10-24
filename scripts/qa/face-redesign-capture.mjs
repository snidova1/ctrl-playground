import{chromium}from'@playwright/test';
import{mkdir,writeFile}from'node:fs/promises';
import assert from'node:assert/strict';
const dir='test-results/face-redesign';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});const report=[];
try{
 for(const family of['drophunter','neurohacker'])for(const mode of['before','after'])for(const expression of(mode==='before'?['neutral']:['neutral','happy','blink'])){
  const c=await browser.newContext({viewport:{width:720,height:720}});const page=await c.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/plaza/characters/modular/**/*.vrm',async route=>{let url=route.request().url();if(/\/(body|eyes)\//.test(url)){url=url.replace('-soft-anime','');if(mode==='after')url=url.replace(/(-mobile)?\.vrm$/,(_,mobile)=>'-soft-anime'+(mobile??'')+'.vrm');}await route.continue({url});});
  await page.goto(`http://127.0.0.1:3198/?family=${family}&expression=${expression}`);await page.waitForFunction(()=>document.body.dataset.ready==='true'||document.body.dataset.error,{},{timeout:60000});
  assert.equal(await page.evaluate(()=>document.body.dataset.error),undefined);assert.deepEqual(errors,[]);
  const state=await page.evaluate(()=>window.ctrlFace);assert(state?.expressions.length>0);
  await page.screenshot({path:`${dir}/${family}-${mode}-${expression}.png`});report.push({family,mode,expression,...state,errors});console.log('FACE_RENDER_PASS',family,mode,expression,state.head,state.expressions.length);await c.close();
 }
 await writeFile(`${dir}/render-report.json`,JSON.stringify(report,null,2));
}finally{await browser.close();}
