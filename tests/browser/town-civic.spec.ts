import {test,expect,chromium,type Page,type Locator} from '@playwright/test';
import {installSignedWallet} from './helpers/wallet';
import type {HabitatState} from '@/domain/habitat';
import {getNearestTownActivity} from '@/features/habitat/town-districts';
import {assertTouchHUD} from './helpers/habitat-hud';
import {TOWN_TABLE} from '@/domain/town-table';
async function press(page:Page,button:Locator){if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches))await button.tap();else await button.click();}
async function enter(page:Page,name:string){
 await installSignedWallet(page);await page.goto('/public-world');
 await press(page,page.locator('.wallet-options').getByRole('button',{name:'Connect wallet',exact:true}));
 const verified=page.waitForResponse(r=>r.url().endsWith('/api/auth/verify')&&r.request().method()==='POST');
 await press(page,page.getByRole('button',{name:'Sign in to Habitat',exact:true}));expect((await verified).status()).toBe(200);
 await expect(page.getByRole('region',{name:'Complete character selection'})).toBeVisible({timeout:45000});
 await page.getByRole('textbox',{name:'Name',exact:true}).fill(name);
 await press(page,page.getByRole('button',{name:'Enter Public World',exact:true}));
 await expect(page.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
}
async function travel(page:Page,name:string){
 await press(page,page.getByRole('button',{name:'Town map',exact:true}));
 const row=page.locator('.hb-town-destinations>div').filter({has:page.getByText(name,{exact:true})});
 const moved=page.waitForResponse(r=>r.url().endsWith('/api/habitat/town-travel'));
 await press(page,row.getByRole('button',{name:'Travel here ↗',exact:true}));expect((await moved).status()).toBe(200);
}
async function work(page:Page){
 // A peer can still display an enabled button from before the other player's
 // completion. Wait for the authoritative cooldown, not that stale UI frame.
 await expect.poll(async()=>{
  const state=await(await page.request.get('/api/habitat/state')).json() as HabitatState;
  const player=state.players.find(p=>p.id===state.profile?.id);
  expect(player).toBeDefined();
  const activity=getNearestTownActivity(player!.x,player!.z);
  expect(activity).not.toBeNull();
  return (state.states[activity!.objectId]?.usedAt??0)+activity!.cooldownMs-state.town!.serverNow;
 },{timeout:60000,intervals:[500,1000]}).toBeLessThanOrEqual(0);
 const button=page.locator('.hb-town-action');
 await expect(button).toBeEnabled({timeout:60000});
 const started=page.waitForResponse(r=>r.url().endsWith('/api/habitat/town-job/start'),{timeout:15000});
 await press(page,button);expect((await started).status()).toBe(200);
 const finish=page.getByRole('button',{name:'Finish activity',exact:true});await expect(finish).toBeEnabled({timeout:15000});
 const finished=page.waitForResponse(r=>r.url().endsWith('/api/habitat/town-job/finish'));
 await press(page,finish);expect((await finished).status()).toBe(200);
}
test('desktop and mobile neighbors build a persistent waterfront through actual timed work',async({page,baseURL})=>{
 const peerBrowser=await chromium.launch(test.info().project.use.launchOptions);
 const peerContext=await peerBrowser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const peer=await peerContext.newPage(),errors:string[]=[];
 for(const p of [page,peer])p.on('pageerror',e=>errors.push(e.message));
 const state=async(p:Page)=>(await(await p.request.get('/api/habitat/state')).json()) as HabitatState;
 try{
  await enter(page,'Lantern Carpenter');await enter(peer,'Waterfront Neighbor');
  expect((await state(page)).wallet).not.toBe((await state(peer)).wallet);
  for(const district of ['Artisan Row','Tidewater Harbor']){
   await travel(page,district);await travel(peer,district);
   await work(page);await work(peer);
  }
  await expect.poll(async()=>(await state(peer)).town!.projects.find(p=>p.id==='tidewater-lanterns')!.stage).toBe(2);
  await page.reload();await expect(page.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
  const saved=await state(page);expect(saved.town!.projects.find(p=>p.id==='tidewater-lanterns')!.completedAt).toBeGreaterThan(0);
  expect(saved.town!.history.filter(e=>e.kind==='completed')).toHaveLength(2);
  await travel(page,'Tidewater Harbor');
  await page.mouse.move(600,350);await page.mouse.down();await page.mouse.move(1200,350,{steps:12});await page.mouse.up();
  await page.screenshot({path:test.info().outputPath('completed-harbor-desktop.png'),scale:'css'});
  await press(peer,peer.getByRole('button',{name:/^Town life/}));
  await expect(peer.getByText('Completed · open for all neighbors',{exact:true})).toBeVisible();
  await peer.screenshot({path:test.info().outputPath('saved-project-mobile.png'),scale:'css'});
  expect(errors).toEqual([]);
 }finally{await peerBrowser.close();}
});

test('two signed neighbors prepare and persist the neighborhood table through three district activities',async({page,baseURL})=>{
 const browser=await chromium.launch(test.info().project.use.launchOptions),context=await browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true}),peer=await context.newPage();
 const state=async(p:Page)=>(await(await p.request.get('/api/habitat/state')).json()) as HabitatState;
 const errors:string[]=[];for(const p of [page,peer])p.on('pageerror',e=>errors.push(e.message));
 async function approach(p:Page){
  async function move(key:string,name:string,ready:(x:number,z:number)=>boolean){
   await p.bringToFront();const coarse=await p.evaluate(()=>matchMedia('(pointer:coarse)').matches),cdp=coarse?await p.context().newCDPSession(p):null;
   if(cdp){const box=await p.getByRole('button',{name,exact:true}).boundingBox();expect(box).not.toBeNull();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:box!.x+box!.width/2,y:box!.y+box!.height/2}]});}
   else await p.keyboard.down(key);
   try{await expect.poll(async()=>{const s=await state(p),a=s.players.find(a=>a.id===s.profile?.id)!;return ready(a.x,a.z);},{timeout:20000,intervals:[300]}).toBe(true);}
   finally{if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else await p.keyboard.up(key);}
  }
  // Walk around the real table/chair collision from the south. This leaves
  // the picnic in front of the actual follow camera for the WebGL proof.
  await move('KeyS','Move ↓',(_,z)=>z>22);
  await move('KeyD','Move →',x=>x>(p===peer?7.7:8.5));
  await move('KeyW','Move ↑',(_,z)=>z<(p===peer?20.6:21));
  const s=await state(p),a=s.players.find(a=>a.id===s.profile?.id)!;expect(Math.hypot(a.x-TOWN_TABLE.x,a.z-TOWN_TABLE.z)).toBeLessThan(4.25);
 }
 async function tablePanel(p:Page){
  await p.bringToFront();await press(p,p.getByRole('button',{name:'Town life',exact:true}));
  await press(p,p.locator('summary').filter({hasText:'Today’s neighborhood table'}));
  return p.getByRole('article',{name:'Neighborhood table preparation',exact:true});
 }
 try{
  await page.bringToFront();await enter(page,'Picnic fruit host');await peer.bringToFront();await enter(peer,'Picnic flower neighbor');
  expect((await state(page)).wallet).not.toBe((await state(peer)).wallet);
  await page.bringToFront();await travel(page,'Applehill Orchard');await work(page);
  await page.bringToFront();await travel(page,'Willow Square');await work(page);
  const incomplete=await tablePanel(page);await expect(incomplete.getByRole('button',{name:'Serve neighborhood table',exact:true})).toBeDisabled();
  expect((await state(page)).town!.table).toMatchObject({neighbors:1,servedAt:0});await press(page,page.getByRole('button',{name:'Close town life',exact:true}));
  await peer.bringToFront();await travel(peer,'Fernwood Park');await work(peer);
  await expect.poll(async()=>(await state(page)).town!.table!.supplies['community-garden']).toBeGreaterThanOrEqual(1);
  await peer.bringToFront();await travel(peer,'Willow Square');await approach(page);await approach(peer);
  const ready=await tablePanel(page),serve=ready.getByRole('button',{name:'Serve neighborhood table',exact:true});await expect(serve).toBeEnabled();
  const served=page.waitForResponse(r=>r.url().endsWith('/api/habitat/town-table/serve')&&r.request().method()==='POST',{timeout:15000});
  await press(page,serve);expect((await served).status()).toBe(200);
  await expect.poll(async()=>(await state(peer)).town!.table!.servedAt).toBeGreaterThan(0);
  const shared=(await state(peer)).town!.table!;expect(shared.neighbors).toBe(2);expect(shared.servedBy).toBe('Picnic fruit host');
  expect((await state(page)).town!.progress.completed).toBe(2);expect((await state(peer)).town!.progress.completed).toBe(1);
  await press(page,page.getByRole('button',{name:'Close town life',exact:true}));
  for(const [p,name] of [[page,'neighborhood-table-desktop.png'],[peer,'neighborhood-table-mobile.png']] as const){await p.bringToFront();await assertTouchHUD(p);await p.screenshot({path:test.info().outputPath(name),scale:'css',timeout:45000});}
  await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
  expect((await state(page)).town!.table).toEqual(shared);expect((await state(page)).town!.history.some(e=>e.kind==='table-served')).toBe(true);expect(errors).toEqual([]);
 }finally{await browser.close();}
});
