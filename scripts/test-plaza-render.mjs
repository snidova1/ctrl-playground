// Offline browser integration: real components, assets and API handlers, isolated SQLite.
// No development server or paid model calls. Useful when a CI browser has no network.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {chromium, devices} from '@playwright/test';
const require = createRequire(import.meta.url);
const {build} = await import(require.resolve('esbuild', {paths:[require.resolve('tsx')]}));
const preview=process.env.CTRL_CHARACTER_PREVIEW==='1',boundaryOnly=process.env.CTRL_TEST_SCOPE==='character',prefix=(preview?'vrm-playground':'plaza')+(boundaryOnly?'-boundary':'');
const root = process.cwd(), output = path.join(root,'.sites-runtime',prefix+'-render');
await mkdir(output,{recursive:true});
process.env.CTRL_LOCAL_DB = path.join(output,`qa-${Date.now()}.sqlite`);
process.env.CTRL_MODE = 'mock';
process.env.APP_ORIGIN = 'http://terminal.local:4173';
delete process.env.ORBIO_API_KEY;
execFileSync(process.execPath,['scripts/migrate-local.mjs'],{stdio:'pipe'});
await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Plaza from './features/plaza/plaza-app';import{Shell}from'./components/shell';import '@fontsource-variable/geist/index.css';import '@fontsource/ibm-plex-mono/400.css';createRoot(document.getElementById('root')).render(<Shell><Plaza characterPreview={${preview}}/></Shell>);`,resolveDir:root,loader:'tsx'},bundle:true,format:'esm',platform:'browser',outfile:path.join(output,'app.js'),loader:{'.woff2':'file','.woff':'file'},define:{'process.env.NODE_ENV':'"production"'},minify:true,plugins:[{name:'react-dynamic',setup(b){b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'nav-shim'}));b.onLoad({filter:/.*/,namespace:'nav-shim'},()=>({contents: `export const usePathname=()=>${preview?"'/character-preview'":"'/'"};`,loader:'js',resolveDir:root}));b.onResolve({filter:/^next\/dynamic$/},()=>({path:'dynamic',namespace:'shim'}));b.onLoad({filter:/.*/,namespace:'shim'},()=>({contents:`import React from 'react';export default function dynamic(loader){const C=React.lazy(loader);return function Dynamic(p){return React.createElement(React.Suspense,{fallback:null},React.createElement(C,p))}}`,loader:'js',resolveDir:root}));}}]});
await build({entryPoints:['server/plaza/service.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:path.join(output,'server.mjs'),alias:{'@/lib/platform':path.join(root,'lib/platform-node.ts')}});
const {handlePlaza} = await import(path.join(output,'server.mjs'));
const reset = `*{box-sizing:border-box}body{margin:0;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}button{cursor:pointer}button:disabled{cursor:not-allowed}h1,h2,h3,p{margin:0}`;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${reset}</style><link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script></html>`;
const mime={'.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.vrm':'model/gltf-binary','.woff2':'font/woff2','.woff':'font/woff','.svg':'image/svg+xml','.png':'image/png'};
async function intercept(context){await context.route('http://terminal.local:4173/**',async route=>{const r=route.request(),u=new URL(r.url());try{if(u.pathname.startsWith('/api/plaza/')){const response=await handlePlaza(new Request(r.url(),{method:r.method(),headers:await r.allHeaders(),body:r.postData()||undefined}),u.pathname.split('/').slice(3));await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});return;}if(u.pathname==='/'){await route.fulfill({contentType:'text/html',body:html});return;}const folder=u.pathname.startsWith('/plaza/')?path.join(root,'public'):output;const file=path.resolve(folder,'.'+u.pathname);if(!file.startsWith(folder+path.sep))throw Error('Invalid path');await route.fulfill({contentType:mime[path.extname(file)]??'application/octet-stream',body:await readFile(file)});}catch(e){console.error('Fixture route failed:',u.pathname,e.message);await route.fulfill({status:500,body:'Test fixture error'});}});}
const browser=await chromium.launch({headless:true,executablePath:process.env.CTRL_TEST_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const report=[];
await mkdir('test-results',{recursive:true});
try{for(const mobile of (process.env.CTRL_TEST_DEVICE==='mobile'?[true]:process.env.CTRL_TEST_DEVICE==='desktop'?[false]:[false,true])){
 const label=mobile?'mobile':'desktop';
 const context=await browser.newContext(mobile?{...devices['iPhone 13'],viewport:{width:390,height:844}}:{viewport:{width:1440,height:960},deviceScaleFactor:1});
 await intercept(context);const page=await context.newPage(),errors=[];
 const assets=[];page.on('request',r=>{if(r.url().includes('/plaza/characters/'))assets.push(new URL(r.url()).pathname);});
 page.on('pageerror',e=>{errors.push(e.message);console.error('Browser:',e.message);});
 page.on('console',m=>{if(m.type()==='error')console.error('Console:',m.text());});
 await page.goto(process.env.APP_ORIGIN);
 await page.getByLabel('What should we call you?').waitFor({timeout:60000});
 await page.screenshot({path:`test-results/${prefix}-${label}-welcome.png`});
 await page.getByLabel('What should we call you?').fill(`QA ${label}`);
 await page.getByRole('button',{name:'Enter the plaza',exact:true}).click();
 await page.getByRole('button',{name:'Build',exact:true}).waitFor();
 if(preview)await page.getByText('You · VRM preview',{exact:true}).waitFor({timeout:90000});
 await page.waitForTimeout(1500);
 await page.screenshot({path:`test-results/${prefix}-${label}-explore.png`});
 if(!boundaryOnly){
 if(mobile){const joy=await page.locator('.pl-joystick').boundingBox();await page.mouse.move(joy.x+50,joy.y+50);await page.mouse.down();await page.mouse.move(joy.x+75,joy.y+25);await page.waitForTimeout(1200);await page.mouse.up();assert.notEqual(await page.locator('.pl-bottom-left small').textContent(),'0.0 / 6.0 · QA mobile');}
 if(!mobile){await page.locator('canvas').focus();await page.keyboard.down('w');await page.waitForTimeout(1400);await page.keyboard.up('w');assert.notEqual(await page.locator('.pl-bottom-left small').textContent(),'0.0 / 6.0 · QA desktop');}
 if(preview){
  await page.locator('canvas').focus();
  await page.keyboard.down('Shift');await page.keyboard.down('a');await page.waitForTimeout(350);
  await page.screenshot({path:`test-results/${prefix}-${label}-run.png`});
  await page.keyboard.press('Space');await page.waitForTimeout(250);
  await page.screenshot({path:`test-results/${prefix}-${label}-jump.png`});
  await page.keyboard.up('a');await page.keyboard.up('Shift');await page.waitForTimeout(1000);
 }
 await page.getByRole('button',{name:'Build',exact:true}).click();
 await page.getByRole('button',{name:'Assemble object',exact:true}).click();
 await page.getByRole('button',{name:'Test',exact:true}).click();
 await page.waitForTimeout(900);
 await page.screenshot({path:`test-results/${prefix}-${label}-make.png`});
 await page.getByRole('button',{name:'Place',exact:true}).click();
 await page.getByRole('button',{name:'Confirm place',exact:true}).click();
 await page.getByText('Placed in the shared plaza. Someone else can use it now.',{exact:true}).waitFor();
 if(!mobile){
  // Deterministic fixture spawn at the object: movement is checked above. No
  // wall-clock path assumption (software WebGL and mobile have different FPS).
  const state=await page.evaluate(()=>fetch('/api/plaza/state').then(r=>r.json()));
  const target=state.objects.find(o=>o.ownerId===state.me.id&&o.kind==='dispenser');
  assert(target);
  await page.route('**/api/plaza/state',async route=>{
    // Apply at the new document's initial state request, after the old pose
    // timer is gone; applying before reload races its final presence write.
    const db=new DatabaseSync(process.env.CTRL_LOCAL_DB);
    db.prepare('UPDATE plaza_players SET x=?,z=?,moving=0 WHERE id=?').run(target.x,target.z+2,state.me.id);db.close();
    const response=await handlePlaza(new Request(route.request().url(),{headers:await route.request().allHeaders()}),['state']);
    await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
  },{times:1});
  await page.reload();await page.getByRole('button',{name:/Get a drink/}).waitFor({timeout:60000});
  if(preview)await page.getByText('You · VRM preview',{exact:true}).waitFor({timeout:90000});
await page.getByRole('button',{name:/Get a drink/}).click();await page.getByText('+1 CITRUS SODA · Added to your bag',{exact:true}).waitFor();await page.screenshot({path:`test-results/${prefix}-desktop-use.png`});}
 await page.getByRole('button',{name:/^Bag/}).click();
 if(!mobile){assert.equal(await page.locator('.pl-drink-card span').textContent(),'1 in your bag');await page.getByRole('button',{name:'Drink',exact:true}).click();await page.getByRole('button',{name:'Bag',exact:true}).click();assert.equal(await page.locator('.pl-drink-card span').textContent(),'0 in your bag');}
 assert.equal(await page.locator('.pl-object-list').count(),1);
 await page.reload();await page.getByRole('button',{name:'Bag',exact:true}).click();
 await page.locator('.pl-object-list').waitFor();
 const own=await page.evaluate(()=>fetch('/api/plaza/state').then(r=>r.json()));
 const other=await browser.newContext();await intercept(other);const visitor=await other.newPage();await visitor.goto(process.env.APP_ORIGIN);
 const shared=await visitor.evaluate(()=>fetch('/api/plaza/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Second visitor'})}).then(r=>r.json()));
 assert(shared.objects.some(o=>o.ownerId===own.me.id));
 await other.close();
 await page.getByRole('button',{name:/Remove Little refreshment station/}).click();
 await page.locator('.pl-object-list').waitFor({state:'detached'});
 if(!mobile){
  await page.getByRole('button',{name:'Build',exact:true}).click();
  await page.locator('textarea').fill('A blue bench');
  await page.getByRole('button',{name:'Assemble object',exact:true}).click();
  await page.getByRole('button',{name:'Place',exact:true}).click();
  await page.getByRole('button',{name:'Confirm place',exact:true}).click();
  await page.getByRole('button',{name:/Sit down/}).click();
  await page.getByRole('button',{name:/Stand up/}).waitFor();
  await page.waitForTimeout(2100);
  await page.screenshot({path:`test-results/${prefix}-desktop-seated.png`});
  await page.getByRole('button',{name:/Stand up/}).click();
  await page.getByRole('button',{name:/Sit down/}).waitFor();
  await page.getByRole('button',{name:'Bag',exact:true}).click();
  await page.getByRole('button',{name:/Remove A place to pause/}).click();
  await page.locator('.pl-object-list').waitFor({state:'detached'});
 }
 }
 if(preview&&!mobile){
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('combobox',{name:/Graphics/}).selectOption('low');
  await page.getByText('You · VRM preview',{exact:true}).waitFor({timeout:90000});
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await page.screenshot({path:`test-results/${prefix}-quality-low.png`});
  // Fail only the reviewed model fetch, prove MIO fallback and successful retry.
  await page.route('**/plaza/characters/victoria-desktop.vrm',r=>r.fulfill({status:503,body:'QA unavailable'}));
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('combobox',{name:/Graphics/}).selectOption('high');
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await page.getByText('Character unavailable',{exact:true}).waitFor({timeout:90000});
  await page.screenshot({path:`test-results/${prefix}-fallback.png`});
  await page.unroute('**/plaza/characters/victoria-desktop.vrm');
  await page.getByRole('button',{name:'Retry character',exact:true}).click();
  await page.getByText('You · VRM preview',{exact:true}).waitFor({timeout:90000});
 }
 if(preview){assert(assets.includes('/plaza/characters/victoria-'+(mobile?'mobile':'desktop')+'.vrm'));assert(assets.includes('/plaza/characters/humanoid-motions.glb'));}else assert.deepEqual(assets,[], 'Default Playground must not load the VRM candidate');
 assert.deepEqual(errors,[]);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 report.push({device:label,passed:true,checks:boundaryOnly?['WebGL render','quality switch','MIO fallback','successful retry','no runtime errors','no horizontal overflow']:['WebGL render',preview?'VRM avatar':'MIO avatar','guest session','build','test animation','place','reload persistence','independent visitor sharing','owner removal','no runtime errors','no horizontal overflow']});
 await context.close();console.log(`${label}: passed`);
}}catch(error){for(const context of browser.contexts()){const p=context.pages()[0];if(p)await p.screenshot({path:`test-results/${prefix}-failure.png`}).catch(()=>{});}throw error;}finally{await browser.close();await writeFile(`test-results/${prefix}-render-report.json`,JSON.stringify(report,null,2));}
