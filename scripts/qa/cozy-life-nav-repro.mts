import {chromium} from '@playwright/test';
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{for(const clock of [false,true]){
 const c=await browser.newContext({viewport:{width:1000,height:760},reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
 if(clock){await p.clock.install();for(let i=0;i<10;i++)await p.clock.fastForward(15000);}
 console.log('REPRO',clock,'goto');await p.goto('http://127.0.0.1:3246/public-world',{waitUntil:'domcontentloaded'});
 await p.getByRole('button',{name:'Controls',exact:true}).click();await p.getByRole('combobox',{name:'Graphics',exact:true}).selectOption('low');await p.getByRole('checkbox',{name:'Anime characters (rigged VRM)',exact:true}).uncheck();await p.getByRole('button',{name:'Close controls',exact:true}).click();
 console.log('REPRO',clock,'settings');await p.waitForFunction(()=>document.querySelector<HTMLElement>('.wg-world')?.dataset.ready==='true',{},{timeout:90000});
 await p.evaluate("(()=>{let n=0;function tick(){document.documentElement.dataset.rafFrames=String(++n);requestAnimationFrame(tick)}requestAnimationFrame(tick)})()");
 await p.getByRole('button',{name:'Places',exact:true}).click();await p.getByRole('button',{name:'Spring Garden',exact:false}).click();console.log('REPRO',clock,'traveled');
 try{await p.getByRole('button',{name:'Places',exact:true}).click({timeout:10000});console.log('REPRO_NAV_PASS',clock);}catch(e){console.log('REPRO_NAV_FAIL',clock,String(e));}
 console.log('REPRO_STATE',await p.evaluate(()=>({frames:document.documentElement.dataset.rafFrames,ready:document.querySelector<HTMLElement>('.wg-world')?.dataset.ready,places:document.querySelector('.wg-places')?.textContent,body:document.body.innerText.slice(-700)})));
 await c.close();
}}finally{await browser.close();}
