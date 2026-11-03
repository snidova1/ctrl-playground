import {defineConfig,devices} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

/** Isolated real-WebGL first-session visual acceptance, never run on production. */
const origin='http://127.0.0.1:3157';
const database=path.join(mkdtempSync(path.join(tmpdir(),'ctrl-visual-')),'habitat.sqlite');
export default defineConfig({
 testDir:'tests/browser',
 testMatch:'habitat-visual.spec.ts',
 timeout:180000,
 workers:1,
 use:{
  baseURL:origin,
  trace:'retain-on-failure',
  screenshot:'only-on-failure',
  launchOptions:{
   ...(process.env.CTRL_TEST_CHROMIUM?{executablePath:process.env.CTRL_TEST_CHROMIUM}:{}),
   args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']
  }
 },
 projects:[
  {name:'habitat-visual-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
  {name:'habitat-visual-mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}
 ],
 webServer:{
  command:'pnpm db:local && pnpm dev:next --hostname 127.0.0.1 --port 3157',
  url:origin,
  env:{CTRL_LOCAL_DB:database,APP_ORIGIN:origin,CTRL_MODE:'mock',NEXT_TELEMETRY_DISABLED:'1'},
  timeout:150000,
  reuseExistingServer:false
 },
 reporter:[['list']]
});
