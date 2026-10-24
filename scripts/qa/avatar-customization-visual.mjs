import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const origin='http://127.0.0.1:3169',dir='test-results/avatar-customization';
await mkdir(dir,{recursive:true});
const report={origin,scope:'production Next build; serial Chromium SwiftShader; render verification is not visual acceptance',startedAt:new Date().toISOString(),checks:[],screenshots:[],modelResponses:[],requestFailures:[],pageErrors:[],shaderErrors:[],consoleErrors:[],warnings:[],privateWrites:[],limitations:['Two paired authored hair+outfit sets for female; one accepted male set; no independent haircut/costume mesh catalog.','Expression dataset is selection evidence, not proof every source supports every morph.'],fatal:null};
const browser=await chromium.launch({executablePath:'/home/celeng/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
let context;

const check=(name,pass,detail)=>{report.checks.push({name,pass,detail});console.log(JSON.stringify({name,pass,detail}));};
async function setup(mobile){
 context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});
 const p=await context.newPage();p.setDefaultTimeout(45000);
 p.on('pageerror',e=>report.pageErrors.push(e.message));
 p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());if(/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())&&m.type()==='error')report.shaderErrors.push(m.text());if(m.type()==='warning'&&report.warnings.length<60)report.warnings.push(m.text());});
 p.on('response',r=>{if(/\.(vrm|glb)(\?|$)/i.test(r.url()))report.modelResponses.push({url:r.url(),status:r.status()});});
 p.on('requestfailed',r=>report.requestFailures.push({url:r.url(),failure:r.failure()}));
 p.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.startsWith('/api/'))report.privateWrites.push(r.url());});
 const r=await p.goto(origin+'/avatar-studio',{waitUntil:'domcontentloaded'});check(mobile?'mobile HTTP':'desktop HTTP',r.status()===200,r.status());return p;
}
async function ready(p,gender,look){
 const id=`ctrl-anime-${gender}${look==='alternate'?'-studio':''}`;
 await p.waitForFunction(id=>document.querySelector('.hb-avatar-preview')?.dataset.avatarReady==='true'&&document.documentElement.dataset.ctrlAvatarModel===id,id,{timeout:60000});
 await p.waitForTimeout(450);
}
async function state(p){return p.evaluate(()=>({dataset:{...document.documentElement.dataset},values:Object.fromEntries([...document.querySelectorAll('select')].map(s=>[s.getAttribute('aria-label'),s.value]))}));}
async function snap(p,name,full=false){const path=`${dir}/${name}.png`;await (full?p:p.locator('.as-stage')).screenshot({path,fullPage:full});report.screenshots.push({name,path,...await state(p)});console.log('SCREENSHOT '+path);}
async function select(p,label,value){await p.getByRole('combobox',{name:label,exact:true}).selectOption(value);await p.waitForTimeout(180);}
async function clear(p){for(const l of ['Headwear','Eyewear','Earrings','Neckwear','Carry & back'])await select(p,l,'none');}
try{
 const p=await setup(false);await ready(p,'female','original');
 check('all customization controls present',(await p.getByRole('combobox').count())===12,await p.getByRole('combobox').count());
 for(const gender of ['female','male'])for(const look of gender==='male'?['original']:['original','alternate']){
  await p.getByRole('button',{name:gender==='female'?'Female':'Male',exact:true}).click();await select(p,'Hair & outfit model',look);await ready(p,gender,look);await clear(p);
  await snap(p,`desktop-${gender}-${look}-clean`);
  await select(p,'Headwear',gender==='female'?'beret':'headphones');await select(p,'Eyewear','round');await select(p,'Earrings','drops');await select(p,'Neckwear','scarf');await select(p,'Carry & back',look==='original'?'satchel':'wings');await select(p,'Expression','happy');await select(p,'Accessory color',gender==='female'?'rose':'navy');
  check(`${gender}/${look} accessories allocated`,Number((await state(p)).dataset.ctrlAvatarAccessoryCount)>0,await state(p));
  await snap(p,`desktop-${gender}-${look}-styled`);
 }
 await p.getByRole('button',{name:'Female',exact:true}).click();await select(p,'Hair & outfit model','original');await ready(p,'female','original');await clear(p);
 await p.getByRole('button',{name:'Face detail',exact:true}).click();
 const categories={'Headwear':['beret','beanie','cat','bunny','halo','crown','bow','headphones'],'Eyewear':['round','square','sun','monocle'],'Earrings':['hoops','drops','stars'],'Neckwear':['scarf','bowtie'],'Carry & back':['backpack','wings','satchel']};
 for(const [label,values] of Object.entries(categories)){
  for(const value of values){await select(p,label,value);const s=await state(p);check(`${label}/${value}`,s.values[label]===value&&Number(s.dataset.ctrlAvatarAccessoryCount)>0,{meshCount:s.dataset.ctrlAvatarAccessoryCount});await snap(p,`accessory-${label.toLowerCase().replaceAll(' ','-').replaceAll('&','and')}-${value}`);}
  await select(p,label,'none');
 }
 for(const value of ['neutral','happy','relaxed','angry','sad']){await select(p,'Expression',value);const s=await state(p);check(`expression/${value}`,s.dataset.ctrlAvatarExpression===value,s.dataset.ctrlAvatarExpression);await snap(p,`expression-${value}`);}
 await p.getByRole('button',{name:'Face detail',exact:true}).click();
 for(const [label,value] of [['Hair','ink'],['Eyes','ocean'],['Skin','deep'],['Wardrobe','slate']])await select(p,label,value);
 await p.getByRole('button',{name:'Walk',exact:true}).click();await p.waitForTimeout(300);const before=await p.locator('canvas').screenshot();await p.waitForTimeout(350);const after=await p.locator('canvas').screenshot();check('animated pixels advance',!before.equals(after));await snap(p,'desktop-tints-walk');
 await p.getByRole('button',{name:'Say hello',exact:true}).click();await p.waitForTimeout(300);await snap(p,'desktop-tints-wave');
 for(let i=1;i<=2;i++){const before=await state(p);await p.getByRole('button',{name:'↻ Randomize this character',exact:true}).click();const s=await state(p);await ready(p,'female',s.values['Hair & outfit model']);check(`randomize-${i}`,JSON.stringify(before.values)!==JSON.stringify(s.values)&&await p.locator('main').getAttribute('data-avatar-gender')==='female',s.values);await snap(p,`desktop-random-${i}`);}
 check('desktop no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await snap(p,'desktop-creator-full',true);await context.close();
 const m=await setup(true);await ready(m,'female','original');await select(m,'Hair & outfit model','alternate');await ready(m,'female','alternate');await select(m,'Headwear','bunny');await select(m,'Eyewear','round');await select(m,'Carry & back','satchel');await select(m,'Expression','happy');await snap(m,'mobile-female-alternate-creator',true);await snap(m,'mobile-female-alternate-stage');
 await m.getByRole('button',{name:'Male',exact:true}).tap();await select(m,'Hair & outfit model','original');await ready(m,'male','original');await select(m,'Headwear','crown');await select(m,'Carry & back','backpack');await snap(m,'mobile-male-original-creator',true);await snap(m,'mobile-male-original-stage');check('mobile no horizontal overflow',await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await m.getByRole('button',{name:'Face detail',exact:true}).tap();await snap(m,'mobile-male-face');
 check('three accepted VRM models fetched',new Set(report.modelResponses.filter(r=>r.status===200&&/\.vrm(\?|$)/i.test(r.url)).map(r=>new URL(r.url).pathname)).size===3,report.modelResponses);
 check('zero page errors',report.pageErrors.length===0,report.pageErrors);check('zero shader errors',report.shaderErrors.length===0,report.shaderErrors);check('zero private writes',report.privateWrites.length===0,report.privateWrites);
}catch(e){report.fatal=e.stack;console.error(e);}finally{if(context)await context.close().catch(()=>{});await browser.close();report.finishedAt=new Date().toISOString();await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));console.log('REPORT '+dir+'/report.json');}
process.exitCode=report.fatal?1:0;
