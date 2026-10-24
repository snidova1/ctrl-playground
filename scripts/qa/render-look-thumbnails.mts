import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {airiLookPresets} from '../../features/plaza/characters/airi-look-presets';
import {availableHairStyles,newCharacterAppearance,resolveCharacter} from '../../features/plaza/characters/catalog';
import {availableWardrobeStyles} from '../../features/plaza/characters/wardrobe-catalog';
const origin=process.env.CTRL_UI_PREVIEW_ORIGIN??'http://127.0.0.1:3198';
const output='test-results/ui-redesign/preset-renders';await mkdir(output,{recursive:true});
const jobs:Array<{id:string;query:string}>=airiLookPresets.map(p=>({id:p.id,query:`preset=${p.id}`}));
for(const look of ['airi','airi-b'] as const){
 for(const hair of availableHairStyles('female',look))jobs.push({id:`hair-${look}-${hair.id}`,query:`look=${look}&hair=${hair.id}&outfit=source&frame=portrait`});
 for(const outfit of availableWardrobeStyles(resolveCharacter({...newCharacterAppearance('female'),lookId:look}).id))jobs.push({id:`outfit-${look}-${outfit.id}`,query:`look=${look}&hair=source&outfit=${outfit.id}`});
}
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{const page=await browser.newPage({viewport:{width:300,height:360}});page.setDefaultTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const job of jobs){await page.goto(`${origin}/workshop.html?view=thumbnail&${job.query}`,{waitUntil:'domcontentloaded'});await page.locator('.hb-avatar-preview[data-avatar-ready="true"]').waitFor();await page.locator('.hb-avatar-preview-label').evaluate(el=>{(el as HTMLElement).style.visibility='hidden';});await page.locator('.hb-avatar-preview canvas').screenshot({path:`${output}/${job.id}.png`});console.log('ACTUAL_STYLE_RENDER',job.id);}
 assert.deepEqual(errors,[]);await writeFile(`${output}/report.json`,JSON.stringify({source:'Actual shared VRM renderer and authored styles; only HTML helper caption hidden; no synthetic character art',presets:airiLookPresets.map(p=>p.id),renders:jobs.map(p=>p.id),errors},null,2));
}finally{await browser.close();}
