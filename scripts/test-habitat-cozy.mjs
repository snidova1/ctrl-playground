import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const origin=process.env.APP_ORIGIN || 'http://127.0.0.1:3106';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CTRL_TEST_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const report=[];
try {
 for(const [device,viewport] of [['desktop',{width:1440,height:960}],['mobile',{width:390,height:844}]]) {
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const errors=[],poseWrites=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',async r=>{if(r.url().endsWith('/api/habitat/pose')&&r.ok()) {try {poseWrites.push((await r.json()).accepted);}catch{}}});
  await page.goto(origin);
  await page.getByRole('button',{name:'Enter guest workshop',exact:true}).click();
  await page.getByLabel('Name',{exact:true}).fill(`Cozy ${device}`);
  await page.getByRole('button',{name:'Enter my world draft',exact:true}).click();
  await page.getByRole('button',{name:'Build my world +',exact:true}).waitFor();
  await page.waitForFunction(()=>!!document.querySelector('canvas'),{},{timeout:60000});
  await page.waitForTimeout(5000);
  assert.equal(await page.getByText('The world could not render.',{exact:true}).count(),0);
  const initial=await page.evaluate(()=>fetch('/api/habitat/state').then(r=>r.json()));
  assert(initial.profile&&initial.canEdit);
  await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');
  await page.waitForTimeout(1500);
  assert(poseWrites.some(p=>p&&Math.hypot(p.x,p.z-6)>.05),'Movement must reach real server');
  await page.getByRole('button',{name:'Jump',exact:true}).click();
  await page.getByRole('button',{name:'Celebrate',exact:true}).click();
  await page.getByRole('button',{name:'Build my world +',exact:true}).click();
  await page.getByRole('button',{name:'Light +',exact:true}).click();
  const save=page.getByRole('button',{name:/Save world/});
  await save.click();
  await page.getByText('World saved. Visitors can see the changes.',{exact:true}).waitFor();
  const saved=await page.evaluate(()=>fetch('/api/habitat/state').then(r=>r.json()));
  assert(saved.world.objects.some(o=>o.behavior==='light'));
  await page.reload();
  await page.getByRole('button',{name:'Build my world +',exact:true}).waitFor();
  const persisted=await page.evaluate(()=>fetch('/api/habitat/state').then(r=>r.json()));
  assert.equal(persisted.world.objects.length,saved.world.objects.length);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByLabel('Graphics',{exact:true}).selectOption('high');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.waitForTimeout(4000);
  await page.screenshot({path:`test-results/habitat-cozy-${device}.png`});
  assert.equal(await page.getByRole('link',{name:'Compare Common Ground ↗',exact:true}).getAttribute('href'),'/courtyard');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
  assert.deepEqual(errors,[]);
  report.push({device,guest:true,movement:true,buildSave:true,persistence:true,highQuality:true,errors,screenshot:`test-results/habitat-cozy-${device}.png`});
  await context.close();
 }
 const page=await browser.newPage();await page.goto(`${origin}/courtyard`);
 await page.getByRole('button',{name:'Enter the plaza',exact:true}).waitFor({timeout:60000});
 await page.screenshot({path:'test-results/common-ground-comparison.png'});
 report.push({commonGroundRoute:true});
 console.log(JSON.stringify(report,null,2));
 await writeFile('test-results/habitat-cozy-report.json',JSON.stringify(report,null,2));
} finally {await browser.close();}
