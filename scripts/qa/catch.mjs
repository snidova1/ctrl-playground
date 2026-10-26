// Fishing end to end: cast from the pier, wait for the bite, reel in on the bite, check the catch card.
// Usage: node scripts/qa/catch.mjs http://localhost:3000 [outDir]
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000', out = process.argv[3] ?? 'test-results/catch';
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
await page.waitForTimeout(3000);
const result = await page.evaluate(async () => {
  const rt = window.__willow;
  await rt.act({type: 'talk', npc: 'marlo'}); // learn fishing
  rt.ui.set({dialog: null});
  const out = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    rt.player.pos.set(12, 0.55, 44); rt.player.angle = 0;
    const t0 = performance.now();
    while (!rt.targets.get('water') && performance.now() - t0 < 10000) await new Promise(r => setTimeout(r, 50));
    rt.targets.get('water').run();
    // Poll tightly and reel the moment the server's bite time arrives.
    const start = performance.now();
    while (performance.now() - start < 20000) {
      const life = rt.ui.get().life;
      if (life?.fishing && Date.now() + rt.ui.get().clockOffset >= life.fishing.biteAt) break;
      await new Promise(r => setTimeout(r, 20));
    }
    rt.ui.set({fishing: null});
    const events = await rt.act({type: 'reel', success: true});
    rt.player.locked = false;
    out.push({events: events?.map(e => e.type + (e.item ? `:${e.item}` : '') + (e.reason ? `:${e.reason}` : '')), card: rt.ui.get().catchCard?.item ?? null});
    if (rt.ui.get().catchCard) break;
  }
  return out;
});
console.log(JSON.stringify(result));
await page.waitForTimeout(3000);
await page.screenshot({path: `${out}/catch.png`});
console.log('errors', JSON.stringify(errors));
await browser.close();
