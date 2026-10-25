// Focused check of the walk-in Habitat cottage: yard, walking in through the door, the living room, walking out.
// Usage: node scripts/qa/home.mjs http://localhost:3000 [outDir]
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000', out = process.argv[3] ?? 'test-results/home';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await (await browser.newContext({viewport: {width: 1280, height: 800}})).newPage();
page.setDefaultTimeout(300000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${origin}/preview?hour=11`);
await page.getByPlaceholder('Your name').fill('Momo');
await page.getByRole('button', {name: 'Move in!'}).click();
await page.waitForFunction(() => window.__willow?.targets.has('npc-marlo'));
const run = (fn, arg) => page.evaluate(fn, arg);
await run(async () => {const rt = window.__willow; rt.goto('home'); while (rt.ui.get().scene !== 'home') await new Promise(r => setTimeout(r, 200));});
await page.waitForTimeout(9000);
await run(() => {const rt = window.__willow; rt.player.pos.set(0, 0, 3); rt.player.angle = Math.PI; rt.camera.yaw = 0;});
await page.waitForTimeout(4000);
await page.screenshot({path: `${out}/yard.png`});
// Walk in and keep walking to the middle of the room.
const inside = await run(async () => {
  const rt = window.__willow;
  rt.input.z = -1;
  const t0 = performance.now();
  while (rt.player.pos.z > -5.2 && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 100));
  rt.input.z = 0;
  return {indoors: rt.ui.get().indoors, z: rt.player.pos.z, y: rt.player.pos.y, cam: rt.camera.distance};
});
console.log('inside', JSON.stringify(inside));
await page.waitForTimeout(5000);
await page.screenshot({path: `${out}/room.png`});
await run(() => {const rt = window.__willow; rt.camera.yaw = Math.PI * 0.75;});
await page.waitForTimeout(4000);
await page.screenshot({path: `${out}/room-turned.png`});
await run(() => window.__willow.openPanel('wardrobe'));
await page.waitForTimeout(5000);
await page.screenshot({path: `${out}/wardrobe.png`});
await run(() => window.__willow.openPanel(null));
const outside = await run(async () => {
  const rt = window.__willow;
  rt.camera.yaw = Math.PI; rt.input.z = -1;
  const t0 = performance.now();
  while (rt.player.pos.z < 0 && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 100));
  rt.input.z = 0;
  return {indoors: rt.ui.get().indoors, z: rt.player.pos.z, cam: rt.camera.distance};
});
console.log('outside', JSON.stringify(outside));
await page.waitForTimeout(4000);
await page.screenshot({path: `${out}/back-outside.png`});
console.log('errors', JSON.stringify(errors));
await browser.close();
