import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',testMatch:'world-editor.spec.ts',timeout:90000,workers:1,
  use:{
    baseURL:process.env.CTRL_TEST_ORIGIN??'http://127.0.0.1:3000',
    trace:'retain-on-failure',screenshot:'only-on-failure',
    launchOptions:{
      ...(process.env.CTRL_TEST_CHROMIUM?{executablePath:process.env.CTRL_TEST_CHROMIUM}:{}),
      args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],
    },
  },
  projects:[
    {name:'editor-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'editor-mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},
  ],
  webServer:{
    command:'pnpm db:local && pnpm dev:next',
    url:process.env.CTRL_TEST_ORIGIN??'http://127.0.0.1:3000',
    timeout:150000,
    reuseExistingServer:!process.env.CI,
  },
  reporter:[['list']],
});
