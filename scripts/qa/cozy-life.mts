import {chromium,expect,type Locator,type Page} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {CROPS,FISHING,RECIPES,type CropId,type ItemId,type LifeState,type RecipeId} from '../../domain/cozy-life';
import {PUBLIC_LIFE_ENTRIES} from '../../features/worldgacha/public-world-activities';

const origin=process.env.CTRL_QA_ORIGIN??'http://127.0.0.1:3243';
const dir=resolve(process.env.CTRL_QA_OUTPUT??'test-results/cozy-life');
const storageKey='ctrl-cozy-life-guest-v1';
const checks:string[]=[],errors:string[]=[],modes:string[]=[];
const tabNames={garden:'Kebun',fishing:'Memancing',kitchen:'Dapur',craft:'Kriya',community:'Bersama',barter:'Barter'} as const;
await mkdir(dir,{recursive:true});
let executablePath=process.env.CTRL_QA_CHROMIUM;
if(!executablePath&&!existsSync(chromium.executablePath())){
 const cache=resolve(homedir(),'.cache/ms-playwright');
 const shells=(await readdir(cache)).filter(name=>name.startsWith('chromium_headless_shell-')).sort().reverse();
 executablePath=shells.map(name=>resolve(cache,name,'chrome-headless-shell-linux64/chrome-headless-shell')).find(existsSync);
}
const browser=await chromium.launch({executablePath,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
let active:Page|undefined;
const record=(label:string)=>{checks.push(label);console.log('COZY_LIFE_CHECK',label);};
async function readState(page:Page):Promise<LifeState>{
 const state=await page.evaluate(key=>{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;},storageKey);
 assert(state,'Real guest save must exist after a successful action');return state;
}
async function assertLocal(page:Page){
 await expect(page.locator('.cozy-storage[data-local="true"]')).toContainText('Hanya browser ini');
 const text=await page.getByRole('dialog').innerText();
 assert(!/guaranteed (?:income|returns)|earn (?:money|tokens)|revenue[- ]sharing|\bAPY\b|penghasilan (?:pasti|terjamin)|jaminan keuntungan|hadiah token/i.test(text),'No financial/reward promises');
 await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal','true');
 assert(await page.evaluate(()=>{const d=document.querySelector('dialog[open]');return !!d&&d.contains(document.activeElement);}), 'Focus must stay inside the active dialog');
}
async function mutate(page:Page,button:Locator){
 const previous=await page.evaluate(key=>{const raw=localStorage.getItem(key);return raw?JSON.parse(raw).revision:0;},storageKey);
 await expect(button).toBeEnabled();await button.click();
 await expect.poll(async()=>(await readState(page)).revision).toBe(previous+1);
 await expect(page.getByRole('dialog').getByRole('alert')).toHaveCount(0);
 return readState(page);
}
async function selectTab(page:Page,name:string){await page.getByRole('tab',{name,exact:true}).click();await expect(page.getByRole('tab',{name,exact:true})).toHaveAttribute('aria-selected','true');}
async function advanceTo(page:Page,epoch:number){
 const now=await page.evaluate(()=>Date.now());
 await page.clock.setFixedTime(new Date(Math.max(now+200,epoch+250)));
}
async function closePanel(page:Page){await page.getByRole('button',{name:'Tutup aktivitas',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();}
async function worldReady(page:Page){
 await expect(page.locator('.wg-world')).toBeVisible({timeout:120_000});
 await expect(page.locator('.wg-world')).toHaveAttribute('data-ready','true',{timeout:120_000});
}
async function spatialOpen(page:Page,entry:typeof PUBLIC_LIFE_ENTRIES[number],mobile:boolean){
 await page.getByRole('button',{name:'Places',exact:true}).click();
 await page.getByRole('button',{name:entry.x<0?'Spring Garden':'Lantern Market'}).click();
 await page.getByRole('button',{name:'Places',exact:true}).click();
 const before=await page.evaluate(()=>Number(document.documentElement.dataset.cozyOpenCount??'0'));
 await page.getByRole('button',{name:entry.label,exact:true}).click();
 const nearby=page.getByRole('button',{name:'Interact with nearby person or place',exact:true});
 // Choosing Places walks the actual controller/navigation path, not a teleport
 // to the station, direct event dispatch, or an inventory/action shortcut.
 await expect(nearby).toContainText(entry.label,{timeout:45_000});
 await expect(page.getByRole('dialog')).not.toBeVisible();
 assert.equal(await page.evaluate(()=>Number(document.documentElement.dataset.cozyOpenCount??'0')),before,'Walking/arrival must not auto-open');
 if(mobile)await nearby.click();else await page.keyboard.press('KeyE');
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('tab',{name:tabNames[entry.tab],exact:true})).toHaveAttribute('aria-selected','true');
 await expect.poll(()=>page.evaluate(()=>Number(document.documentElement.dataset.cozyOpenCount??'0'))).toBe(before+1);
 await assertLocal(page);
 record(`${mobile?'mobile':'desktop'}:spatial-${entry.tab}`);
}
try{
 for(const mobile of [false,true]){
  const label=mobile?'mobile':'desktop';
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1024,height:768},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  const page=active=await context.newPage();page.setDefaultTimeout(30_000);
  page.on('pageerror',error=>errors.push(`${label}: ${error.message}`));
  const apiWrites:string[]=[];page.on('request',request=>{if(request.url().includes('/api/cozy-life')&&request.method()==='POST')apiWrites.push(request.postData()??'');});
  await page.addInitScript(()=>{let count=0;window.addEventListener('cozy-life-open',()=>{document.documentElement.dataset.cozyOpenCount=String(++count);});});
  // Only Date is simulated: activity deadlines use Date.now, while real RAF
  // and timers keep navigation/actionability independent of guest time jumps.
  await page.clock.setFixedTime(new Date());
  await page.goto(origin+'/habitat-test',{waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),storageKey),null,'Fresh context must not contain seeded inventory');
  await page.getByRole('button',{name:'🌱 Aktivitas',exact:true}).click();await assertLocal(page);
  const dialog=page.getByRole('dialog');
  await expect(page.locator('canvas')).toHaveAttribute('data-cozy-life-garden','absent');
  const placed=await mutate(page,page.getByTestId('cozy-place-garden'));
  assert(placed.gardenAnchor);assert.equal(placed.inventory['turnip-seed'],4);
  await expect(page.locator('canvas')).toHaveAttribute('data-cozy-life-garden','placed');
  record(`${label}:opt-in-physical-garden-no-free-inventory`);
  for(const [bedId,cropId] of ([['0','turnip'],['1','tomato'],['2','herb']] as const)){
   await dialog.locator(`#cozy-seed-${bedId}`).selectOption(cropId);
   let state=await mutate(page,dialog.getByRole('button',{name:`Tanam petak ${Number(bedId)+1}`,exact:true}));
   assert.equal(state.beds[Number(bedId)].crop,cropId);assert.equal(state.beds[Number(bedId)].wateredAt,null);
   assert.equal(state.inventory[CROPS[cropId].seed],3,'Planting must debit a real starter seed');
   state=await mutate(page,dialog.getByRole('button',{name:`Siram petak ${Number(bedId)+1}`,exact:true}));
   assert(state.beds[Number(bedId)].wateredAt!==null);assert.equal(state.beds[Number(bedId)].readyAt!-state.beds[Number(bedId)].wateredAt!,CROPS[cropId].growMs);
   await expect(dialog.getByRole('button',{name:`Siram petak ${Number(bedId)+1}`,exact:true})).toBeDisabled();
  }
  const growing=await readState(page);assert.equal(growing.stats.harvests,0);assert.equal(growing.inventory.turnip??0,0);
  await page.screenshot({timeout:120_000,path:resolve(dir,`${label}-growing.png`)});
  await advanceTo(page,Math.max(...growing.beds.map(bed=>bed.readyAt??0)));
  assert.deepEqual((await readState(page)).inventory,growing.inventory,'Passing time alone must not grant harvest inventory');
  await expect.poll(async()=>{const raw=await page.locator('canvas').getAttribute('data-cozy-life-growth');return JSON.parse(raw??'[]').filter((b:{stage:string})=>b.stage==='ripe').length;},{timeout:15_000}).toBe(3);
  await closePanel(page);if(!mobile){await page.mouse.move(500,300);await page.mouse.wheel(0,700);}
  await page.screenshot({timeout:120_000,path:resolve(dir,`${label}-physical-ripe-crops.png`)});await page.getByRole('button',{name:'🌱 Aktivitas',exact:true}).click();
  for(const bedId of [0,1,2])await mutate(page,dialog.getByRole('button',{name:`Panen petak ${bedId+1}`,exact:true}));
  let state=await readState(page);
  for(const id of ['turnip','tomato','herb'] as CropId[]){assert.equal(state.inventory[id],CROPS[id].yield);assert.equal(state.inventory[CROPS[id].seed],4);}
  assert.equal(state.stats.harvests,3);assert(state.beds.every(bed=>bed.crop===null));
  await page.screenshot({timeout:120_000,path:resolve(dir,`${label}-garden.png`)});record(`${label}:real-plant-seed-debit-water-guest-clock-growth-harvest-and-replacement-seeds`);

  await selectTab(page,'Dapur');
  const soup=dialog.getByRole('article').filter({has:page.getByRole('heading',{name:'Sup kebun',exact:true})});
  const beforeCook=structuredClone(state);state=await mutate(page,soup.getByRole('button',{name:'Masak seporsi',exact:true}));
  assert.equal(state.inventory.turnip,(beforeCook.inventory.turnip??0)-2);assert.equal(state.inventory.tomato,(beforeCook.inventory.tomato??0)-1);
  assert.equal(state.inventory['garden-soup'],1);assert.equal(state.stats.mealsCooked,1);
  await page.screenshot({timeout:120_000,path:resolve(dir,`${label}-kitchen.png`)});record(`${label}:cooking-debits-harvested-ingredients-and-credits-one-real-meal`);
  await expect(page.getByTestId('cozy-serve-garden-soup')).toBeDisabled();
  state=await mutate(page,page.getByTestId('cozy-eat-garden-soup'));assert.equal(state.inventory['garden-soup']??0,0);assert.equal(state.mealsEaten,1);
  record(`${label}:eat-debits-real-meal-and-guest-sharing-disabled`);

  await selectTab(page,'Memancing');let casts=0;
  // Real guest RNG; never seed materials or override Math.random. Fail honestly
  // after 48 catches rather than claiming crafting when ingredients never came.
  while((state.inventory.driftwood??0)<3&&(state.inventory.clay??0)<2&&casts<48){
   await advanceTo(page,state.nextCastAt);
   state=await mutate(page,dialog.getByRole('button',{name:'Lempar kail',exact:true}));
   assert(state.fishing);assert.equal(state.fishing.biteAt-state.fishing.castAt,FISHING.biteAfterMs);
   await expect(dialog.getByRole('button',{name:'Tunggu gigitan…',exact:true})).toBeDisabled();
   const beforeReel=structuredClone(state);await advanceTo(page,state.fishing.biteAt);
   state=await mutate(page,dialog.getByRole('button',{name:'Tarik kail!',exact:true}));
   assert.equal(state.fishing,null);assert.equal(state.stats.fishCaught,beforeReel.stats.fishCaught+1);
   const gained=FISHING.catches.filter(id=>(state.inventory[id]??0)===(beforeReel.inventory[id]??0)+1);
   assert.equal(gained.length,1,'One successful timed reel must add exactly one actual catch');casts++;
  }
  assert((state.inventory.driftwood??0)>=3||(state.inventory.clay??0)>=2,'Actual catches must supply crafting ingredients');
  record(`${label}:timed-cast-disabled-early-reel-real-random-catch-x${casts}`);
  await selectTab(page,'Kriya');
  const recipeId:RecipeId=(state.inventory.driftwood??0)>=3?'wooden-bench':'flower-pot';
  const recipe=RECIPES[recipeId],beforeCraft=structuredClone(state);
  const craft=dialog.getByRole('article').filter({has:page.getByRole('heading',{name:recipeId==='wooden-bench'?'Bangku kayu':'Pot bunga',exact:true})});
  state=await mutate(page,craft.getByRole('button',{name:'Buat dengan tangan',exact:true}));
  for(const [id,n] of Object.entries(recipe.ingredients))assert.equal(state.inventory[id as ItemId],(beforeCraft.inventory[id as ItemId]??0)-n);
  assert.equal(state.inventory[recipe.output],1);assert.equal(state.crafted[recipe.output],1);assert.equal(state.stats.itemsCrafted,1);
  await page.screenshot({timeout:120_000,path:resolve(dir,`${label}-craft.png`)});record(`${label}:crafting-real-fished-material-debit-and-persisted-collection`);
  state=await mutate(page,page.getByTestId(`cozy-place-${recipeId}`));assert.equal(state.inventory[recipe.output]??0,0);assert.equal(state.decorations?.length,1);
  await expect(page.locator('canvas')).toHaveAttribute('data-cozy-life-decorations','1');
  await expect.poll(async()=>Number(await page.locator('canvas').getAttribute('data-cozy-life-craft-meshes')),{timeout:60_000}).toBeGreaterThan(0);
  state=await mutate(page,page.getByTestId('cozy-remove-craft'));assert.equal(state.inventory[recipe.output],1);assert.equal(state.decorations?.length,0);
  state=await mutate(page,page.getByTestId(`cozy-place-${recipeId}`));assert.equal(state.inventory[recipe.output]??0,0);assert.equal(state.decorations?.length,1);
  await closePanel(page);await page.screenshot({timeout:120_000,path:resolve(dir,`${label}-physical-garden-and-crafted-decor.png`)});await page.getByRole('button',{name:'🌱 Aktivitas',exact:true}).click();
  record(`${label}:physical-crafted-model-placement-debit-remove-single-refund-and-replace`);

  await selectTab(page,'Bersama');await expect(dialog).toContainText('Ini tidak menambah persediaan komunitas di server.');
  await expect(dialog.locator('.cozy-community-total')).toHaveCount(0);
  const beforeContribution=state.inventory.turnip!;state=await mutate(page,dialog.getByRole('button',{name:'Bagikan di browser',exact:true}));
  assert.equal(state.inventory.turnip,beforeContribution-1);assert.equal(state.contributions.turnip,1);
  await selectTab(page,'Barter');await expect(dialog).toContainText('membutuhkan akun tersimpan di server');
  await expect(dialog.getByRole('button',{name:/Pasang tawaran|Terima tawaran/})).toHaveCount(0);
  await page.screenshot({timeout:120_000,path:resolve(dir,`${label}-guest-barter-honesty.png`)});
  await closePanel(page);await expect(page.getByRole('button',{name:'🌱 Aktivitas',exact:true})).toBeFocused();
  const persisted=await readState(page);await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'🌱 Aktivitas',exact:true}).click();await assertLocal(page);assert.deepEqual(await readState(page),persisted);await closePanel(page);
  record(`${label}:guest-local-only-community-debit-no-fake-totals-no-player-barter-and-reload-persistence`);

  await page.goto(origin+'/public-world',{waitUntil:'domcontentloaded'});
  // Test activity navigation using the product's actual lightweight controls.
  // SwiftShader on this RAM-limited WSL host stalls compositor clicks when the
  // unrelated high-quality seven-VRM scene is loaded alongside test workers.
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  await page.getByRole('combobox',{name:'Graphics',exact:true}).selectOption('low');
  await page.getByRole('checkbox',{name:'Anime characters (rigged VRM)',exact:true}).uncheck();
  await page.getByRole('button',{name:'Close controls',exact:true}).click();await worldReady(page);
  const source=await page.evaluate(()=>document.documentElement.dataset.cozySourcePreview==='true');
  modes.push(`${label}:${source?'real-components-source-fixture-public-route-guard-not-tested':'integrated-route'}`);
  assert.deepEqual(await readState(page),persisted,'Same browser guest save must survive the real route change');
  for(const entry of PUBLIC_LIFE_ENTRIES){
   const before=await readState(page);await spatialOpen(page,entry,mobile);
   assert.deepEqual(await readState(page),before,'Spatial entry must not fabricate an item or action');
   const pos=await page.locator('canvas').evaluate(canvas=>({x:canvas.dataset.worldX,z:canvas.dataset.worldZ}));
   await page.keyboard.press('KeyW');await page.keyboard.press('KeyE');
   await page.waitForTimeout(400);
   assert.deepEqual(await page.locator('canvas').evaluate(canvas=>({x:canvas.dataset.worldX,z:canvas.dataset.worldZ})),pos,'World input must stay paused behind modal');
   await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
   if(entry.tab==='fishing')await page.screenshot({timeout:120_000,path:resolve(dir,`${label}-quiet-pond.png`)});
  }
  // Mutate from Public World, then return to Habitat; prove shared save in BOTH directions.
  await page.getByRole('button',{name:'🌱 Aktivitas',exact:true}).click();await assertLocal(page);
  await selectTab(page,'Kebun');await dialog.locator('#cozy-seed-3').selectOption('herb');
  const cross=await mutate(page,dialog.getByRole('button',{name:'Tanam petak 4',exact:true}));assert.equal(cross.beds[3].crop,'herb');await closePanel(page);
  await page.goto(origin+'/habitat-test',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'🌱 Aktivitas',exact:true}).click();await assertLocal(page);
  assert.deepEqual(await readState(page),cross);await expect(dialog.getByRole('button',{name:'Siram petak 4',exact:true})).toBeEnabled();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document-level mobile overflow');
  assert.equal(apiWrites.length,0,'Guest progression must not POST to authoritative server');
  record(`${label}:six-real-spatial-entries-correct-tabs-no-auto-open-modal-input-lock-cross-route-guest-save-both-directions`);
  await context.close();active=undefined;
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(dir,'report.json'),JSON.stringify({origin,checks,errors,modes,clock:'Guest browser clock advanced; no server time claim',persistence:'Real browser localStorage only; no server/authenticated persistence claim',mobile:'Chromium touch emulation, not a physical device',inventory:'No fixtures, RNG override, API success mocks or direct inventory writes'},null,2));
 console.log('COZY_LIFE_BROWSER_QA_PASS',checks);
}catch(error){
 let failureContext:unknown=null;if(active)failureContext=await Promise.race([active.locator('canvas').evaluate(canvas=>({visibility:document.visibilityState,canvas:{...canvas.dataset}})).catch(()=>null),new Promise(r=>setTimeout(()=>r('Browser diagnostics timed out'),4000))]);
 await writeFile(resolve(dir,'report.json'),JSON.stringify({origin,checks,errors,modes,failure:String(error),failureContext,status:'FAIL'},null,2));console.error('COZY_QA_FAILURE_CONTEXT',failureContext);
 if(active)await active.screenshot({timeout:15_000,path:resolve(dir,'failure.png')}).catch(()=>{});throw error;
}finally{await browser.close();}
