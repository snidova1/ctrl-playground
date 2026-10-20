import {chromium} from '@playwright/test';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1120,height:700}}),errors=[];p.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('ERROR',m.text());}});p.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message);});
const prefix=process.env.CTRL_CAPTURE_PREFIX||'anime',url=process.env.CTRL_PREVIEW_URL||'http://localhost:3054/world-preview?visual-debug';
try{await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForSelector('main[data-ready="true"]',{timeout:120000});await p.waitForFunction(()=>document.querySelector('canvas')?.dataset.avatarReady==='true',null,{timeout:90000});
const d=await p.evaluate(()=>({...document.querySelector('canvas').dataset}));console.log('RENDER',JSON.stringify(d));assert.equal(d.avatarReady,'true');assert.equal(d.animeCharacters,d.expectedAnimeCharacters);assert.ok(d.animeFinish);
await p.screenshot({path:`test-results/neighborhood/${prefix}-world.png`});
await p.evaluate(()=>window.dispatchEvent(new Event('neighborhood-portrait')));await p.waitForTimeout(1000);await p.screenshot({path:`test-results/neighborhood/${prefix}-character.png`});
await p.evaluate(()=>window.dispatchEvent(new Event('worldgacha-overview')));await p.waitForTimeout(500);await p.screenshot({path:`test-results/neighborhood/${prefix}-overview.png`});
assert.deepEqual(errors,[]);await writeFile(`test-results/neighborhood/${prefix}-render.json`,JSON.stringify({url,dataset:d,errors},null,2));console.log('PASS actual anime world, real VRM characters, depth-ink shader pipeline; zero JS/GLSL errors');
}finally{await b.close();}
