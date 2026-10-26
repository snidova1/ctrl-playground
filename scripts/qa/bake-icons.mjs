// Bake furniture icons from the game's own models into public/kit/icons/*.webp.
// Usage: node scripts/qa/bake-icons.mjs http://localhost:3000
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000';
const src = await readFile('game/core/items.ts', 'utf8');
const models = [...new Set([...src.matchAll(/furn\('[^']+', '[^']+', '([^']+)'/g)].map(m => m[1]))];
await mkdir('public/kit/icons', {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await (await browser.newContext({viewport: {width: 400, height: 300}})).newPage();
page.setDefaultTimeout(600000);
await page.goto(`${origin}/preview`);
await page.waitForFunction(() => typeof window.__willowThumb === 'function', null, {timeout: 300000}).catch(async () => {
  // The hook loads with the game bundle; open the creator so the UI chunk is in.
  await page.getByPlaceholder('Your name').fill('Icons');
  await page.getByRole('button', {name: 'Move in!'}).click();
  await page.waitForFunction(() => typeof window.__willowThumb === 'function');
});
let done = 0;
for (const model of models) {
  const url = await page.evaluate(async m => {try {localStorage.clear();} catch {} return window.__willowThumb(m);}, model);
  if (!url?.startsWith('data:image/webp')) {console.log('skip', model, url?.slice(0, 30)); continue;}
  await writeFile(`public/kit/icons/${model.replace('/', '--')}.webp`, Buffer.from(url.split(',')[1], 'base64'));
  done++;
}
console.log(`baked ${done}/${models.length} icons`);
await browser.close();
