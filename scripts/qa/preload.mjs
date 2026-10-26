// Start screen: downloads every asset first (progress bar, no sizes), then the creator; a return visit skips it.
// Usage: node scripts/qa/preload.mjs http://localhost:3000 [outDir]
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000', out = process.argv[3] ?? 'test-results/preload';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
const page = await context.newPage();
page.setDefaultTimeout(300000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const t0 = Date.now();
await page.goto(`${origin}/preview`);
await page.waitForSelector('.wc-preload');
await page.waitForFunction(() => parseInt(document.querySelector('.wc-preload')?.textContent?.match(/(\d+)%/)?.[1] ?? '0') >= 15, null, {timeout: 120000}).catch(() => {});
await page.screenshot({path: `${out}/progress.png`});
const shown = await page.evaluate(() => document.querySelector('.wc-preload')?.textContent ?? '');
await page.getByPlaceholder('Your name').waitFor();
console.log('first visit: start screen', JSON.stringify(shown), 'mentions MB:', /MB|KB/.test(shown), 'ready in', Date.now() - t0, 'ms');
await page.screenshot({path: `${out}/creator.png`});
// Return visit in the same browser: files are cached, the start screen is skipped.
const t1 = Date.now();
await page.reload();
const sawPreload = await page.waitForSelector('.wc-preload', {timeout: 2500}).then(() => true, () => false);
await page.getByPlaceholder('Your name').waitFor();
console.log('second visit: start screen shown', sawPreload, 'ready in', Date.now() - t1, 'ms');
console.log('errors', JSON.stringify(errors));
await browser.close();
