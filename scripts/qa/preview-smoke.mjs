import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin=process.env.CTRL_STAGING_ORIGIN;
assert(origin?.startsWith('https://ctrl-staging.'),'Staging origin required');
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[],api=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
 const response=await page.goto(`${origin}/preview`,{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(response.status(),200);
 await page.getByText('NO WALLET · VISUAL PREVIEW',{exact:true}).waitFor();
 await page.locator('canvas').waitFor({timeout:60000});
 await page.waitForTimeout(15000);
 assert.equal(await page.getByRole('alert').count(),0,'WebGL scene must not hit error boundary');
 await page.keyboard.down('w');await page.waitForTimeout(750);await page.keyboard.up('w');
 await page.screenshot({path:'test-results/wallet-free-preview.png'});
 assert.deepEqual(api,[],'Preview must never call wallet or personal-world APIs');
 assert.deepEqual(errors,[],'Preview must not throw browser runtime errors');
 await writeFile('test-results/preview-smoke.json',JSON.stringify({url:`${origin}/preview`,http:200,canvas:true,noWalletApiRequests:true,pageErrors:errors},null,2));
 console.log('Wallet-free live preview smoke passed.');
}finally{await browser.close();}
