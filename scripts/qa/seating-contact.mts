import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHabitatTestSnapshot} from '../../features/habitat/test-snapshot';
const origin=process.env.CTRL_QA_ORIGIN??'http://127.0.0.1:3246',label=process.env.CTRL_SEAT_LABEL??'before',dir=`test-results/seating-contact/${label}`,mobile=process.env.CTRL_SEAT_MOBILE==='1';
await mkdir(dir,{recursive:true});
const snapshot=createHabitatTestSnapshot();snapshot.objects=snapshot.objects.filter(o=>o.behavior!=='seat');
snapshot.objects.push({id:crypto.randomUUID(),assetId:process.env.CTRL_SEAT_ASSET??'furniture-kit/bench',name:'Seat contact fixture',x:0,y:0,z:4.2,rotation:Number(process.env.CTRL_SEAT_ROTATION??0),scale:Number(process.env.CTRL_SEAT_SCALE??2.2),behavior:'seat',target:''});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({baseURL:origin,viewport:{width:mobile?390:1000,height:760},hasTouch:mobile,isMobile:mobile});
 await context.addInitScript(s=>localStorage.setItem('ctrl-habitat-test-v1',JSON.stringify(s)),snapshot);
 const p=await context.newPage();p.setDefaultTimeout(60000);const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('/habitat-test');await p.waitForFunction(()=>Number(document.documentElement.dataset.ctrlAvatarMeshCount)>0);
 const states=[];
 for(let cycle=0;cycle<2;cycle++){
  const sit=p.getByRole('button',{name:/Sit down$/});if(mobile)await sit.tap();else await sit.click();
  await p.waitForFunction(()=>document.documentElement.dataset.ctrlAvatarState==='Seated'&&Number.isFinite(Number(document.documentElement.dataset.ctrlAvatarHipY)));
  if(process.argv.includes('--assert-contact'))await p.waitForFunction(()=>document.documentElement.dataset.ctrlAvatarSeatContactSettled==='true');
  await p.screenshot({path:`${dir}/${cycle?'reseated':'seated'}.png`});
  const state=await p.evaluate(()=>({hipY:Number(document.documentElement.dataset.ctrlAvatarHipY),seatY:Number(document.documentElement.dataset.ctrlAvatarSeatSurfaceY),contactY:document.documentElement.dataset.ctrlAvatarSeatContactY===undefined?null:Number(document.documentElement.dataset.ctrlAvatarSeatContactY),position:document.querySelector('.hb-house-location')?.outerHTML}));states.push(state);
  await writeFile(`${dir}/report.json`,JSON.stringify({origin,label,mobile,asset:snapshot.objects.at(-1),states,errors},null,2));console.log('SEATED_CONTACT',JSON.stringify(state));assert.deepEqual(errors,[]);
  if(process.argv.includes('--assert-contact')){assert.notEqual(state.contactY,null,'Actual posed mesh contact required, not just hip joint');assert(Math.abs(state.contactY!-state.seatY)<.025,'Visible support must sit on cushion');assert(state.hipY>state.seatY+.025,'Hip joint center must be above seat');}
  if(process.argv.includes('--closeup')&&cycle===0){await p.mouse.move(mobile?195:600,300);await p.mouse.wheel(0,-900);await p.waitForFunction(()=>{const camera=JSON.parse(document.documentElement.dataset.ctrlHouseCamera??'{}'),location=document.querySelector<HTMLOutputElement>('.hb-house-location');return location&&camera.z-Number(location.dataset.playerZ)<4.5;});await p.screenshot({path:`${dir}/seated-closeup.png`});}
  const stand=p.getByRole('button',{name:/Stand up$/});if(mobile)await stand.tap();else await stand.click();
  await p.waitForFunction(()=>document.documentElement.dataset.ctrlAvatarHipY===undefined&&document.documentElement.dataset.ctrlAvatarState==='Idle');
 }
 await context.close();console.log('SEATING_CONTACT_PASS',label,mobile?'touch':'desktop');
}finally{await browser.close();}
