import {defineConfig,devices} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const origin='http://127.0.0.1:3187';
const production=process.env.CTRL_QA_PRODUCTION==='1';
const database=path.join(mkdtempSync(path.join(tmpdir(),'ctrl-town-')),'worlds.sqlite');
export default defineConfig({
 testDir:'tests/browser',testMatch:'public-world-visual.spec.ts',workers:1,timeout:210000,
 use:{
  baseURL:origin,trace:{mode:'retain-on-failure',screenshots:false,snapshots:true,sources:true},screenshot:'only-on-failure',
  launchOptions:{executablePath:process.env.CTRL_CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 },
 projects:[
  {name:'town-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
  {name:'town-mobile',use:{...devices['iPhone 13'],viewport:{width:390,height:844},defaultBrowserType:'chromium'}}
 ],
 webServer:{
  command:production?'pnpm db:local && CTRL_BUILD_TARGET=node pnpm exec next start --hostname 127.0.0.1 --port 3187':'pnpm db:local && pnpm dev:next --hostname 127.0.0.1 --port 3187',
  url:origin,env:{CTRL_LOCAL_DB:database,APP_ORIGIN:origin,CTRL_MODE:'mock',NEXT_TELEMETRY_DISABLED:'1'},
  timeout:150000,reuseExistingServer:false
 },
 reporter:[['list'],['json',{outputFile:'outputs/public-world-browser-results.json'}]]
});
