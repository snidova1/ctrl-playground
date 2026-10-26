// Visual check: standing on the arched bridges, and the Habitat travel button in the HUD.
// Usage: node scripts/qa/bridge.mjs http://localhost:3000 [outDir]
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000', out = process.argv[3] ?? 'test-results/bridge';
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
await page.waitForTimeout(4000);
const spots = [['north-mid', -27.6, -10, 0.1, 0], ['south-mid', -27, 19, -0.55, 0], ['south-end', -27, 19, -0.55, 3.2]];
for (const [name, bx, bz, rot, u] of spots) {
  const info = await page.evaluate(([bx, bz, rot, u]) => {
    const rt = window.__willow;
    const x = bx + Math.cos(rot) * u, z = bz + Math.sin(rot) * u;
    rt.player.pos.set(x, rt.height(x, z), z); rt.player.angle = Math.PI / 2 - rot; rt.camera.yaw = rot + Math.PI / 2 + 0.5; rt.camera.focus.set(x, 1.2, z);
    return {x, z, h: rt.height(x, z), walk: rt.walkable(x, z)};
  }, [bx, bz, rot, u]);
  await page.waitForTimeout(4500);
  console.log(name, JSON.stringify(info), 'y', await page.evaluate(() => window.__willow.player.pos.y));
  await page.screenshot({path: `${out}/${name}.png`});
}
const habitat = page.getByRole('button', {name: /Habitat/});
console.log('habitat button visible', await habitat.isVisible());
await habitat.click();
await page.waitForFunction(() => window.__willow.ui.get().scene === 'home', null, {timeout: 60000});
await page.waitForTimeout(6000);
await page.screenshot({path: `${out}/after-habitat.png`});
console.log('town button visible', await page.getByRole('button', {name: /Town/}).isVisible());
console.log('errors', JSON.stringify(errors));
await browser.close();
