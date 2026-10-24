import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.CTRL_AVATAR_QA_ORIGIN??'http://127.0.0.1:3173';
assert(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin),'Loopback QA only');
const dir='test-results/avatar-gesture-polish';await mkdir(dir,{recursive:true});
const b=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const results=[];
try{for(const mobile of [false,true]){
 const device=mobile?'phone':'desktop',family=mobile?'neurohacker':'drophunter';
 const context=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,...(!mobile?{recordVideo:{dir:`${dir}/video`,size:{width:1280,height:900}}}:{})});
 const p=await context.newPage(),start=Date.now();p.setDefaultTimeout(60000);
 const errors:string[]=[],writes:string[]=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|webglprogram/i.test(m.text()))errors.push(m.text());});p.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.startsWith('/api/'))writes.push(r.url());});
 const state=()=>p.evaluate(()=>({...document.documentElement.dataset}));
 const click=async(name:string)=>{const target=p.getByRole('button',{name,exact:true});if(mobile)await target.tap();else await target.click();};
 const waitGesture=async(id:string)=>p.waitForFunction(id=>document.documentElement.dataset.ctrlAvatarGesture===id,id);
 const waitState=async(id:string)=>p.waitForFunction(id=>document.documentElement.dataset.ctrlAvatarState===id,id);
 try{
  await p.goto(`${origin}/avatar-studio`,{waitUntil:'domcontentloaded'});await p.locator('.hb-avatar-preview[data-avatar-ready="true"]').waitFor();
  if(mobile){await p.getByRole('combobox',{name:'Body & outfit model',exact:true}).selectOption('modular:neurohacker');await p.waitForFunction(()=>document.documentElement.dataset.ctrlAvatarModularFamily==='neurohacker'&&document.querySelector('.hb-avatar-preview')?.getAttribute('data-avatar-ready')==='true');}
  const instance=(await state()).ctrlAvatarInstance;
  await p.getByRole('combobox',{name:'Expression',exact:true}).selectOption('sad');await p.locator('.as-stage').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));const readyOffset=(Date.now()-start)/1000;
  await click('Walk');await waitState('Walk');await click('Say hello');await waitGesture('interact');
  await p.locator('.as-stage').screenshot({path:`${dir}/${device}-wave.png`});
  await waitGesture('none');await waitState('Walk');assert.equal((await state()).ctrlAvatarExpression,'sad');
  await click('Cheer');await waitGesture('victory');await click('Say hello');await waitGesture('interact');
  await click('Cancel gesture');await waitGesture('none');await waitState('Walk');
  await click('Run');await waitState('Run');await click('Cheer');await waitGesture('victory');await waitGesture('none');await waitState('Run');
  await click('Relax');await waitState('Idle');await click('Say hello');await waitGesture('interact');await click('Sit');await waitGesture('none');await waitState('Seated');
  await p.locator('.as-stage').screenshot({path:`${dir}/${device}-seated.png`});
  await click('Relax');await waitState('Idle');await click('Cheer');await waitGesture('victory');await p.waitForFunction(()=>JSON.parse(document.documentElement.dataset.ctrlAvatarFaceWeights??'{}').happy>.4);await click('Face detail');
  await p.locator('.as-stage').screenshot({path:`${dir}/${device}-cheer-face.png`});await waitGesture('none');await waitState('Idle');
  await p.waitForFunction(()=>{const w=JSON.parse(document.documentElement.dataset.ctrlAvatarFaceWeights??'{}');return w.sad>.6&&w.happy===0&&w.relaxed===0;});assert.equal((await state()).ctrlAvatarExpression,'sad','Temporary emote must retain creator baseline');
  assert.equal((await state()).ctrlAvatarInstance,instance,'Gestures must not reload or replace the body');
  await click('Cheer');await waitGesture('victory');const nextFamily=family==='drophunter'?'neurohacker':'drophunter';await p.getByRole('combobox',{name:'Body & outfit model',exact:true}).selectOption(`modular:${nextFamily}`);
  await p.waitForFunction(f=>document.documentElement.dataset.ctrlAvatarModularFamily===f&&document.querySelector('.hb-avatar-preview')?.getAttribute('data-avatar-ready')==='true',nextFamily);await waitGesture('none');assert.notEqual((await state()).ctrlAvatarInstance,instance);await click('Say hello');await waitGesture('interact');await waitGesture('none');await waitState('Idle');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(mobile){const bounds=await p.getByRole('button',{name:'Say hello',exact:true}).boundingBox();assert(bounds&&bounds.height>=44,'Touch gesture target at least 44px');}
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  const video=p.video();await context.close();
  results.push({device,family,readyOffset,video:video?await video.path():null,waveRestoresWalk:true,cheerRestoresRun:true,cancelAndReplacement:true,seatedInterruption:true,sameBodyInstance:true,modelSwapCancels:true,newModelGesturesWork:true,baseline:'sad',privateWrites:writes,errors});
  console.log('PASS GESTURE POLISH',device,family,'one-shot -> current walk/run; replacement/cancel; sit interruption; expression baseline; same body; no writes/errors');
 }catch(e){console.error('DIAG',device,JSON.stringify(await state()));await p.screenshot({path:`${dir}/${device}-failure.png`,fullPage:true});throw e;}finally{await context.close();}
}
 await writeFile(`${dir}/report.json`,JSON.stringify(results,null,2));
}finally{await b.close();}
