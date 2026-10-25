// Visual check of fish assets: album icons, 3D catch card, held fish.
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000', out = process.argv[3] ?? 'test-results/fish';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await (await browser.newContext({viewport: {width: 1280, height: 760}})).newPage();
page.setDefaultTimeout(300000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${origin}/preview?hour=11`);
await page.getByPlaceholder('Your name').fill('Momo');
await page.getByRole('button', {name: 'Move in!'}).click();
await page.waitForFunction(() => window.__willow?.targets.has('npc-marlo'));
await page.waitForTimeout(4000);
const species = ['crucian-carp', 'pond-loach', 'goldfish', 'koi', 'river-trout', 'sweetfish', 'catfish', 'golden-trout', 'sardine', 'mackerel', 'sea-bream', 'flounder', 'pufferfish', 'bluefin-tuna'];
await page.evaluate(list => {
  const rt = window.__willow, life = structuredClone(rt.ui.get().life);
  for (const id of list) life.collection[id] = {count: 1, first: Date.now(), best: 40};
  rt.ui.set({life});
  rt.openPanel('collection');
}, species);
await page.waitForTimeout(1500);
await page.screenshot({path: `${out}/album.png`});
await page.evaluate(() => window.__willow.openPanel(null));
for (const id of ['koi', 'pufferfish', 'bluefin-tuna']) {
  await page.evaluate(id => window.__willow.ui.set({catchCard: {item: id, size: 62, first: true}}), id);
  await page.waitForTimeout(2500);
  await page.screenshot({path: `${out}/card-${id}.png`});
}
await page.evaluate(() => {
  const rt = window.__willow;
  rt.ui.set({catchCard: null});
  rt.player.pos.set(12, 0.55, 40); rt.player.angle = 0; rt.camera.yaw = 2.6; rt.camera.focus.set(12, 1, 40);
  rt.setAnim('cheer', 'none', 20000, 'happy');
  rt.player.motion.current.hold = {item: 'mackerel', size: 42, until: performance.now() + 20000};
});
// Software rendering runs at ~1-2 fps here, so give React a few frames to mount the fish.
await page.waitForTimeout(8000);
await page.evaluate(() => {const rt = window.__willow; rt.camera.yaw = rt.player.angle + 0.9;});
await page.waitForTimeout(3000);
await page.screenshot({path: `${out}/held.png`});
console.log('errors', errors);
await browser.close();
