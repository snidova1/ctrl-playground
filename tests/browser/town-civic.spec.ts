import {test,expect,chromium,type Page,type Locator} from '@playwright/test';
import {installSignedWallet} from './helpers/wallet';
import type {HabitatState} from '@/domain/habitat';
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
 const button=page.locator('.hb-town-action');
 await expect(button).toBeEnabled({timeout:60000});
 const started=page.waitForResponse(r=>r.url().endsWith('/api/habitat/town-job/start'));
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
