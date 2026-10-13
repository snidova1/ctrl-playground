import {chromium,expect} from '@playwright/test';
import {spawn,execFile,execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {promisify} from 'node:util';
import {installSignedWallet} from '../../tests/browser/helpers/wallet';

// REA attaches passively to our isolated browser. This script, not REA, owns
// the browser/server lifecycles and supplies real synthetic wallet signatures.
const run=promisify(execFile);
const origin='http://127.0.0.1:3188',cdp='http://127.0.0.1:9334';
const output=path.resolve(process.argv[2]??'outputs/rea-town-observation');
const temp=mkdtempSync(path.join(tmpdir(),'ctrl-rea-town-'));
const env={...process.env,CTRL_BUILD_TARGET:'node',CTRL_LOCAL_DB:path.join(temp,'world.sqlite'),APP_ORIGIN:origin,CTRL_MODE:'mock',NEXT_TELEMETRY_DISABLED:'1'};
mkdirSync(output,{recursive:true});
execFileSync(process.execPath,['scripts/migrate-local.mjs'],{env});
const server=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3188'],{env,stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',b=>{log+=b;});server.stderr.on('data',b=>{log+=b;});
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
async function rea(name:string,args:string[]){
 const result=await run('npx',['-y','rea-agents@6.4.0',name,...args,'--json'],{timeout:120000,maxBuffer:32*1024*1024});
 const value=JSON.parse(result.stdout);
 writeFileSync(path.join(output,name+'.json'),JSON.stringify(value));
 return value;
}
function targets(value:unknown):{target_id?:string;id?:string;url?:string}[]{
 if(!value||typeof value!=='object')return [];
 const object=value as Record<string,unknown>;
 const found=typeof object.url==='string'&&(typeof object.target_id==='string'||typeof object.id==='string')?[object]:[];
 return [...found,...Object.values(object).flatMap(targets)];
}
function pngData(value:unknown):string|null{
 if(typeof value==='string'&&value.startsWith('iVBORw0KGgo')&&value.length>100)return value;
 if(!value||typeof value!=='object')return null;
 for(const child of Object.values(value)){const result=pngData(child);if(result)return result;}
 return null;
}
try{
 browser=await chromium.launch({executablePath:process.env.CTRL_CHROMIUM_PATH,args:['--remote-debugging-address=127.0.0.1','--remote-debugging-port=9334','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 await expect.poll(async()=>{try{return (await fetch(origin)).status;}catch{return 0;}},{timeout:45000}).toBe(200);
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await installSignedWallet(page);
 await page.goto(origin+'/public-world');
 await page.locator('.wallet-options').getByRole('button',{name:'Connect wallet',exact:true}).click();
 const verified=page.waitForResponse(r=>r.url().endsWith('/api/auth/verify')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Sign in to Habitat',exact:true}).click();
 expect((await verified).status()).toBe(200);
 await expect(page.getByRole('region',{name:'3D character creator'})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Female',exact:true}).click();
 await page.getByRole('textbox',{name:'Name',exact:true}).fill('REA Garden Visitor');
 await page.getByRole('button',{name:'Enter Public World',exact:true}).click();
 await expect(page.locator('.hb-title h1')).toHaveText('Willow Square',{timeout:45000});
 await expect(page.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
 await page.waitForTimeout(1200);
 const discovery=await rea('list-browser-targets',[cdp]);
 const target=targets(discovery).find(t=>t.url?.startsWith(origin+'/public-world'));
 if(!target)throw Error('REA did not discover the explicitly owned CTRL page');
 const id=target.target_id??target.id!;
 const inspection=await rea('inspect-web-page',[cdp,id,'--observation-ms','1000']);
 const shot=await rea('capture-web-screenshot',[cdp,id]);
 const png=pngData(shot);
 if(!png)throw Error('REA screenshot did not contain an inline PNG artifact');
 writeFileSync(path.join(output,'rea-desktop.png'),Buffer.from(png,'base64'));
 // A separate actual mobile capture, same authorized signed character/runtime.
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(1200);
 const mobile=await rea('capture-web-screenshot',[cdp,id]);
 writeFileSync(path.join(output,'rea-mobile.json'),JSON.stringify(mobile));
 const mobilePng=pngData(mobile);if(!mobilePng)throw Error('REA mobile screenshot artifact missing');
 writeFileSync(path.join(output,'rea-mobile.png'),Buffer.from(mobilePng,'base64'));
 const details:Record<string,unknown>={};
 if(process.argv.includes('--details')){
  await page.setViewportSize({width:1440,height:900});
  await page.locator('.hb-top').getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByLabel('Graphics').selectOption('high');
  await page.locator('.hb-panel').getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
  await page.mouse.move(720,400);await page.mouse.down();await page.mouse.move(720,475,{steps:10});await page.mouse.up();
  await page.waitForTimeout(1200);
  const detail=await rea('capture-web-screenshot',[cdp,id]);
  const detailPng=pngData(detail);if(!detailPng)throw Error('REA desktop detail screenshot missing');
  writeFileSync(path.join(output,'rea-desktop-detail.png'),Buffer.from(detailPng,'base64'));details.detailScreenshotEvidence=detail.evidence_id;
  const position=async()=>{const s=await (await page.request.get(origin+'/api/habitat/state')).json();const p=s.players.find((p:{id:string})=>p.id===s.profile.id) as {x:number;z:number};return {x:p.x,z:p.z};};
  await page.keyboard.down('KeyD');
  try{await expect.poll(async()=>(await position()).x,{timeout:90000}).toBeGreaterThan(16);}finally{await page.keyboard.up('KeyD');}
  await page.keyboard.down('KeyW');
  try{await expect.poll(async()=>(await position()).z,{timeout:60000}).toBeLessThan(3.6);}finally{await page.keyboard.up('KeyW');}
  await page.mouse.move(720,400);await page.mouse.down();await page.mouse.move(870,400,{steps:10});await page.mouse.up();
  await page.waitForTimeout(1200);
  const district=await rea('capture-web-screenshot',[cdp,id]);
  const districtPng=pngData(district);if(!districtPng)throw Error('REA district screenshot missing');
  writeFileSync(path.join(output,'rea-district.png'),Buffer.from(districtPng,'base64'));details.districtScreenshotEvidence=district.evidence_id;details.signedDistrictPosition=await position();
 }
 expect(errors).toEqual([]);
 const summary={sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),observedAt:new Date().toISOString(),origin,reaVersion:'6.4.0',discoveryEvidence:discovery.evidence_id,inspectionEvidence:inspection.evidence_id,screenshotEvidence:shot.evidence_id,mobileScreenshotEvidence:mobile.evidence_id,...details,errors};
 writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2));
 console.log(JSON.stringify(summary));
}finally{
 await browser?.close();server.kill('SIGTERM');writeFileSync(path.join(output,'server.log'),log);
}
