import {test,expect,type Page,type Locator} from '@playwright/test';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import type {Hex} from 'viem';
import type {HabitatState} from '@/domain/habitat';

/**
 * VISUAL acceptance test: valid GLB metadata + an HTML canvas are NOT enough.
 * Compare actual browser screenshots of VRM turning and furnished home versus
 * the exact same owned world after clearing its objects.
 */
async function installSignedWallet(page:Page) {
  const wallet=privateKeyToAccount(generatePrivateKey());
  await page.exposeBinding('__visualSign',async (_source,raw:string)=>wallet.signMessage({message:{raw:raw as Hex}}));
  await page.addInitScript(({address})=>{
    const provider={
      isMetaMask:true,on(){},removeListener(){},
      async request({method,params}:{method:string;params?:string[]}){
        if(method==='eth_chainId')return '0xb626';
        if(method==='net_version')return '46630';
        if(method==='eth_accounts'||method==='eth_requestAccounts')return [address];
        if(method==='wallet_requestPermissions')return [{parentCapability:'eth_accounts'}];
        if(method==='wallet_getPermissions')return [{parentCapability:'eth_accounts'}];
        if(method==='personal_sign')return (window as unknown as {__visualSign:(raw:string)=>Promise<string>}).__visualSign(params![0]);
        throw Error('Unsupported isolated wallet method: '+method);
      }
    };
    Object.defineProperty(window,'ethereum',{value:provider,configurable:true});
  },{address:wallet.address});
  return wallet;
}
async function press(page:Page,locator:Locator) {
  if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches))await locator.tap();
  else await locator.click();
}

/**
 * Decode composited Playwright PNGs in the browser using its image decoder.
 * No arbitrary screenshot baselines, network, dependencies or scene mocking.
 */
async function pixelDifference(page:Page,a:Buffer,b:Buffer) {
  return page.evaluate(async ([before,after])=>{
    const png=async(encoded:string)=>{
      const binary=atob(encoded);
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      return createImageBitmap(new Blob([bytes],{type:'image/png'}));
    };
    const [first,second]=await Promise.all([png(before),png(after)]);
    if(first.width!==second.width||first.height!==second.height)throw Error('Visual viewport size changed');
    const surface=document.createElement('canvas');
    surface.width=first.width;surface.height=first.height;
    const ctx=surface.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('Cannot inspect rendered PNG pixels');
    ctx.drawImage(first,0,0);
    const px=ctx.getImageData(0,0,first.width,first.height).data;
    ctx.clearRect(0,0,surface.width,surface.height);
    ctx.drawImage(second,0,0);
    const py=ctx.getImageData(0,0,first.width,first.height).data;
    let changed=0,total=0;
    for(let i=0;i<px.length;i+=16){
      const delta=Math.abs(px[i]-py[i])+Math.abs(px[i+1]-py[i+1])+Math.abs(px[i+2]-py[i+2]);
      if(delta>70)changed++;
      total++;
    }
    first.close();second.close();
    return changed/total;
  },[a.toString('base64'),b.toString('base64')] as [string,string]);
}

test('wallet player sees a rotating real VRoid preview and a visibly furnished, editable home',async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));

  await installSignedWallet(page);
  await page.goto('/worlds/editor');
  await press(page,page.getByRole('button',{name:/INJECTED|METAMASK/i}));
  await press(page,page.getByRole('button',{name:'SIGN SESSION CHALLENGE'}));
  await expect(page.getByRole('button',{name:'Enter my world draft'})).toBeVisible({timeout:45000});
  const avatar=page.locator('.hb-avatar-preview canvas');
  await expect(avatar).toBeVisible({timeout:60000});
  await expect(page.locator('.hb-preview-loading')).toHaveCount(0,{timeout:60000});
  await expect(page.locator('.hb-preview-error')).toHaveCount(0);
  await page.waitForTimeout(450);

  const before=await avatar.screenshot({path:test.info().outputPath('vrm-before-rotation.png')});
  const box=await avatar.boundingBox();
  expect(box).toBeTruthy();
  const centerX=box!.x+box!.width*.50,centerY=box!.y+box!.height*.52;
  await page.mouse.move(centerX,centerY);
  await page.mouse.down();
  await page.mouse.move(centerX+Math.min(150,box!.width*.32),centerY,{steps:12});
  await page.mouse.up();
  await page.waitForTimeout(800);
  const after=await avatar.screenshot({path:test.info().outputPath('vrm-after-rotation.png')});
  const rotationDelta=await pixelDifference(page,before,after);
  console.log('VRM visible rotation pixel-change:',(rotationDelta*100).toFixed(2)+'%');
  expect(rotationDelta,'The avatar preview must visibly change when the 3D model rotates').toBeGreaterThan(.025);

  await press(page,page.getByRole('button',{name:'Female',exact:true}));
  await press(page,page.getByRole('button',{name:'Outfit: Sage'}));
  await press(page,page.getByRole('button',{name:'Hair: Auburn'}));
  await press(page,page.getByRole('button',{name:'Eyes: Jade'}));
  await press(page,page.getByRole('button',{name:'Skin: Warm'}));
  await page.getByRole('textbox',{name:'Name',exact:true}).fill('Visible Home');
  await press(page,page.getByRole('button',{name:'Enter my world draft'}));
  await expect(page.getByRole('button',{name:'Build my world +'})).toBeVisible({timeout:45000});

  const response=await page.request.get('/api/habitat/state');
  expect(response.status()).toBe(200);
  const initial=await response.json() as HabitatState;
  expect(initial.wallet).toMatch(/^0x/);
  expect(initial.profile?.appearance).toEqual({version:1,gender:'female',variantId:'sage',hairId:'auburn',eyeId:'jade',skinId:'warm'});
  expect(initial.profile?.loadout.appearance).toEqual(initial.profile?.appearance);
  expect(initial.world?.objects.length,'Starter layout must persist on wallet-owned home').toBeGreaterThan(20);
  expect(initial.world?.objects.some(o=>o.behavior==='seat')).toBe(true);
  expect(initial.world?.objects.some(o=>o.assetId.includes('tree'))).toBe(true);
  await page.waitForTimeout(2200);

  const worldCanvas=page.locator('.hb-stage canvas').first();
  const furnished=await worldCanvas.screenshot({path:test.info().outputPath('furnished-starter-world.png')});
  await page.screenshot({path:test.info().outputPath('player-sees-furnished-habitat.png'),fullPage:true});

  // Clear this disposable newly signed-in test wallet only. Revision CAS
  // protects the write. A reload must not reseed an intentionally empty home.
  const cleared=await page.request.post('/api/habitat/save',{
    headers:{Origin:new URL(page.url()).origin},
    data:{worldId:initial.world!.id,revision:initial.world!.revision,objects:[]}
  });
  expect(cleared.status()).toBe(200);
  await page.reload();
  await expect(page.getByRole('button',{name:'Build my world +'})).toBeVisible({timeout:45000});
  const afterClear=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  expect(afterClear.world?.objects).toHaveLength(0);
  expect(afterClear.profile?.appearance).toEqual(initial.profile?.appearance);
  await page.waitForTimeout(1300);
  const emptyCanvas=page.locator('.hb-stage canvas').first();
  const emptyA=await emptyCanvas.screenshot({path:test.info().outputPath('intentionally-empty-control-world.png')});
  await page.waitForTimeout(500);
  const emptyB=await emptyCanvas.screenshot();
  const naturalAnimation=await pixelDifference(page,emptyA,emptyB);
  const worldDelta=await pixelDifference(page,furnished,emptyA);
  console.log('World vs empty rendered pixel-change:',(worldDelta*100).toFixed(2)+'%','idle variance:',(naturalAnimation*100).toFixed(2)+'%');
  expect(worldDelta,'Starter models must render visibly different from empty ground, beyond VRM idle animation')
    .toBeGreaterThan(Math.max(.025,naturalAnimation*2.5));
  // Regression for wallets that already have an empty home. It must be
  // recoverable by one visible action without creating a second world.
  const restore=page.getByRole('button',{name:'Use starter garden ✦'});
  await expect(restore).toBeVisible();
  await press(page,restore);
  await expect.poll(async()=>{
    const result=await (await page.request.get('/api/habitat/state')).json() as HabitatState;
    expect(result.homeId).toBe(initial.homeId);
    return result.world?.objects.length??0;
  },{timeout:25000}).toBeGreaterThan(20);
  await page.waitForTimeout(1200);
  await page.screenshot({path:test.info().outputPath('recovered-old-empty-wallet-world.png'),fullPage:true});
  expect(errors,'No unhandled browser rendering errors').toEqual([]);
});
