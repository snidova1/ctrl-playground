import {test,expect,chromium,type Page,type Locator} from '@playwright/test';
import {installSignedWallet} from './helpers/wallet';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world-geography';
import type {HabitatState} from '@/domain/habitat';

async function press(page:Page,target:Locator){
 if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches))await target.tap();
 else await target.click();
}
async function enterTown(page:Page,name:string){
 await installSignedWallet(page);
 expect((await page.goto('/public-world'))?.status()).toBe(200);
 await expect(page.locator('.wallet-options').getByRole('button',{name:'Connect wallet'})).toBeVisible({timeout:45000});
 await press(page,page.locator('.wallet-options').getByRole('button',{name:'Connect wallet'}));
 const verified=page.waitForResponse(r=>r.url().endsWith('/api/auth/verify')&&r.request().method()==='POST');
 await press(page,page.getByRole('button',{name:'Sign in to Habitat'}));
 expect((await verified).status()).toBe(200);
 await expect(page.getByRole('region',{name:'Complete character selection'})).toBeVisible({timeout:40000});
 await page.getByRole('textbox',{name:'Name',exact:true}).fill(name);
 await press(page,page.getByRole('button',{name:'Enter Public World',exact:true}));
 await expect(page.getByRole('heading',{name:'Willow Square',exact:true})).toBeVisible({timeout:45000});
 await expect(page.locator('.hb-stage canvas').first()).toBeVisible({timeout:60000});
 await expect(page.locator('.pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:60000});
}
async function diversity(page:Page,encoded:Buffer){
 return page.evaluate(async image=>{
  const binary=atob(image),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Cannot inspect actual rendered 3D pixels');
  ctx.drawImage(bitmap,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const colors=new Set<string>(),nonSky=new Set<string>();
  let black=0,samples=0;
  for(let y=100;y<bitmap.height-50;y+=23){
   for(let x=20;x<bitmap.width-20;x+=23){
    const i=(y*bitmap.width+x)*4;
    const c=[pixels[i]>>4,pixels[i+1]>>4,pixels[i+2]>>4].join(',');
    colors.add(c);
    if(pixels[i]>pixels[i+1]*.75&&pixels[i+1]>pixels[i+2]*.70)nonSky.add(c);
    if(x>bitmap.width*.1&&x<bitmap.width*.9&&y>bitmap.height*.3&&y<bitmap.height*.75){
      samples++;
      if(Math.max(pixels[i],pixels[i+1],pixels[i+2])<48)black++;
    }
   }
  }
  bitmap.close();
  return {colors:colors.size,nonSky:nonSky.size,nearBlack:black/Math.max(1,samples)};
 },encoded.toString('base64'));
}
test('signed player enters a rendered walkable multiplayer neighborhood, not a blank stage',async({page})=>{
 test.setTimeout(210000);
 const errors:string[]=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('console',msg=>{if(msg.type()==='error'&&/THREE.WebGL|shader error|context lost/i.test(msg.text()))errors.push(msg.text());});
 await installSignedWallet(page);
 expect((await page.goto('/public-world'))?.status()).toBe(200);
 await expect(page.locator('.masthead')).toHaveCount(0);
 await expect(page.locator('.wallet-options').getByRole('button',{name:'Connect wallet'})).toBeVisible({timeout:45000});
 await press(page,page.locator('.wallet-options').getByRole('button',{name:'Connect wallet'}));
 const verified=page.waitForResponse(r=>r.url().endsWith('/api/auth/verify')&&r.request().method()==='POST');
 await press(page,page.getByRole('button',{name:'Sign in to Habitat'}));
 expect((await verified).status()).toBe(200);
 await expect(page.getByRole('region',{name:'Complete character selection'})).toBeVisible({timeout:40000});
 await page.getByRole('textbox',{name:'Name',exact:true}).fill('Town Traveler');
 await press(page,page.getByRole('button',{name:'Enter Public World',exact:true}));
 await expect(page.getByRole('heading',{name:'Willow Square',exact:true})).toBeVisible({timeout:45000});
 const canvas=page.locator('.hb-stage canvas').first();
 await expect(canvas).toBeVisible({timeout:60000});
 await expect.poll(async()=>page.locator('.hb-town-label').count(),{timeout:30000}).toBeGreaterThan(3);
 const world=await page.request.get('/api/habitat/state');
 expect(world.status()).toBe(200);
 const state=await world.json() as {world?:{id:string}|null,homeId:string|null};
 expect(state.world?.id).toBe(PUBLIC_WORLD_ID);
 expect(state.homeId).not.toBe(PUBLIC_WORLD_ID);
 await page.waitForTimeout(1800);
 const shot=await canvas.screenshot({path:test.info().outputPath('willow-town-scene.png'),scale:'css'});
 const {colors,nonSky,nearBlack}=await diversity(page,shot);
 expect(colors,'Town rendering cannot be one flat floor color').toBeGreaterThan(35);
 expect(nonSky,'Town requires varied streets, walls, trees and architecture').toBeGreaterThan(18);
 expect(nearBlack,'Town paths/trees must not render as black untextured instancing squares').toBeLessThan(.045);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const hud=await page.evaluate(()=>{
  const selectors=['.hb-top','.hb-title','.hb-bottom','.hb-touch','.hb-chat-toggle','.hb-music-player','.hb-town-guide','.hb-life-dock'];
  const rects=selectors.flatMap(s=>[...document.querySelectorAll(s)].map(el=>el.getBoundingClientRect())).filter(r=>r.width&&r.height);
  let covered=0,total=0;
  for(let y=0;y<innerHeight;y+=8)for(let x=0;x<innerWidth;x+=8){total++;if(rects.some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom))covered++;}
  return {fraction:covered/total,overflow:rects.some(r=>r.left<0||r.right>innerWidth+1||r.bottom>innerHeight+1)};
 });
 expect(hud.overflow).toBe(false);expect(hud.fraction,'HUD must leave at least 70% of the world visible').toBeLessThan(.3);
 await expect(page.locator('.hb-title')).toContainText('local NPCs');
 await page.screenshot({path:test.info().outputPath('willow-full-viewport.png'),fullPage:true,scale:'css'});
 await test.info().attach('render-metrics',{body:JSON.stringify({colors,nonSky,nearBlack,hud}),contentType:'application/json'});
 await press(page,page.getByRole('button',{name:'Town map',exact:true}));
 await expect(page.getByRole('region',{name:'Willow Square map'})).toBeVisible();
 await press(page,page.getByRole('button',{name:'Close map',exact:true}));
 if(test.info().project.name==='town-mobile'){
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const timing=await page.evaluate(()=>new Promise<{frames:number;p50:number;p95:number}>(resolve=>{
   const deltas:number[]=[];let first=0,last=0;
   const tick=(t:number)=>{if(!first){first=t;last=t;}else{deltas.push(t-last);last=t;}
    if(t-first<3000)requestAnimationFrame(tick);else{deltas.sort((a,b)=>a-b);resolve({frames:deltas.length,p50:deltas[Math.floor(deltas.length*.5)],p95:deltas[Math.floor(deltas.length*.95)]});}};
   requestAnimationFrame(tick);
  }));
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  await test.info().attach('mobile-software-webgl-4x-cpu',{body:JSON.stringify(timing),contentType:'application/json'});
 }
 // Exercise the actual input path, then observe its signed server pose; do not
 // teleport refs or mock the presence API to make movement assertions pass.
 const originState=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
 const initial=originState.players.find(p=>p.id===originState.profile!.id)!;
 const displacement=async()=>{
  const s=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  const p=s.players.find(p=>p.id===s.profile!.id)!;
  return Math.hypot(p.x-initial.x,p.z-initial.z);
 };
 if(test.info().project.name==='town-mobile'){
  const cdp=await page.context().newCDPSession(page);
  const button=await page.getByRole('button',{name:'Move →',exact:true}).boundingBox();
  expect(button).not.toBeNull();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button!.x+button!.width/2,y:button!.y+button!.height/2}]});
  try{await expect.poll(displacement,{timeout:20000}).toBeGreaterThan(.35);}
  finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  const label=page.locator('.pl-name').filter({hasText:/^You$/});
  const before=await label.boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:140,y:300},{id:1,x:240,y:300}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:80,y:300},{id:1,x:300,y:300}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(async()=>((await label.boundingBox())?.width??0)/(before?.width??1),{timeout:5000}).toBeGreaterThan(1.1);
 }else{
  await page.keyboard.down('KeyD');
  try{await expect.poll(displacement,{timeout:20000}).toBeGreaterThan(.35);}
  finally{await page.keyboard.up('KeyD');}
  await page.mouse.move(850,350);await page.mouse.down();await page.mouse.move(980,380,{steps:10});await page.mouse.up();
  await page.mouse.wheel(0,-350);
 }
 await expect.poll(displacement,{timeout:7000}).toBeGreaterThan(.35);
 expect(errors).toEqual([]);
});

test('a signed player can travel across genuinely rendered remote districts and complete shared work',async({page})=>{
 test.setTimeout(210000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await enterTown(page,'District Explorer');
 const journeys=[
  {id:'garden',x:-75,z:46,activity:'community-garden'},
  {id:'residential',x:78,z:27,activity:'neighborhood-post'},
  {id:'harbor',x:5,z:-76,activity:'harbor-cleanup'},
  {id:'festival',x:77,z:-73,activity:'festival-stage'},
  {id:'workshop',x:-75,z:-52,activity:'artisan-project'},
  {id:'orchard',x:76,z:80,activity:'orchard-harvest'},
 ] as const;
 for(const target of journeys){
  await press(page,page.getByRole('button',{name:'Town map',exact:true}));
  const destinations=page.locator('.hb-town-destinations');
  await expect(destinations).toBeVisible();
  const name={garden:'Fernwood Park',residential:'Clover Neighborhood',harbor:'Tidewater Harbor',festival:'Sunset Meadow',workshop:'Artisan Row',orchard:'Applehill Orchard'}[target.id];
  await press(page,destinations.locator('div').filter({hasText:name}).getByRole('button',{name:'Travel here ↗'}));
  await expect.poll(async()=>{
   const response=await page.request.get('/api/habitat/state');const s=await response.json() as HabitatState;
   const p=s.players.find(p=>p.id===s.profile?.id);
   return p?Math.hypot(p.x-target.x,p.z-target.z):999;
  },{timeout:12000}).toBeLessThan(.15);
  await page.waitForTimeout(850);
  const canvas=page.locator('.hb-stage canvas').first();
  const png=await canvas.screenshot({path:test.info().outputPath(`district-${target.id}.png`),scale:'css'});
  const metric=await diversity(page,png);
  expect(metric.colors,target.id+' must contain nonempty rendered scenery').toBeGreaterThan(24);
  expect(metric.nearBlack,target.id+' must not render black WebGL placeholder').toBeLessThan(.08);
  await expect(page.locator('.hb-town-action')).toBeVisible();
  const work=await page.request.post('/api/habitat/town-activity',{headers:{Origin:'http://127.0.0.1:3187'},data:{id:target.activity}});
  expect(work.status(),target.id).toBe(200);
  const result=await work.json() as {state:HabitatState;message:string};
  expect(result.message.length).toBeGreaterThan(12);
 }
 expect(errors).toEqual([]);
});

test('two signed neighbors share speech and waves, visit a permitted home and keep their character',async({page,baseURL})=>{
 // Independent browser processes model two devices and avoid serializing both
 // software-WebGL views onto a single headless GPU process.
 const neighborBrowser=await chromium.launch(test.info().project.use.launchOptions);
 const neighborContext=await neighborBrowser.newContext({baseURL,viewport:page.viewportSize()!});
 const neighbor=await neighborContext.newPage();
 const errors:string[]=[];
 for(const p of [page,neighbor])p.on('pageerror',e=>errors.push(e.message));
 try{
  await enterTown(page,'Willow Host');await enterTown(neighbor,'Willow Friend');
  // Software WebGL on mobile needs to finish each remote VRM load before
  // exercising an eight-second transient bubble; canvas readiness is not avatar readiness.
  await expect(page.locator('.pl-name').filter({hasText:/^Willow Friend$/})).toBeVisible({timeout:60000});
  await expect(neighbor.locator('.pl-name').filter({hasText:/^Willow Host$/})).toBeVisible({timeout:60000});
  const owner=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  const friend=await (await neighbor.request.get('/api/habitat/state')).json() as HabitatState;
  await expect.poll(async()=>{
   const s=await (await neighbor.request.get('/api/habitat/state')).json() as HabitatState;
   return s.players.map(p=>p.id);
  }).toContain(owner.profile!.id);
  await press(page,page.getByRole('button',{name:'Chat nearby',exact:true}));
  await page.getByRole('textbox',{name:'Say something nearby'}).fill('Meet you by the canal!');
  await press(page,page.getByRole('button',{name:'Say',exact:true}));
  await expect(neighbor.locator('.hb-speech').filter({hasText:'Meet you by the canal!'})).toBeVisible({timeout:10000});
  await press(page,page.getByRole('button',{name:'Wave',exact:true}));
  await expect.poll(async()=>{
   const s=await (await neighbor.request.get('/api/habitat/state')).json() as HabitatState;
   return s.players.find(p=>p.id===owner.profile!.id)?.motion.celebrate;
  },{timeout:5000}).toBe(true);
  const headers={Origin:baseURL!};
  expect((await neighbor.request.get(`/api/habitat/worlds/${owner.homeId}`)).status()).toBe(404);
  expect((await page.request.post(`/api/habitat/worlds/${owner.homeId}/members`,{headers,data:{wallet:friend.wallet,role:'visitor'}})).status()).toBe(200);
  // The directory is populated by the permission-filtered server state.
  await expect.poll(async()=>{
   const s=await (await neighbor.request.get('/api/habitat/state')).json() as HabitatState;
   return s.worlds.map(w=>w.id);
  }).toContain(owner.homeId);
  await expect.poll(()=>neighbor.locator('.hb-title').innerText()).toContain('players online');
  await press(neighbor,neighbor.locator('.hb-town-guide').getByRole('button',{name:'Visit habitats ↗',exact:true}));
  const ownerHome=await (await page.request.get(`/api/habitat/worlds/${owner.homeId}`)).json() as HabitatState;
  await expect(neighbor.locator('.hb-world-row').filter({hasText:ownerHome.world!.name})).toBeVisible({timeout:10000});
  await press(neighbor,neighbor.locator('.hb-world-row').filter({hasText:ownerHome.world!.name}));
  await expect(neighbor).toHaveURL(/\/habitat$/,{timeout:30000});
  await expect(neighbor.locator('.hb-title h1')).toHaveText(ownerHome.world!.name,{timeout:30000});
  await expect(neighbor.getByRole('button',{name:'Build my world +',exact:true})).toHaveCount(0);
  // Revocation hides the private home and clears its active scene.
  expect((await page.request.delete(`/api/habitat/worlds/${owner.homeId}/members/${friend.profile!.id}`,{headers,data:{}})).status()).toBe(200);
  await expect(neighbor.getByText('World access is no longer available. Choose another place or go home.',{exact:true})).toBeVisible({timeout:15000});
  expect((await neighbor.request.get(`/api/habitat/worlds/${owner.homeId}`)).status()).toBe(404);
  await press(neighbor,neighbor.locator('.hb-top').getByRole('button',{name:'Public World',exact:true}));
  await expect(neighbor.locator('.hb-title h1')).toHaveText('Willow Square',{timeout:30000});
  await press(neighbor,neighbor.locator('.hb-top').getByRole('button',{name:'Habitat',exact:true}));
  await expect(neighbor.getByRole('button',{name:'Build my world +',exact:true})).toBeVisible({timeout:30000});
  await press(neighbor,neighbor.locator('.hb-top').getByRole('button',{name:'Public World',exact:true}));
  await expect(neighbor.locator('.hb-title h1')).toHaveText('Willow Square',{timeout:30000});
  const returned=await (await neighbor.request.get('/api/habitat/state')).json() as HabitatState;
  expect(returned.profile).toEqual(friend.profile);expect(returned.homeId).toBe(friend.homeId);
  expect(errors).toEqual([]);
 }finally{await neighborBrowser.close();}
});

test('persistent activity, friendship and consented dance work across two signed devices',async({page,baseURL})=>{
 test.setTimeout(300000);
 const peerBrowser=await chromium.launch(test.info().project.use.launchOptions);
 const peerContext=await peerBrowser.newContext({baseURL,viewport:page.viewportSize()!});
 const peer=await peerContext.newPage();
 const errors:string[]=[];for(const p of [page,peer])p.on('pageerror',e=>errors.push(e.message));
 try{
  await enterTown(page,'Café Contributor');await enterTown(peer,'Garden Companion');
  const original=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  const companion=await (await peer.request.get('/api/habitat/state')).json() as HabitatState;
  const start=page.waitForResponse(r=>r.url().endsWith('/api/habitat/town-job/start'));
  await press(page,page.locator('.hb-town-action'));
  expect((await start).status()).toBe(200);
  const active=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  expect(active.town?.job?.activityId).toBe('cafe-supplies');
  await page.reload();
  await expect(page.getByRole('heading',{name:'Willow Square',exact:true})).toBeVisible({timeout:45000});
  const restored=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  expect(restored.town?.job?.id).toBe(active.town?.job?.id);
  await expect(page.getByRole('button',{name:'Finish activity',exact:true})).toBeEnabled({timeout:15000});
  const finished=page.waitForResponse(r=>r.url().endsWith('/api/habitat/town-job/finish'));
  await press(page,page.getByRole('button',{name:'Finish activity',exact:true}));
  expect((await finished).status()).toBe(200);
  await expect.poll(async()=>((await (await peer.request.get('/api/habitat/state')).json()) as HabitatState).town?.contributions['cafe-supplies']?.neighbors).toBeGreaterThan(0);
  await press(page,page.getByRole('button',{name:/^Town life/}));
  const contributorRow=page.locator('.hb-life-row').filter({has:page.getByText('Garden Companion',{exact:true})});
  await expect(contributorRow).toBeVisible({timeout:15000});
  await press(page,contributorRow.getByRole('button',{name:'Add friend',exact:true}));
  await press(peer,peer.getByRole('button',{name:/^Town life/}));
  const incoming=peer.locator('.hb-life-row').filter({has:peer.getByText('Café Contributor',{exact:true})});
  await expect(incoming.getByRole('button',{name:'Accept friend',exact:true})).toBeVisible({timeout:15000});
  await press(peer,incoming.getByRole('button',{name:'Accept friend',exact:true}));
  await expect.poll(async()=>((await (await page.request.get('/api/habitat/state')).json()) as HabitatState).town?.friends.find(f=>f.id===companion.profile!.id)?.status).toBe('accepted');
  await press(page,contributorRow.getByRole('button',{name:'Invite dance',exact:true}));
  await expect(peer.getByRole('button',{name:'Join dance',exact:true})).toBeVisible({timeout:10000});
  const accepted=peer.waitForResponse(r=>r.url().endsWith('/api/habitat/town-social/accept'));
  await press(peer,peer.getByRole('button',{name:'Join dance',exact:true}));
  expect((await accepted).status()).toBe(200);
  const first=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  const second=await (await peer.request.get('/api/habitat/state')).json() as HabitatState;
  expect(first.town!.social[0].acceptedAt).toBeGreaterThan(0);
  expect(first.town!.social[0].acceptedAt).toBe(second.town!.social[0].acceptedAt);
  await press(page,page.getByRole('button',{name:'Close town life',exact:true}));
  await press(peer,peer.getByRole('button',{name:'Close town life',exact:true}));
  await page.waitForTimeout(1500);
  await page.screenshot({path:test.info().outputPath('two-player-consented-dance.png'),scale:'css'});
  await page.reload();
  await expect(page.getByRole('heading',{name:'Willow Square',exact:true})).toBeVisible({timeout:45000});
  const persistent=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  expect(persistent.town!.progress.completed).toBe(1);
  expect(persistent.town!.friends.find(f=>f.id===companion.profile!.id)?.status).toBe('accepted');
  expect(persistent.profile).toEqual(original.profile);
  expect(persistent.homeId).toBe(original.homeId);
  expect(JSON.stringify(persistent.town)).not.toMatch(/"(?:xp|level|coins|tokens|balance)":/);
  expect(errors).toEqual([]);
 }finally{await peerBrowser.close();}
});

test('complete character selection changes the rendered model and persists it across reload',async({page})=>{
 test.setTimeout(210000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await enterTown(page,'Wardrobe Traveler');
 await press(page,page.locator('.hb-top').getByRole('button',{name:'Settings',exact:true}));
 await press(page,page.getByRole('button',{name:'Change character',exact:true}));
 await press(page,page.getByRole('button',{name:'Victoria · Free',exact:true}));
 await expect(page.locator('.hb-preview-loading')).toHaveCount(0,{timeout:60000});
 const preview=page.locator('.hb-avatar-preview canvas');
 const before=await preview.screenshot({path:test.info().outputPath('avatar-original.png'),scale:'css'});
 await press(page,page.getByRole('button',{name:'Fumiriya · Free',exact:true}));
 await expect(page.locator('.hb-preview-loading')).toHaveCount(0,{timeout:60000});
 await page.waitForTimeout(1200);
 const after=await preview.screenshot({path:test.info().outputPath('avatar-fumiriya.png'),scale:'css'});
 expect(after.equals(before),'Changing wardrobe must change real rendered pixels').toBe(false);
 const saved=page.waitForResponse(r=>r.url().endsWith('/api/habitat/profile')&&r.request().method()==='POST');
 await press(page,page.getByRole('button',{name:'Save character',exact:true}));
 expect((await saved).status()).toBe(200);
 await expect(page.getByRole('heading',{name:'Willow Square',exact:true})).toBeVisible({timeout:45000});
 await page.reload();
 await expect(page.getByRole('heading',{name:'Willow Square',exact:true})).toBeVisible({timeout:45000});
 const state=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
 expect(state.profile?.appearance?.characterId).toBe('vroid-fumiriya');
 expect(errors).toEqual([]);
});
