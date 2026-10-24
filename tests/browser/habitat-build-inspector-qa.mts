/** Standalone focused component QA: pnpm exec tsx tests/browser/habitat-build-inspector-qa.mts */
import assert from 'node:assert/strict';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';

const entry='/__inspector_qa.tsx';
const source=`import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import BuildInspector from '/features/habitat/build-inspector.tsx';
import '/features/habitat/habitat.css';
import '/features/habitat/build-catalog.css';
const initial={id:'desk',assetId:'furniture-kit/desk',name:'Writing desk',x:2,y:0,z:3,rotation:0,scale:1,behavior:'solid',target:''};
function Fixture(){
 const [objects,setObjects]=useState([initial]);const [selectedId,onSelect]=useState('desk');const [action,setAction]=useState('Ready');
 return <main className='hb-app'><section className='hb-build-dock' data-build-view='object'>
 <header className='hb-build-header'><h1>Furniture workshop</h1></header>
 <div className='hb-build-body'><section className='hb-build-catalog'/><BuildInspector objects={objects} selectedId={selectedId} worlds={[]} onSelect={onSelect}
 onPatch={values=>setObjects(items=>items.map(item=>item.id===selectedId?{...item,...values}:item))}
 onMove={()=>setAction('Camera callback received')}
 onDuplicate={()=>{setObjects(items=>[...items,{...items.find(item=>item.id===selectedId),id:'copy',name:'Desk copy'}]);setAction('Duplicated');}}
 onDelete={()=>{setObjects(items=>items.filter(item=>item.id!==selectedId));onSelect(null);setAction('Deleted');}}
 onBrowse={()=>setAction('Browse callback received')}/></div>
 <footer className='hb-build-actions'><output aria-label='Action result'>{action}</output></footer>
 </section></main>;
}createRoot(document.getElementById('root')).render(<Fixture/>);`;
const server=await createServer({
 configFile:false,root:process.cwd(),resolve:{alias:{'@':path.resolve(process.cwd())}},
 optimizeDeps:{noDiscovery:true,include:['react','react-dom/client','react/jsx-dev-runtime','three','zod']},
 server:{host:'127.0.0.1',port:0},
 plugins:[{name:'focused-inspector-fixture',resolveId(id){if(id===entry)return entry;},load(id){if(id===entry)return source;},configureServer(instance){instance.middlewares.use((req,res,next)=>{
  if(req.url!=='/__inspector_qa')return next();
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inspector QA</title></head><body><div id="root"></div><script type="module" src="'+entry+'"></script></body></html>');
 });}}],
});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CTRL_QA_CHROME??'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
try {
 for(const width of [390,320,1280]) {
  const page=await browser.newPage({viewport:{width,height:760},hasTouch:width<900,isMobile:width<900});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(server.resolvedUrls!.local[0]+'__inspector_qa',{waitUntil:'domcontentloaded',timeout:120000});
  const panel=page.getByRole('complementary',{name:'Selected object controls'});await panel.waitFor();
  await page.getByRole('button',{name:'Face 90 degrees',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Face 90 degrees',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Large size, 2 times original',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Large size, 2 times original',exact:true}).getAttribute('aria-pressed'),'true');
  assert.match(await page.getByLabel('Scaled model dimensions').innerText(),/1.47/);
  await page.getByRole('button',{name:'Turn right 45 degrees',exact:true}).focus();await page.keyboard.press('Enter');
  assert.match(await panel.locator('.hb-inspector-group-heading').innerText(),/45°/);
  await page.getByRole('textbox',{name:'Name',exact:true}).fill('My reading desk');assert.equal(await panel.getByRole('heading',{name:'My reading desk'}).count(),1);
  for(const label of ['Posisikan lewat kamera','Duplicate','Delete']) {
   const action=page.getByRole('button',{name:label,exact:true});await action.scrollIntoViewIfNeeded();const box=await action.boundingBox();assert(box&&box.height>=44,`${width}: ${label} minimum touch height`);
  }
  assert.equal(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth),true,`${width}: inspector must not overflow horizontally`);
  await page.getByRole('button',{name:'Posisikan lewat kamera',exact:true}).click();assert.equal(await page.getByLabel('Action result').innerText(),'Camera callback received');
  await page.getByRole('button',{name:'Duplicate',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:'Placed objects'}).locator('option').count(),3);
  await page.getByRole('combobox',{name:'Placed objects'}).selectOption('copy');
  await page.getByRole('button',{name:'Delete',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:'Placed objects'}).locator('option').count(),2);
  await page.getByRole('button',{name:'Browse pieces',exact:true}).click();assert.equal(await page.getByLabel('Action result').innerText(),'Browse callback received');
  await page.getByRole('combobox',{name:'Placed objects'}).selectOption('desk');
  await page.screenshot({path:`/tmp/habitat-inspector-${width}.png`});assert.deepEqual(errors,[]);
  console.log(`INSPECTOR_BROWSER_PASS ${width}x760: live presets, dimensions, keyboard, rename, 44px actions, selection, camera, duplicate, delete, browse; no horizontal overflow or runtime errors`);
  await page.close();
 }
} finally {await browser.close();await server.close();}
