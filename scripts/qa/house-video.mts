import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='test-results/modular-house/video';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir,size:{width:1280,height:800}}});
const began=Date.now(),page=await context.newPage(),errors:string[]=[],steps:string[]=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
const beat=(ms=1200)=>page.waitForTimeout(ms); // Intentional viewing time for the recording, not readiness polling.
let startSeconds=0;
try {
 await page.goto('http://127.0.0.1:3234/?build',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.ctrlHouseReady==='true'&&Number(document.documentElement.dataset.ctrlAvatarMeshCount)>0,{},{timeout:60000});
 startSeconds=(Date.now()-began)/1000;
 const workshop=page.getByRole('region',{name:'House workshop',exact:true});
 const click=async(name:string)=>{await workshop.getByRole('button',{name,exact:true}).click();await beat();};
 const roof=async()=>{await page.getByRole('button',{name:'Roof preview',exact:true}).click();await beat(1800);};
 await roof();await roof();
 await click('Add room north');await workshop.getByRole('button',{name:'Remove room north',exact:true}).waitFor();steps.push('Tambah modul ruang, denah dan bangunan langsung berubah');
 await roof();await roof();
 await click('Pintu & jendela');
 await workshop.locator('[data-edge-id="1,0,east"]').click();await beat(500);await click('Place door');
 await workshop.locator('[data-edge-id="1,0,north"]').click();await beat(500);await click('Place window');steps.push('Pasang pintu dan jendela pada sisi modul baru');
 await click('Material');await click('House floor finish tile');await click('House wall color Terracotta');await click('House roof flat');await roof();
 await click('House wall color Ivory');await click('House roof color Moss');await click('House roof gable');await beat(2200);steps.push('Ganti lantai, warna dinding, bentuk dan warna atap');
 await roof();await beat(1500);
 await page.getByRole('button',{name:'Save house',exact:true}).click();await beat(2000);steps.push('Tutup workshop melalui callback lokal, bukan bukti simpan server');
 const box=await page.locator('canvas').boundingBox();if(!box)throw new Error('No canvas');
 await page.mouse.move(box.width/2,box.height*.35);await page.mouse.down();await page.mouse.move(box.width/2-86,box.height*.35,{steps:8});await page.mouse.up();
 await page.keyboard.down('w');await page.waitForFunction(()=>Number(document.querySelector('[aria-label="House location"]')?.getAttribute('data-player-z'))<1.6);await page.evaluate("new Promise(r=>{let n=0;function f(){if(++n>=18)r(true);else requestAnimationFrame(f)}requestAnimationFrame(f)})");await page.keyboard.up('w');await beat(1200);
 await page.getByRole('button',{name:'Open door',exact:false}).click();await beat(1300);await page.keyboard.down('w');await page.waitForFunction(()=>Number(document.querySelector('[aria-label="House location"]')?.getAttribute('data-player-z'))<-.4);await page.keyboard.up('w');await beat(1800);steps.push('Buka pintu dan berjalan masuk rumah dalam scene yang sama');
 await page.getByRole('button',{name:'Sit down',exact:false}).click();await page.waitForFunction(()=>/sit/i.test(document.documentElement.dataset.ctrlAvatarState??''));await beat(2200);await page.getByRole('button',{name:'Stand up',exact:false}).click();await beat();steps.push('Avatar duduk pada bangku lalu berdiri');
 await page.keyboard.down('d');await page.waitForFunction(()=>Number(document.querySelector('[aria-label="House location"]')?.getAttribute('data-player-x'))>1.01);await page.keyboard.up('d');await page.keyboard.down('w');await page.waitForFunction(()=>Number(document.querySelector('[aria-label="House location"]')?.getAttribute('data-player-z'))< -2.8);await page.keyboard.up('w');await beat(1000);
 await page.getByRole('button',{name:'Turn on light',exact:false}).click();await page.getByRole('button',{name:'Turn off light',exact:false}).waitFor();await beat(2200);steps.push('Berjalan memutari furniture dan menyalakan lampu');
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('HOUSE_VIDEO_ACTIONS_PASS',JSON.stringify(steps));
} catch(error) {console.log('VIDEO_FAILURE_BODY',await page.locator('body').innerText());throw error;}
finally {const raw=await page.video()!.path();await context.close();await browser.close();await writeFile(`${dir}/recording.json`,JSON.stringify({raw,startSeconds,steps,errors,scope:'Local source component recording; real house renderer, workshop and controller; no hosted/backend persistence claim.'},null,2));console.log('HOUSE_VIDEO_RAW',raw,'TRIM_START',startSeconds);}
