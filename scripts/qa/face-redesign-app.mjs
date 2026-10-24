import{chromium}from'@playwright/test';import{writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const origin='http://127.0.0.1:3198',dir='test-results/face-redesign';
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});const results=[];
try{for(const mobile of[false,true])for(const family of['drophunter','neurohacker']){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1120,height:800},isMobile:mobile,hasTouch:mobile});const page=await context.newPage();page.setDefaultTimeout(60000);const assets=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('-soft-anime'))assets.push({url:r.url(),status:r.status()});});
 try{
 // Actual unmodified shared React creator + controls, freshly bundled from source; NO route overrides.
 await page.goto(`${origin}/live.html?family=${family}`,{waitUntil:'domcontentloaded'});await page.locator('.hb-avatar-preview[data-avatar-ready="true"]').waitFor();
 await page.waitForFunction(f=>document.documentElement.dataset.ctrlAvatarModularFamily===f,family);
 const hair=family==='drophunter'?'straight':'short';await page.getByRole('combobox',{name:'Hairstyle',exact:true}).selectOption(hair);await page.waitForFunction(h=>(document.documentElement.dataset.ctrlAvatarModularParts??'').includes('hair/'+h)&&document.querySelector('.hb-avatar-preview')?.getAttribute('data-avatar-ready')==='true',hair);
 await page.getByRole('combobox',{name:'Expression',exact:true}).selectOption('neutral');await page.waitForFunction(()=>{const s=document.documentElement.dataset.ctrlAvatarFaceWeights;return !s||(JSON.parse(s).blink??0)<.02;});
 await page.locator('.live-stage').screenshot({path:`${dir}/app-${family}-${mobile?'phone':'desktop'}-neutral.png`});
 const tops=await page.getByRole('combobox',{name:'Top',exact:true}).evaluate(e=>({old:e.value,next:[...e.options].find(o=>o.value!==e.value).value}));
 await page.getByRole('combobox',{name:'Top',exact:true}).selectOption(tops.next);await page.waitForFunction(t=>(document.documentElement.dataset.ctrlAvatarModularParts??'').includes('top/'+t)&&document.querySelector('.hb-avatar-preview')?.getAttribute('data-avatar-ready')==='true',tops.next);
 await page.getByRole('combobox',{name:'Expression',exact:true}).selectOption('happy');await page.waitForFunction(()=>JSON.parse(document.body.dataset.liveAppearance).expressionId==='happy');
 await page.locator('.live-stage').screenshot({path:`${dir}/app-${family}-${mobile?'phone':'desktop'}-happy-swap.png`});
 const state=await page.evaluate(()=>({...document.documentElement.dataset}));assert(assets.some(x=>x.url.includes(`${family}/body/`)));assert(assets.some(x=>x.url.includes(`${family}/eyes/`)));assert(assets.every(x=>x.status===200));assert(assets.every(x=>x.url.includes('-mobile')===mobile));assert.deepEqual(errors,[]);
 results.push({family,mobile,actualSharedReactComponent:true,noRouteOverrides:true,wardrobeSwap:tops,assets,errors,state});console.log('REAL_CREATOR_FACE_PASS',family,mobile?'touch/low':'desktop/high','wardrobe+expression',assets.length,'new catalog assets');
 }catch(e){await page.screenshot({path:`${dir}/app-${family}-${mobile?'phone':'desktop'}-failure.png`});console.log('APP_ERRORS',errors,'DATA',await page.evaluate(()=>({...document.documentElement.dataset})));throw e;}finally{await context.close();}
}await writeFile(`${dir}/app-report.json`,JSON.stringify(results,null,2));}finally{await browser.close();}
