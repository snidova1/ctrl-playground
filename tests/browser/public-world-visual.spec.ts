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
 await expect(page.getByRole('region',{name:'3D character creator'})).toBeVisible({timeout:40000});
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
 await expect(page.getByRole('region',{name:'3D character creator'})).toBeVisible({timeout:40000});
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
  const selectors=['.hb-top','.hb-title','.hb-bottom','.hb-touch','.hb-chat-toggle','.hb-music-player','.hb-town-guide'];
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
