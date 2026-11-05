// Character creator: screenshots every body style, per gender, with a hat and accessory on.
// Usage: node scripts/qa/bodies.mjs http://localhost:3000 [outDir]
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000', out = process.argv[3] ?? 'test-results/bodies';
await mkdir(out, {recursive: true});
const browser = await chromium.launch(process.env.QA_GPU ? {channel: 'chrome', headless: false, args: ['--window-position=-2600,0', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--autoplay-policy=no-user-gesture-required']} : {headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 1280, height: 800}});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => {if (m.type() === 'error' && !/favicon|AudioContext/.test(m.text())) errors.push(m.text().slice(0, 200));});
page.setDefaultTimeout(300000);
await page.goto(`${origin}/preview?hour=11`, {waitUntil: 'domcontentloaded'});
await page.getByPlaceholder('Your name').waitFor();
console.log('creator ready');
const chips = page.locator('.wc-creator .wc-chips').last().locator('button');
for (const gender of ['Girl', 'Boy']) {
  const g = page.getByRole('button', {name: new RegExp(gender)});
  if (await g.count()) await g.first().click();
  const n = await chips.count();
  for (let i = 0; i < n; i++) {
    const name = (await chips.nth(i).textContent())?.trim();
    await chips.nth(i).click();
    await page.waitForTimeout(6000);
    await page.screenshot({path: `${out}/${gender}-${name}.png`});
    console.log('shot', gender, name);
  }
}
// Hairstyles on the current (boy) body.
await page.getByRole('button', {name: /Hair & Eyes/}).click();
const styles = page.locator('.wc-creator .wc-chips').first().locator('button');
const count = await styles.count();
for (let i = 0; i < count; i++) {
  const name = (await styles.nth(i).textContent())?.trim();
  await styles.nth(i).click();
  await page.waitForTimeout(7000);
  await page.screenshot({path: `${out}/hair-${name}.png`});
  console.log('hair', name);
}
console.log('errors', JSON.stringify(errors));
await browser.close();
