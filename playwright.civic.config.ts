import {defineConfig} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const origin='http://127.0.0.1:3194';
export default defineConfig({testDir:'tests/browser',testMatch:'town-civic.spec.ts',outputDir:'test-results/civic',workers:1,timeout:420000,
 use:{baseURL:origin,viewport:{width:1440,height:900},trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{executablePath:process.env.CTRL_CHROMIUM_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
 webServer:{command:'pnpm db:local && CTRL_BUILD_TARGET=node pnpm exec next start --hostname 127.0.0.1 --port 3194',url:origin,reuseExistingServer:false,timeout:150000,
 env:{CTRL_LOCAL_DB:path.join(mkdtempSync(path.join(tmpdir(),'ctrl-civic-browser-')),'world.sqlite'),APP_ORIGIN:origin,CTRL_MODE:'mock',NEXT_TELEMETRY_DISABLED:'1'}},reporter:[['list'],['json',{outputFile:'outputs/civic-browser-results.json'}]]});
