import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createCozyLifeQaSession} from './helpers/cozy-life-session';
import type {LifeResponse} from '../../domain/cozy-life';
const origin=process.env.CTRL_QA_ORIGIN??'https://ctrl-staging.suhiro211.workers.dev',dir='test-results/cozy-life-account/live';await mkdir(dir,{recursive:true});
const session=await createCozyLifeQaSession(origin),checks:string[]=[],errors:string[]=[];
const profile=await session.post('habitat/public-profile',{name:'QA Activity Visitor',character:'female'});assert.equal(profile.status,200,await profile.clone().text());
// Public avatar only: NO Habitat claim, Key purchase, transaction, or owner assets.
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 for(const mobile of [true,false]){
  const label=mobile?'phone':'desktop',context=await browser.newContext({viewport:mobile?{width:390,height:760}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const split=session.cookie.indexOf('=');await context.addCookies([{name:session.cookie.slice(0,split),value:session.cookie.slice(split+1),url:origin,httpOnly:true,sameSite:'Lax',secure:origin.startsWith('https:')}]);
  const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',error=>errors.push(error.message));
  await p.goto(origin+'/public-world',{waitUntil:'domcontentloaded'});
  await p.getByRole('button',{name:'Controls',exact:true}).click();await p.getByRole('combobox',{name:'Graphics',exact:true}).selectOption('low');await p.getByRole('checkbox',{name:'Anime characters (rigged VRM)',exact:true}).uncheck();await p.getByRole('button',{name:'Close controls',exact:true}).click();
  await p.getByRole('button',{name:/Aktivitas/}).waitFor();
  await p.getByRole('button',{name:/Aktivitas/}).click();await p.locator('.cozy-storage[data-local="false"]').waitFor();await p.getByRole('button',{name:`Tanam petak ${mobile?1:2}`,exact:true}).waitFor();
  const bed=mobile?1:2;await p.locator(`#cozy-seed-${bed-1}`).selectOption('herb');
  const commit=async(name:string)=>{const response=p.waitForResponse(r=>r.url().endsWith('/api/cozy-life')&&r.request().method()==='POST');await p.getByRole('button',{name,exact:true}).click();const r=await response;assert.equal(r.status(),200,await r.text());};
  await commit(`Tanam petak ${bed}`);await commit(`Siram petak ${bed}`);
  const saved=await(await session.get('cozy-life')).json() as LifeResponse;assert.equal(saved.state.beds[bed-1].crop,'herb');assert(saved.state.beds[bed-1].readyAt);
  await p.screenshot({path:`${dir}/garden-${label}.png`,timeout:120000});
  await p.getByRole('tab',{name:/Barter/}).click();await p.getByRole('button',{name:'Segarkan papan barter',exact:true}).waitFor();assert.equal(await p.getByText('Barter antar pemain membutuhkan akun tersimpan di server.',{exact:false}).count(),0);await p.screenshot({path:`${dir}/barter-${label}.png`,timeout:120000});
  await p.keyboard.press('Escape');await p.locator('.cozy-dialog').waitFor({state:'hidden'});await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:/Aktivitas/}).click();await p.locator('.cozy-storage[data-local="false"]').waitFor();
  // Reopening after a full document reload reads the REAL signed-profile save.
  await p.getByRole('progressbar',{name:`Pertumbuhan petak ${bed}`,exact:true}).waitFor();
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push(`${label}:real-public-avatar-authenticated-garden-plant-water-server-save-reload-barter-dialog-and-escape`);console.log('LIFE_ACCOUNT_CHECK',checks.at(-1));await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${dir}/report.json`,JSON.stringify({origin,checks,errors,mobile:'Chromium touch emulation, not physical hardware',identity:'fresh unfunded QA wallet; public avatar only; no Key or Habitat claim'},null,2));console.log('COZY_LIFE_ACCOUNT_UI_PASS');
}finally{await browser.close();await session.logout();}
