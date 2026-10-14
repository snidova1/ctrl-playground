import {test,expect,chromium,type Page,type Locator,type Response} from '@playwright/test';
import {installSignedWallet} from './helpers/wallet';
import {assertTouchHUD} from './helpers/habitat-hud';
import type {HabitatState} from '@/domain/habitat';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world-geography';
// Activate the actual page before native input/GPU readback. Two independent
// browser windows are retained; no emulated focus, forced clicks or fake frames.
async function press(p:Page,b:Locator){await p.bringToFront();if(await p.evaluate(()=>matchMedia('(pointer:coarse)').matches))await b.tap();else await b.click();}
async function enter(p:Page,name:string,character?:string){
 await installSignedWallet(p);await p.goto('/public-world');
 await press(p,p.locator('.wallet-options').getByRole('button',{name:'Connect wallet',exact:true}));
 const response=p.waitForResponse(r=>r.url().endsWith('/api/auth/verify')&&r.request().method()==='POST');
 await press(p,p.getByRole('button',{name:'Sign in to Habitat',exact:true}));expect((await response).status()).toBe(200);
 await expect(p.getByRole('region',{name:'Complete character selection'})).toBeVisible({timeout:45000});
 if(character){await press(p,p.getByRole('button',{name:character,exact:true}));await expect(p.locator('.hb-preview-loading')).toHaveCount(0,{timeout:60000});}
 await p.getByRole('textbox',{name:'Name',exact:true}).fill(name);await press(p,p.getByRole('button',{name:'Enter Public World',exact:true}));
 await expect(p.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
 await expect.poll(async()=>((await(await p.request.get('/api/habitat/state')).json()) as HabitatState).world?.id).toBe(PUBLIC_WORLD_ID);
}
async function travel(p:Page,name:string){
 const close=p.getByRole('button',{name:'Close town life',exact:true});if(await close.isVisible())await press(p,close);
 await press(p,p.getByRole('button',{name:'Town map',exact:true}));
 const row=p.locator('.hb-town-destinations>div').filter({has:p.getByText(name,{exact:true})});
 await mutation(p,'town-travel',row.getByRole('button',{name:'Travel here ↗',exact:true}));
}
async function open(p:Page){const b=p.getByRole('button',{name:/^Town life/});if(await b.isVisible())await press(p,b);}
async function mutation(p:Page,path:string,b:Locator){
 // Keep both stages bounded independently: native input/actionability remains
 // 15s, and the server gets 15s after the input completes. Listen beforehand so
 // a fast legitimate response is retained, without spending its network budget
 // scrolling a long activity panel or waiting for GPU actionability frames.
 let receive!:(r:Response)=>void,timer:ReturnType<typeof setTimeout>|undefined;
 const response=new Promise<Response>(resolve=>{receive=resolve;});
 const observe=(r:Response)=>{if(r.url().endsWith(`/api/habitat/${path}`)&&r.request().method()==='POST')receive(r);};
 p.on('response',observe);
 try{
  await press(p,b);
  const result=await Promise.race([response,new Promise<Response>((_,reject)=>{timer=setTimeout(()=>reject(new Error(`No ${path} response within 15s after real input`)),15000);})]);
  expect(result.status()).toBe(200);
 }finally{if(timer)clearTimeout(timer);p.off('response',observe);}
}
async function routeWork(p:Page,name:string){
 const current=p.getByRole('article',{name:'Current work route'});
 await mutation(p,'town-route/work',current.getByRole('button',{name,exact:true}));
 const finish=current.getByRole('button',{name:'Finish route stop',exact:true});await expect(finish).toBeEnabled({timeout:15000});
 await mutation(p,'town-route/finish',finish);
}
async function capture(p:Page,name:string){
 // The 15s interaction deadline must not also constrain GPU readback. Keep
 // real PNG capture bounded separately; the overall 240s test budget is intact.
 await p.bringToFront();
 await assertTouchHUD(p);
 await p.screenshot({path:test.info().outputPath(name),scale:'css',timeout:45000});
}
async function focusGathering(p:Page){
 // Use the real accordion controls to leave the finished route/civic catalogs.
 // This keeps the social controls stable and reachable in the small scroll pane.
 for(const name of ['Build our town together','Neighborhood work routes']){
  const summary=p.locator('details[open]>summary').filter({hasText:new RegExp(`^${name}$`)});
  if(await summary.isVisible())await press(p,summary);
 }
}
async function spreadPeer(p:Page){
 await p.bringToFront();
 const touch=await p.context().newCDPSession(p),left=await p.getByRole('button',{name:'Move ←',exact:true}).boundingBox();expect(left).not.toBeNull();
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:left!.x+left!.width/2,y:left!.y+left!.height/2}]});
 try{await expect.poll(async()=>{const s=await(await p.request.get('/api/habitat/state')).json() as HabitatState;return s.players.find(p=>p.id===s.profile?.id)!.x;},{timeout:15000,intervals:[400]}).toBeLessThan(-1.5);}
 finally{await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
}
async function walkToTeaRoom(p:Page){
 await p.bringToFront();
 const close=p.getByRole('button',{name:'Close town life',exact:true});if(await close.isVisible())await press(p,close);
 const coarse=await p.evaluate(()=>matchMedia('(pointer:coarse)').matches);
 const cdp=coarse?await p.context().newCDPSession(p):null;
 const entrance=p.getByRole('button',{name:'Enter Willow Tea Room',exact:true}),approachStarted=Date.now();
 // Walk, rather than sprint, into a narrow doorway. The native touch log
 // confirmed both run/move pointer-up events arrive, but a late affordance
 // frame at software-WebGL FPS can overshoot the complete entry radius.
 if(cdp){const box=await p.getByRole('button',{name:'Move ←',exact:true}).boundingBox();expect(box).not.toBeNull();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:box!.x+box!.width/2,y:box!.y+box!.height/2}]});}
 else{await p.keyboard.down('KeyA');}
 // Stop when the real doorway affordance appears, not after an additional
 // network roundtrip while still running. Validate fresh server proximity
 // AFTER release, within the same original 20s approach budget.
 try{await expect(entrance).toBeVisible({timeout:20000});}
 finally{if(cdp){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else{await p.keyboard.up('KeyA');}}
 await expect.poll(async()=>{const s=await(await p.request.get('/api/habitat/state')).json() as HabitatState;const self=s.players.find(a=>a.id===s.profile?.id)!;return Math.hypot(self.x+8,self.z-2.8)<4&&await entrance.isVisible();},{timeout:Math.max(1,20000-(Date.now()-approachStarted)),intervals:[400]}).toBe(true);
 await mutation(p,'town-venue/enter',entrance);
}
async function walkToRoomExit(p:Page){
 await p.bringToFront();const exit=p.getByRole('button',{name:'Return through entrance',exact:true});
 if(await exit.isEnabled())return;
 const coarse=await p.evaluate(()=>matchMedia('(pointer:coarse)').matches),cdp=coarse?await p.context().newCDPSession(p):null,started=Date.now();
 // The neighbor walked left for the two-body proof. Return physically along
 // that path; an out-of-range exit must stay disabled/authoritatively rejected.
 if(cdp){const box=await p.getByRole('button',{name:'Move →',exact:true}).boundingBox();expect(box).not.toBeNull();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:box!.x+box!.width/2,y:box!.y+box!.height/2}]});}
 else await p.keyboard.down('KeyD');
 try{await expect(exit).toBeEnabled({timeout:20000});}
 finally{if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else await p.keyboard.up('KeyD');}
 await expect.poll(async()=>{const s=await(await p.request.get('/api/habitat/state')).json() as HabitatState,self=s.players.find(a=>a.id===s.profile?.id)!;return Math.hypot(self.x,self.z-6)<4&&await exit.isEnabled();},{timeout:Math.max(1,20000-(Date.now()-started)),intervals:[400]}).toBe(true);
}
// Separate signed-input scenarios keep each actual GPU journey within the
// unchanged 240s case budget. BOTH platform paths and every persistence check
// remain; neither browser is a simulated player or a mocked backend.
for(const device of ['desktop','touch'] as const){
 test(`${device} courier persists an ordered route while an independent neighbor sees its world changes`,async({page,baseURL})=>{
  const browser=await chromium.launch(test.info().project.use.launchOptions),context=await browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true}),peer=await context.newPage();
  const errors:string[]=[];for(const p of [page,peer]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|THREE.WebGL|shader error|context lost/i.test(m.text()))errors.push(m.text());});}
  const state=async(p:Page)=>(await(await p.request.get('/api/habitat/state')).json()) as HabitatState;
  try{
   await enter(page,'Desktop Courier');await enter(peer,'Touch Neighbor');expect((await state(page)).wallet).not.toBe((await state(peer)).wallet);
   const actor=device==='desktop'?page:peer,observer=device==='desktop'?peer:page;
   await travel(actor,'Applehill Orchard');await open(actor);
   await mutation(actor,'town-route/start',actor.getByRole('button',{name:'Start Orchard to café',exact:true}));await routeWork(actor,'Gather fruit');
   await actor.reload();await expect(actor.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
   expect((await state(actor)).town!.route?.step).toBe(1);
   const restored=await state(actor);expect(restored.players.find(player=>player.id===restored.profile?.id)).toMatchObject({x:0,z:6});
   await open(actor);await routeWork(actor,'Deliver fruit');
   expect((await state(actor)).town!.route).toBeNull();expect((await state(actor)).town!.progress.completed).toBe(1);
   const seen=(await state(observer)).town!;expect(seen.visits).toContainEqual(expect.objectContaining({siteId:'cafe'}));expect(seen.visits).toContainEqual(expect.objectContaining({siteId:'apple-baskets'}));
   expect(seen.progress.completed).toBe(0); // Shared changes do not forge personal work.
   await capture(actor,`saved-route-${device}.png`);expect(errors).toEqual([]);
  }finally{await browser.close();}
 });
}

test('independent desktop and touch neighbors consent to a synchronized gathering and retain attendance',async({page,baseURL})=>{
 const browser=await chromium.launch(test.info().project.use.launchOptions),context=await browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true}),peer=await context.newPage();
 const errors:string[]=[];for(const p of [page,peer]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|THREE.WebGL|shader error|context lost/i.test(m.text()))errors.push(m.text());});}
 const state=async(p:Page)=>(await(await p.request.get('/api/habitat/state')).json()) as HabitatState;
 try{
  await enter(page,'Fruit Courier');await enter(peer,'Orchard Neighbor');expect((await state(page)).wallet).not.toBe((await state(peer)).wallet);
  await spreadPeer(peer);await open(page);await open(peer);await focusGathering(page);await focusGathering(peer);
  await page.getByLabel('Gathering name',{exact:true}).fill('Willow friends dance');await page.getByLabel('Activity',{exact:true}).selectOption('dance');
  await mutation(page,'town-gathering/create',page.getByRole('button',{name:'Host gathering here',exact:true}));
  const event=peer.getByRole('article',{name:'Gathering Willow friends dance'});await expect(event).toBeVisible({timeout:15000});
  await mutation(peer,'town-gathering/join',event.getByRole('button',{name:'RSVP',exact:true}));
  await mutation(peer,'town-gathering/check-in',event.getByRole('button',{name:'Agree and join dance',exact:true}));
  const host=page.getByRole('article',{name:'Gathering Willow friends dance'});await expect(host.getByText('Orchard Neighbor · Here',{exact:true})).toBeVisible({timeout:15000});
  await mutation(page,'town-gathering/dance',host.getByRole('button',{name:'Start shared dance',exact:true}));
  const shared=(await state(page)).town!.gatherings[0];await expect.poll(async()=>(await state(peer)).town!.gatherings[0].startedAt).toBe(shared.startedAt);expect(shared.startedAt).toBeGreaterThan(0);
  await press(page,page.getByRole('button',{name:'Close town life',exact:true}));await press(peer,peer.getByRole('button',{name:'Close town life',exact:true}));
  await capture(page,'routes-gathering-desktop.png');await capture(peer,'routes-gathering-mobile.png');
  await open(page);await open(peer);await focusGathering(page);await focusGathering(peer);
  await mutation(peer,'town-gathering/leave',event.getByRole('button',{name:'Leave gathering',exact:true}));
  await mutation(page,'town-gathering/end',host.getByRole('button',{name:'End gathering',exact:true}));
  await peer.reload();await expect(peer.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});expect((await state(peer)).town!.history.some(e=>e.kind==='gathering-attended')).toBe(true);
  expect(errors).toEqual([]);
 }finally{await browser.close();}
});

// Separate bounded acceptance case: the route/reload/gathering GPU workload
// must not consume the time allocated to physically testing both doorways.
// Every previous interior/chat/return assertion remains, with genuine wallets.
test('desktop and touch players physically enter the same furnished room, chat and return',async({page,baseURL})=>{
 const browser=await chromium.launch(test.info().project.use.launchOptions),context=await browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true}),peer=await context.newPage();
 const errors:string[]=[];for(const p of [page,peer]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|THREE.WebGL|shader error|context lost/i.test(m.text()))errors.push(m.text());});}
 const state=async(p:Page)=>(await(await p.request.get('/api/habitat/state')).json()) as HabitatState;
 try{
  await enter(page,'Tea Host');await enter(peer,'Tea Neighbor','Fumiriya · Free');expect((await state(page)).wallet).not.toBe((await state(peer)).wallet);
  try{await walkToTeaRoom(page);await walkToTeaRoom(peer);}catch(error){
   const diagnostic=[];for(const [device,p] of [['desktop',page],['touch',peer]] as const){const s=await state(p),self=s.players.find(a=>a.id===s.profile?.id);diagnostic.push({device,world:s.world?.name,x:self?.x,z:self?.z,entrance:await p.getByRole('complementary',{name:'Public building entrance'}).textContent({timeout:1000}).catch(()=>null)});}
   await test.info().attach('doorway-state',{body:JSON.stringify(diagnostic),contentType:'application/json'});throw error;
  }
  expect((await state(peer)).world?.name).toBe('Willow Tea Room');expect((await state(peer)).players.some(p=>p.name==='Tea Host')).toBe(true);
  // Both arrive through the same physical door. Move with real touch input so
  // acceptance pixels show two distinct bodies, not stacked spawn avatars.
  await spreadPeer(peer);
  await expect.poll(async()=>(await state(page)).players.find(p=>p.name==='Tea Neighbor')?.appearance?.characterId).toBe('vroid-fumiriya');
  await press(page,page.getByRole('button',{name:'Chat nearby',exact:true}));await page.getByRole('textbox',{name:'Say something nearby',exact:true}).fill('Tea after our orchard round?');
  await mutation(page,'town-chat',page.getByRole('button',{name:'Say',exact:true}));
  await expect.poll(async()=>(await state(peer)).town!.chat.some(m=>m.text==='Tea after our orchard round?')).toBe(true);
  await capture(page,'tea-room-desktop.png');await capture(peer,'tea-room-mobile.png');
  for(const p of [page,peer]){await walkToRoomExit(p);await mutation(p,'town-venue/exit',p.getByRole('button',{name:'Return through entrance',exact:true}));expect((await state(p)).world?.name).toBe('Willow Square');}
  expect(errors).toEqual([]);
 }finally{await browser.close();}
});
