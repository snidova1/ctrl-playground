import {test, expect, type Page, type Locator} from '@playwright/test';
import type {HabitatState} from '@/domain/habitat';
import {installSignedWallet} from './helpers/wallet';

async function press(page: Page, locator: Locator) {
  if (await page.evaluate(() => matchMedia('(pointer:coarse)').matches)) await locator.tap();
  else await locator.click();
}

async function signIn(page: Page) {
  const nonce = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/nonce' && response.request().method() === 'POST');
  const verified = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/verify' && response.request().method() === 'POST');
  await press(page, page.getByRole('button', {name: 'Sign in to Habitat', exact: true}));
  expect((await nonce).status(), 'Sign-in must obtain a real server nonce').toBe(200);
  expect((await verified).status(), 'The backend must verify the isolated wallet signature').toBe(200);
}

for (const route of ['/habitat', '/worlds/editor']) {
  test(`${route} keeps wallet entry reachable without a browser wallet`, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    expect(await page.evaluate(() => 'ethereum' in window)).toBe(false);
    expect((await page.request.get('/api/network')).status()).toBe(200);
    expect((await page.request.get('/api/habitat/state')).status()).toBe(401);

    const entry = page.locator('.hb-entry');
    const headerConnect = page.locator('.hb-top').getByRole('button', {name: 'Connect wallet', exact: true});
    const connect = entry.locator('.wallet-options').getByRole('button', {name: 'Connect wallet', exact: true});
    await expect(entry).toBeVisible({timeout: 30000});
    await expect(headerConnect).toBeVisible();
    await expect(connect).toBeVisible();
    await expect(page.locator('.hb-brand')).toContainText('COMMON GROUND');
    for (const name of ['Worlds', 'Character', 'Keys']) {
      await expect(page.locator('.hb-top').getByRole('button', {name, exact: true})).toHaveCount(0);
    }

    await press(page, connect);
    await expect(entry.getByRole('status')).toContainText('No browser wallet found');
    await expect(entry.getByRole('link', {name: 'Open in MetaMask'})).toHaveAttribute('href', /^https:\/\/metamask\.app\.link\/dapp\//);
    await page.keyboard.press('Escape');
    await expect(entry).toBeVisible();
    await press(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await expect(page.getByRole('combobox', {name: 'Graphics', exact: true})).toBeVisible();
    await expect(headerConnect).toBeVisible();
    await press(page, headerConnect);
    await expect(connect).toBeVisible();

    await press(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await press(page, page.getByRole('button', {name: 'Close', exact: true}));
    await expect(connect).toBeVisible();
    await press(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await page.keyboard.press('Escape');
    await expect(connect).toBeVisible();

    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.request.get('/api/habitat/state')).status()).toBe(401);
    expect(errors, 'Wallet entry must not produce unhandled browser errors').toEqual([]);
    await page.screenshot({path: test.info().outputPath('wallet-entry.png'), fullPage: true});
  });
}

test('a signed wallet completes setup and signs back into the same Habitat without repeating character creation', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const wallet = await installSignedWallet(page, 1);
  await page.goto('/habitat');
  await press(page, page.locator('.wallet-options').getByRole('button', {name: 'Connect wallet', exact: true}));
  await signIn(page);

  const creator = page.getByRole('region', {name: '3D character creator'});
  await expect(creator).toBeVisible({timeout: 30000});
  await page.keyboard.press('Escape');
  await expect(creator).toBeVisible();
  await press(page, page.getByRole('button', {name: 'Settings', exact: true}));
  await press(page, page.getByRole('button', {name: 'Close', exact: true}));
  await expect(creator).toBeVisible();
  await page.getByRole('textbox', {name: 'Name', exact: true}).fill('Returning Habitat');
  await press(page, page.getByRole('button', {name: 'Enter my world draft', exact: true}));
  await expect(page.getByRole('button', {name: 'Build my world +', exact: true})).toBeVisible({timeout: 30000});

  const initialResponse = await page.request.get('/api/habitat/state');
  expect(initialResponse.status()).toBe(200);
  const initial = await initialResponse.json() as HabitatState;
  expect(initial.wallet?.toLowerCase()).toBe(wallet.address.toLowerCase());
  expect(initial.profile?.name).toBe('Returning Habitat');
  expect(initial.world?.id).toBe(initial.homeId);
  expect(initial.world?.objects.length).toBeGreaterThan(20);
  await expect(page.locator('.hb-top').getByRole('button', {name: 'Worlds', exact: true})).toBeVisible();
  await expect(page.locator('.hb-top').getByRole('button', {name: 'Character', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Keys', exact: true})).toHaveCount(0);

  const logout = await page.request.post('/api/auth/logout', {
    headers: {Origin: new URL(page.url()).origin}, data: {},
  });
  expect(logout.status()).toBe(200);
  expect((await page.request.get('/api/habitat/state')).status()).toBe(401);
  await expect(page.locator('.hb-entry')).toBeVisible({timeout: 30000});
  const rejoined = page.waitForResponse(response => new URL(response.url()).pathname === '/api/habitat/join' && response.request().method() === 'POST');
  await signIn(page);
  expect((await rejoined).status()).toBe(200);
  const heartbeat = await page.waitForResponse(response => new URL(response.url()).pathname === '/api/habitat/presence' && response.status() === 200);
  expect((await heartbeat.json()).presenceSession.worldId).toBe(initial.homeId);

  await expect(page.getByRole('button', {name: 'Build my world +', exact: true})).toBeVisible({timeout: 30000});
  await expect(creator).toHaveCount(0);
  await expect(page.locator('.hb-entry')).toHaveCount(0);
  const restoredResponse = await page.request.get('/api/habitat/state');
  expect(restoredResponse.status()).toBe(200);
  const restored = await restoredResponse.json() as HabitatState;
  expect(restored.homeId).toBe(initial.homeId);
  expect(restored.world?.id).toBe(initial.world?.id);
  expect(restored.world?.objects).toEqual(initial.world?.objects);
  expect(restored.profile).toEqual(initial.profile);
  expect(errors, 'Wallet sign-in and restoration must not produce unhandled browser errors').toEqual([]);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.ctrlVillageReady),{timeout:90000}).toBe('true');
  await expect(page.locator('.hb-stage .pl-name').filter({hasText:/^You$/})).toBeVisible({timeout:90000});
  const stick=page.getByRole('group',{name:'Analog movement control',exact:true});
  await expect(page.locator('.hb-touch button')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/^Move [↑←↓→]$/})).toHaveCount(0);
  if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)){
    await expect(stick).toBeVisible();
    expect(await stick.evaluate(el=>{const b=el.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('.hb-analog-stick')===el;}),'Analog control center must not be covered by HUD links').toBe(true);
    const bounds=await stick.boundingBox();expect(bounds).toBeTruthy();
    expect(bounds!.width).toBe(120);expect(bounds!.height).toBe(120);
    const center={id:1,x:bounds!.x+bounds!.width/2,y:bounds!.y+bounds!.height/2};
    const readAxes=()=>stick.evaluate(el=>({x:Number(el.getAttribute('data-axis-x')),z:Number(el.getAttribute('data-axis-z'))}));
    const expectNeutral=async(why='initial')=>{await expect(stick,`neutral after ${why}`).toHaveAttribute('data-axis-x','0');await expect(stick).toHaveAttribute('data-axis-z','0');};
    const cdp=await page.context().newCDPSession(page);
    try{
      for(const ending of ['release','cancel','lostcapture','blur'] as const){
        if(ending==='lostcapture')await stick.evaluate(el=>el.addEventListener('pointerdown',event=>el.setAttribute('data-test-pointer-id',String((event as PointerEvent).pointerId)),{once:true}));
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[center]});
        await expectNeutral();
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...center,x:center.x+14,y:center.y-14}]});
        await expect.poll(async()=>{const {x,z}=await readAxes();return x>0.2&&z< -0.2&&Math.hypot(x,z)<0.8;}).toBe(true);
        // Capture must keep the drag alive outside the base, without diagonal overspeed.
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...center,x:center.x+90,y:center.y-90}]});
        await expect.poll(async()=>{const {x,z}=await readAxes();return x>0.6&&z< -0.6&&Math.hypot(x,z)<=1.000001;}).toBe(true);
        if(ending==='lostcapture'){
          await stick.evaluate(el=>{const id=Number(el.getAttribute('data-test-pointer-id'));el.releasePointerCapture(id);el.removeAttribute('data-test-pointer-id');});
          // CDP suppresses an identical touch coordinate; make a real pointer move
          // so the browser can dispatch its pending lostpointercapture event.
          await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...center,x:center.x+91,y:center.y-90}]});
        }
        if(ending==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
        if(ending==='release'||ending==='cancel')await cdp.send('Input.dispatchTouchEvent',{type:ending==='release'?'touchEnd':'touchCancel',touchPoints:[]});
        await expectNeutral(ending);
        if(ending==='lostcapture'||ending==='blur')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      }
    }finally{
      // Chrome rejects touchCancel after all touches have already ended. Cleanup
      // must never replace the original assertion result with that protocol error.
      await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}).catch(()=>{});
      await cdp.detach();
    }
    await expectNeutral();
  }else await expect(stick).toBeHidden();
  await page.screenshot({path: test.info().outputPath('returning-wallet-habitat.png'), fullPage: true});
});

// Common Ground is the open-air playable landing; signed Habitat remains separate.
test('Common Ground assigns one random guest avatar and supports real exploration',async({page})=>{
 const errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')writes.push(new URL(r.url()).pathname);});
 await page.goto('/');const main=page.locator('main.cg-lobby'),canvas=page.locator('canvas');
 await expect(main).toHaveAttribute('data-identity','guest');await expect(page.getByRole('heading',{name:'Common Ground',exact:true})).toBeVisible();
 await expect(canvas).toHaveAttribute('data-lobby-ready','true',{timeout:90000});await expect(canvas).toHaveAttribute('data-lobby-footprint','28x24');
 const id=await main.getAttribute('data-guest-id');expect(id).toBeTruthy();
 await expect(page.getByRole('button',{name:'Edit avatar',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Build',exact:true})).toHaveCount(0);
 const before=await canvas.getAttribute('data-guest-z');
 if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)){
  const box=await page.getByRole('button',{name:'Move forward',exact:true}).boundingBox();expect(box).toBeTruthy();const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box!.x+box!.width/2,y:box!.y+box!.height/2}]});try{await expect.poll(()=>canvas.getAttribute('data-guest-z'),{timeout:30000}).not.toBe(before);}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 }else{await page.keyboard.down('KeyW');try{await expect.poll(()=>canvas.getAttribute('data-guest-z'),{timeout:30000}).not.toBe(before);}finally{await page.keyboard.up('KeyW');}}
 await expect.poll(()=>canvas.getAttribute('data-guest-z'),{timeout:15000}).not.toBe(before);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await expect(canvas).toHaveAttribute('data-avatar-ready','true',{timeout:90000});
 await page.screenshot({path:test.info().outputPath('common-ground-open-air.png'),fullPage:true});
 await page.reload();await expect(main).toHaveAttribute('data-guest-id',id!);await expect(canvas).toHaveAttribute('data-lobby-ready','true',{timeout:90000});
 // Measuring after reload can wait behind software-WebGL shader compilation in WSL.
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),{timeout:30000}).toBe(true);expect(writes).toEqual([]);expect(errors).toEqual([]);
 await press(page,page.getByRole('button',{name:'Connect wallet',exact:false}));await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('form',{name:'Public World avatar'})).toHaveCount(0);
});
test('Common Ground stays explorable without VRM and Public World rejects unsigned entry',async({page})=>{
 await page.route('**/*.vrm',r=>r.abort('failed'));await page.goto('/courtyard');const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-lobby-ready','true',{timeout:90000});
 const before=await canvas.getAttribute('data-guest-z');await page.keyboard.down('KeyW');try{await expect.poll(()=>canvas.getAttribute('data-guest-z'),{timeout:30000}).not.toBe(before);}finally{await page.keyboard.up('KeyW');}
 await expect(page.getByRole('button',{name:'Connect wallet',exact:false})).toBeVisible();await page.goto('/public-world');await expect(page.getByRole('status')).toContainText('Connect your wallet');await expect(page.locator('canvas')).toHaveCount(0);
});
test('verified wallet creates a public avatar and enters Willow without receiving a Habitat',async({page})=>{
 await installSignedWallet(page,3);await page.goto('/');await press(page,page.getByRole('button',{name:'Connect wallet',exact:false}));const dialog=page.getByRole('dialog');await press(page,dialog.getByRole('button',{name:'Connect wallet',exact:true}));
 const verified=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/verify'&&r.request().method()==='POST');await press(page,dialog.getByRole('button',{name:'Sign in to CTRL',exact:true}));expect((await verified).status()).toBe(200);
 const form=page.getByRole('form',{name:'Public World avatar'});await expect(form).toBeVisible({timeout:30000});await form.getByRole('textbox',{name:'Avatar name'}).fill('Willow Explorer');await form.getByRole('combobox',{name:'Avatar character'}).selectOption('male');await form.getByRole('combobox',{name:'Avatar hair'}).selectOption('ink');await form.getByRole('combobox',{name:'Avatar outfit'}).selectOption('sage');
 const saved=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/habitat/public-profile'&&r.request().method()==='POST');await press(page,form.getByRole('button',{name:'Save avatar & enter Public World'}));expect((await saved).status()).toBe(200);
 await expect(page).toHaveURL(/\/public-world$/,{timeout:60000});await expect(page.locator('main[data-world="willow-common"]')).toHaveAttribute('data-player-name','Willow Explorer',{timeout:60000});
 const state=await(await page.request.get('/api/habitat/state')).json();expect(state.homeId).toBeNull();expect(state.world).toBeNull();expect(state.canEdit).toBe(false);
 const p=await(await page.request.get('/api/habitat/profile')).json();expect(p.profile.appearance).toMatchObject({gender:'male',hairId:'ink',variantId:'sage'});await expect(page.locator('main[data-world="willow-common"]')).toHaveAttribute('data-player-appearance',JSON.stringify(p.profile.appearance));
 await expect(page.locator('main[data-world="willow-common"]')).toHaveAttribute('data-ready','true',{timeout:90000});await expect(page.locator('main[data-world="willow-common"] canvas')).toHaveAttribute('data-avatar-ready','true',{timeout:90000});await page.screenshot({path:test.info().outputPath('public-world-custom-avatar.png')});
});
