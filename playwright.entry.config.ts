import {defineConfig, devices} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const origin = process.env.CTRL_TEST_ORIGIN ?? 'http://127.0.0.1:3167';
const port = new URL(origin).port || '3167';
const production = process.env.CTRL_TEST_PRODUCTION === '1';
const database = path.join(mkdtempSync(path.join(tmpdir(), 'ctrl-entry-')), 'habitat.sqlite');

export default defineConfig({
  testDir: 'tests/browser',
  testMatch: 'habitat-entry.spec.ts',
  outputDir: 'test-results/habitat-entry',
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: origin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(process.env.CTRL_TEST_CHROMIUM ? {executablePath: process.env.CTRL_TEST_CHROMIUM} : {}),
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    {name: 'entry-desktop', use: {...devices['Desktop Chrome'], viewport: {width: 1440, height: 900}}},
    {name: 'entry-mobile', use: {...devices['iPhone 13'], defaultBrowserType: 'chromium'}},
  ],
  webServer: {
    command: `pnpm db:local && ${production ? 'CTRL_BUILD_TARGET=node pnpm exec next start' : 'pnpm dev:next'} --hostname 127.0.0.1 --port ${port}`,
    url: origin,
    env: {
      CTRL_LOCAL_DB: database,
      APP_ORIGIN: origin,
      CTRL_MODE: 'mock',
      NEXT_TELEMETRY_DISABLED: '1',
      WALLETCONNECT_PROJECT_ID: '',
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: '',
    },
    timeout: 150000,
    reuseExistingServer: false,
  },
  reporter: [['list']],
});
