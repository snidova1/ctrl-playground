import {test,expect,type Page,type Locator} from '@playwright/test';
import {installSignedWallet} from './helpers/wallet';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world-geography';

async function press(page:Page,target:Locator){
 if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches))await target.tap();
 else await target.click();
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
  for(let y=100;y<bitmap.height-50;y+=23){
   for(let x=20;x<bitmap.width-20;x+=23){
    const i=(y*bitmap.width+x)*4;
    const c=[pixels[i]>>4,pixels[i+1]>>4,pixels[i+2]>>4].join(',');
    colors.add(c);
    if(pixels[i]>pixels[i+1]*.75&&pixels[i+1]>pixels[i+2]*.70)nonSky.add(c);
   }
  }
  bitmap.close();
  return {colors:colors.size,nonSky:nonSky.size};
 },encoded.toString('base64'));
}
test('signed player enters a rendered walkable multiplayer neighborhood, not a blank stage',async({page})=>{
 test.setTimeout(210000);
 const errors:string[]=[];
 page.on('pageerror',err=>errors.push(err.message));
 await installSignedWallet(page);
 expect((await page.goto('/public-world'))?.status()).toBe(200);
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
 const shot=await canvas.screenshot({path:test.info().outputPath('willow-town-scene.png')});
 const {colors,nonSky}=await diversity(page,shot);
 expect(colors,'Town rendering cannot be one flat floor color').toBeGreaterThan(35);
 expect(nonSky,'Town requires varied streets, walls, trees and architecture').toBeGreaterThan(18);
 await page.screenshot({path:test.info().outputPath('willow-full-viewport.png'),fullPage:true});
 expect(errors).toEqual([]);
});
