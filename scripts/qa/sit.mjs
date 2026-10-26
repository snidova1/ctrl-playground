// Sitting on chairs, the bed and the yard log seat, then standing up and walking away.
// Usage: node scripts/qa/sit.mjs http://localhost:3000 [outDir]
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000', out = process.argv[3] ?? 'test-results/sit';
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
await page.waitForTimeout(8000);
const seats = await run(() => [...window.__willow.targets.values()].filter(t => t.id.startsWith('seat-')).map(t => ({id: t.id, label: t.label, x: t.x, z: t.z})));
console.log('seats', JSON.stringify(seats));
for (const [i, s] of seats.entries()) {
  const before = await run(id => {
    const rt = window.__willow, t = rt.targets.get(id);
    rt.player.pos.set(t.x, rt.height(t.x, t.z + 1.2), t.z + 1.2); rt.camera.yaw = 0.6;
    t.run();
    return {pos: rt.player.pos.toArray(), angle: rt.player.angle, anim: rt.player.motion.current.anim};
  }, s.id);
  await page.waitForTimeout(5000);
  await page.screenshot({path: `${out}/seat-${i}.png`});
  const after = await run(async () => {
    const rt = window.__willow;
    const start = rt.player.pos.clone();
    rt.input.z = 1; await new Promise(r => setTimeout(r, 4000)); rt.input.z = 0;
    return {moved: rt.player.pos.distanceTo(start), anim: rt.player.motion.current.anim, y: rt.player.pos.y};
  });
  console.log(s.label, JSON.stringify(before), '-> stand up', JSON.stringify(after));
}
// Renovate: Interior tab zooms into the living room, Exterior frames the cottage again.
await run(() => window.__willow.openPanel('renovate'));
await page.waitForTimeout(3000);
await page.screenshot({path: `${out}/renovate-exterior.png`});
await page.getByRole('button', {name: /Interior/}).click();
await page.waitForTimeout(1500);
await page.getByRole('button', {name: 'Walnut'}).click();
await page.waitForTimeout(5000);
console.log('renovate interior', JSON.stringify(await run(() => ({indoors: window.__willow.ui.get().indoors, cam: window.__willow.camera.distance}))));
await page.screenshot({path: `${out}/renovate-interior.png`});
await page.getByRole('button', {name: /Exterior/}).click();
await page.waitForTimeout(5000);
console.log('renovate exterior again', JSON.stringify(await run(() => ({indoors: window.__willow.ui.get().indoors, cam: window.__willow.camera.distance}))));
console.log('errors', JSON.stringify(errors));
await browser.close();
