// Quick visual capture of the /preview town at fixed spots (headless, SwiftShader).
// Usage: node scripts/qa/shots.mjs http://localhost:3000 out-dir
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000';
const out = process.argv[3] ?? 'test-results/shots';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await (await browser.newContext({viewport: {width: 1280, height: 720}})).newPage();
page.setDefaultTimeout(240000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${origin}/preview?hour=11`);
await page.getByPlaceholder('Your name').fill('Momo');
await page.getByRole('button', {name: 'Move in!'}).click();
await page.waitForFunction(() => window.__willow?.targets.size > 20);
await page.waitForTimeout(5000);
const spots = process.argv[4] ? process.argv[4].split(',').map(s => {const [n, ...v] = s.split(':'); return [n, ...v.map(Number)];}) : [['plaza', 0, 12, 0], ['street', -8, 4, 0.8], ['pond', 18, 9, -1.2], ['beach', 6, 30, 0], ['forest', 6, -26, 3.1], ['meadow', -36, 2, 1.6]];
for (const [name, x, z, yaw] of spots) {
  await page.evaluate(([x, z, yaw]) => {const rt = window.__willow; rt.player.pos.set(x, 0, z); rt.player.angle = yaw + Math.PI; rt.camera.yaw = yaw; rt.camera.focus.set(x, 1, z);}, [x, z, yaw]);
  await page.waitForTimeout(2500);
  await page.screenshot({path: `${out}/${name}.png`});
}
console.log('errors', errors);
await browser.close();
