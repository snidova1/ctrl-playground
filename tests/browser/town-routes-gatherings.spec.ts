import {test,expect,chromium,type Page,type Locator} from '@playwright/test';
import {installSignedWallet} from './helpers/wallet';
import type {HabitatState} from '@/domain/habitat';
async function press(p:Page,b:Locator){if(await p.evaluate(()=>matchMedia('(pointer:coarse)').matches))await b.tap();else await b.click();}
async function enter(p:Page,name:string){
 await installSignedWallet(p);await p.goto('/public-world');
 await press(p,p.locator('.wallet-options').getByRole('button',{name:'Connect wallet',exact:true}));
 const response=p.waitForResponse(r=>r.url().endsWith('/api/auth/verify')&&r.request().method()==='POST');
 await press(p,p.getByRole('button',{name:'Sign in to Habitat',exact:true}));expect((await response).status()).toBe(200);
 await expect(p.getByRole('region',{name:'Complete character selection'})).toBeVisible({timeout:45000});
 await p.getByRole('textbox',{name:'Name',exact:true}).fill(name);await press(p,p.getByRole('button',{name:'Enter Public World',exact:true}));
 await expect(p.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
}
async function travel(p:Page,name:string){
 const close=p.getByRole('button',{name:'Close town life',exact:true});if(await close.isVisible())await press(p,close);
 await press(p,p.getByRole('button',{name:'Town map',exact:true}));
 const row=p.locator('.hb-town-destinations>div').filter({has:p.getByText(name,{exact:true})});
 const response=p.waitForResponse(r=>r.url().endsWith('/api/habitat/town-travel'),{timeout:15000});
 await press(p,row.getByRole('button',{name:'Travel here ↗',exact:true}));expect((await response).status()).toBe(200);
}
async function open(p:Page){const b=p.getByRole('button',{name:/^Town life/});if(await b.isVisible())await press(p,b);}
async function mutation(p:Page,path:string,b:Locator){const r=p.waitForResponse(r=>r.url().endsWith(`/api/habitat/${path}`)&&r.request().method()==='POST',{timeout:15000});await press(p,b);expect((await r).status()).toBe(200);}
async function routeWork(p:Page,name:string){
 const current=p.getByRole('article',{name:'Current work route'});
 await mutation(p,'town-route/work',current.getByRole('button',{name,exact:true}));
 const finish=current.getByRole('button',{name:'Finish route stop',exact:true});await expect(finish).toBeEnabled({timeout:15000});
 await mutation(p,'town-route/finish',finish);
}
async function walkToTeaRoom(p:Page){
 const close=p.getByRole('button',{name:'Close town life',exact:true});if(await close.isVisible())await press(p,close);
 const coarse=await p.evaluate(()=>matchMedia('(pointer:coarse)').matches);
 const cdp=coarse?await p.context().newCDPSession(p):null;
 if(cdp){const box=await p.getByRole('button',{name:'Move ←',exact:true}).boundingBox();expect(box).not.toBeNull();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box!.x+box!.width/2,y:box!.y+box!.height/2}]});}
 else await p.keyboard.down('KeyA');
 try{await expect.poll(async()=>{const s=await(await p.request.get('/api/habitat/state')).json() as HabitatState;const self=s.players.find(a=>a.id===s.profile?.id)!;return Math.hypot(self.x+8,self.z-2.8);},{timeout:20000,intervals:[400]}).toBeLessThan(4);}
 finally{if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else await p.keyboard.up('KeyA');}
 await mutation(p,'town-venue/enter',p.getByRole('button',{name:'Enter Willow Tea Room',exact:true}));
}
test('independent desktop/mobile wallets complete saved routes and a consented gathering through real controls',async({page,baseURL})=>{
 const browser=await chromium.launch(test.info().project.use.launchOptions),context=await browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true}),peer=await context.newPage();
 const errors:string[]=[];for(const p of [page,peer]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|THREE.WebGL|shader error|context lost/i.test(m.text()))errors.push(m.text());});}
 const state=async(p:Page)=>(await(await p.request.get('/api/habitat/state')).json()) as HabitatState;
 try{
  await enter(page,'Fruit Courier');await enter(peer,'Orchard Neighbor');expect((await state(page)).wallet).not.toBe((await state(peer)).wallet);
  for(const p of [page,peer]){
   await travel(p,'Applehill Orchard');await open(p);
   await mutation(p,'town-route/start',p.getByRole('button',{name:'Start Orchard to café',exact:true}));await routeWork(p,'Gather fruit');
   await p.reload();await expect(p.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
   expect((await state(p)).town!.route?.step).toBe(1);
   // Reload reconnects at Willow Square; its current-district travel button is
   // intentionally disabled. Verify the authoritative spawn rather than tap it.
   const restored=await state(p);expect(restored.players.find(player=>player.id===restored.profile?.id)).toMatchObject({x:0,z:6});
   await open(p);await routeWork(p,'Deliver fruit');
   expect((await state(p)).town!.route).toBeNull();expect((await state(p)).town!.progress.completed).toBe(1);
  }
  expect((await state(peer)).town!.visits).toContainEqual(expect.objectContaining({siteId:'cafe'}));
  await page.getByLabel('Gathering name',{exact:true}).fill('Willow friends dance');await page.getByLabel('Activity',{exact:true}).selectOption('dance');
  await mutation(page,'town-gathering/create',page.getByRole('button',{name:'Host gathering here',exact:true}));
  const event=peer.getByRole('article',{name:'Gathering Willow friends dance'});await expect(event).toBeVisible({timeout:15000});
  await mutation(peer,'town-gathering/join',event.getByRole('button',{name:'RSVP',exact:true}));
  await mutation(peer,'town-gathering/check-in',event.getByRole('button',{name:'Agree and join dance',exact:true}));
  const host=page.getByRole('article',{name:'Gathering Willow friends dance'});await expect(host.getByText('Orchard Neighbor · Here',{exact:true})).toBeVisible({timeout:15000});
  await mutation(page,'town-gathering/dance',host.getByRole('button',{name:'Start shared dance',exact:true}));
  const shared=(await state(page)).town!.gatherings[0];await expect.poll(async()=>(await state(peer)).town!.gatherings[0].startedAt).toBe(shared.startedAt);
  expect(shared.startedAt).toBeGreaterThan(0);
  await page.screenshot({path:test.info().outputPath('routes-gathering-desktop.png'),scale:'css'});await peer.screenshot({path:test.info().outputPath('routes-gathering-mobile.png'),scale:'css'});
  await mutation(peer,'town-gathering/leave',event.getByRole('button',{name:'Leave gathering',exact:true}));
  await mutation(page,'town-gathering/end',host.getByRole('button',{name:'End gathering',exact:true}));
  await peer.reload();await expect(peer.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
  expect((await state(peer)).town!.history.some(e=>e.kind==='gathering-attended')).toBe(true);
  await walkToTeaRoom(page);await walkToTeaRoom(peer);
  expect((await state(peer)).world?.name).toBe('Willow Tea Room');expect((await state(peer)).players.some(p=>p.name==='Fruit Courier')).toBe(true);
  await press(page,page.getByRole('button',{name:'Chat nearby',exact:true}));await page.getByRole('textbox',{name:'Say something nearby',exact:true}).fill('Tea after our orchard round?');
  await mutation(page,'town-chat',page.getByRole('button',{name:'Say',exact:true}));
  await expect.poll(async()=>(await state(peer)).town!.chat.some(m=>m.text==='Tea after our orchard round?')).toBe(true);
  await page.screenshot({path:test.info().outputPath('tea-room-desktop.png'),scale:'css'});await peer.screenshot({path:test.info().outputPath('tea-room-mobile.png'),scale:'css'});
  for(const p of [page,peer]){await mutation(p,'town-venue/exit',p.getByRole('button',{name:'Return through entrance',exact:true}));expect((await state(p)).world?.name).toBe('Willow Square');}
  expect(errors).toEqual([]);
 }finally{await browser.close();}
});
