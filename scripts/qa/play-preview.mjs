// End-to-end gameplay QA against the wallet-free /preview route (headless Chromium + SwiftShader).
// Usage: node scripts/qa/play-preview.mjs http://localhost:3000 [outDir]
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const origin = process.argv[2] ?? 'http://localhost:3000';
const out = process.argv[3] ?? 'test-results/play';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const report = {steps: [], errors: []};
const step = (name, data) => {report.steps.push({name, ...data}); console.log('✓', name, JSON.stringify(data ?? {}).slice(0, 200));};
try {
  for (const device of [{name: 'desktop', viewport: {width: 1280, height: 800}}, {name: 'phone', viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}]) {
    const context = await browser.newContext({viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.hasTouch});
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    page.on('pageerror', e => report.errors.push(`${device.name}: ${e.message}`));
    page.on('console', m => {if (m.type() === 'error' && !/favicon|DevTools/.test(m.text())) report.errors.push(`${device.name} console: ${m.text().slice(0, 300)}`);});
    const shot = name => page.screenshot({path: `${out}/${device.name}-${name}.png`});
    const t0 = Date.now();
    await page.goto(`${origin}/preview?hour=11`, {waitUntil: 'domcontentloaded'});
    await page.getByPlaceholder('Your name').fill(device.name === 'desktop' ? 'Momo' : 'Kai');
    await page.waitForTimeout(3500);
    await shot('creator');
    await page.getByRole('button', {name: 'Move in!'}).click();
    await page.waitForFunction(() => window.__willow?.ui.get().life && window.__willow.targets.has('npc-marlo') && window.__willow.targets.has('station-store'), null, {timeout: 300000});
    await page.waitForTimeout(3000);
    step(`${device.name}: town loaded`, {ms: Date.now() - t0});
    await shot('town-spawn');
    const run = (fn, arg) => page.evaluate(fn, arg);

    // Walk with the keyboard / joystick-equivalent input.
    await run(() => {window.__willow.input.z = -1;});
    await page.waitForFunction(() => window.__willow.player.pos.z < 10.5, null, {timeout: 60000}).catch(() => undefined);
    await run(() => {window.__willow.input.z = 0;});
    const moved = await run(() => ({x: window.__willow.player.pos.x, z: window.__willow.player.pos.z}));
    step(`${device.name}: walked`, moved);
    await shot('plaza');

    if (device.name === 'desktop') {
      // Talk to Marlo on the pier: unlocks fishing.
      const talk = await run(async () => {
        const rt = window.__willow;
        const t = rt.targets.get('npc-marlo');
        rt.player.pos.set(t.x, 0.55, t.z - 1.3); rt.player.angle = 0;
        await new Promise(r => setTimeout(r, 700));
        const prompt = rt.ui.get().prompt?.label;
        t.run();
        await new Promise(r => setTimeout(r, 1500));
        return {prompt, dialog: rt.ui.get().dialog?.line, fishing: rt.ui.get().life.hobbies.fishing.unlocked};
      });
      step('talk to Marlo', talk);
      await shot('dialog-marlo');
      await run(() => window.__willow.ui.set({dialog: null}));

      // Fish off the pier.
      const fish = await run(async () => {
        const rt = window.__willow;
        rt.player.pos.set(12, 0.55, 44); rt.player.angle = 0;
        await new Promise(r => setTimeout(r, 700));
        const water = rt.targets.get('water');
        if (!water) return {error: 'no water target', prompt: rt.ui.get().prompt?.label};
        water.run();
        const start = performance.now();
        while (rt.ui.get().fishing?.phase !== 'bite' && performance.now() - start < 12000) await new Promise(r => setTimeout(r, 100));
        const phase = rt.ui.get().fishing?.phase;
        return {phase, label: water.label};
      });
      step('cast and bite', fish);
      await shot('fishing-bite');
      // Win the reel through the real UI: press and hold the action button.
      const reelButton = page.locator('.wc-action').last();
      const box = await reelButton.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        for (let i = 0; i < 28; i++) {
          await page.waitForTimeout(120);
          const t = await run(() => document.querySelector('.wc-tension b')?.style.left ?? null);
          if (!t) break;
          const v = parseFloat(t);
          if (v > 62) {await page.mouse.up(); await page.waitForTimeout(90); await page.mouse.down();}
        }
        await page.mouse.up();
        await shot('fishing-reel');
      }
      const reel = await run(async () => {
        const rt = window.__willow;
        rt.ui.set({fishing: null});
        const events = await rt.act({type: 'reel', success: true});
        return {events, inv: Object.keys(rt.ui.get().life.inventory).length};
      });
      step('reeled in', reel);
      await page.waitForTimeout(800);
      await shot('catch-card');
      await run(() => window.__willow.ui.set({catchCard: null}));

      // Forage the nearest node.
      const forage = await run(async () => {
        const rt = window.__willow;
        const node = [...rt.targets.values()].find(t => t.id.startsWith('forage-'));
        rt.player.pos.set(node.x, 0, node.z + 0.8); rt.player.angle = Math.PI;
        node.run();
        await new Promise(r => setTimeout(r, 1800));
        return {node: node.label, foraged: rt.ui.get().life.foraged.ids.length};
      });
      step('foraged', forage);

      // Shop: buy seeds.
      const shop = await run(async () => {
        const rt = window.__willow;
        await rt.act({type: 'buy', item: 'potato-seed', quantity: 2});
        return {coins: rt.ui.get().life.coins, seeds: rt.ui.get().life.inventory['potato-seed']};
      });
      step('bought seeds', shop);
      for (const panel of ['shop', 'bag', 'collection', 'quests', 'hobbies', 'map', 'wardrobe']) {
        await run(p => window.__willow.openPanel(p, p === 'shop' ? 'fashion' : null), panel);
        await page.waitForTimeout(panel === 'wardrobe' ? 4000 : 700);
        await shot(`panel-${panel}`);
      }
      await run(() => window.__willow.openPanel(null));

      // Tour of town areas.
      for (const [name, x, z, yaw] of [['cafe', 12, -6, 0], ['pond', 22, 15, 0.4], ['beach', 6, 31, 0], ['forest', 8, -30, 0], ['meadow', -38, 0, -1.2], ['river', -22, -10, -1.4]]) {
        await run(([x, z, yaw]) => {const rt = window.__willow; rt.player.pos.set(x, 0, z); rt.camera.yaw = yaw; rt.camera.focus.set(x, 1, z);}, [x, z, yaw]);
        await page.waitForTimeout(1500);
        await shot(`tour-${name}`);
      }

      // Bus home, garden and decorate.
      const home = await run(async () => {
        const rt = window.__willow;
        rt.goto('home');
        const start = performance.now();
        while (rt.ui.get().scene !== 'home' && performance.now() - start < 15000) await new Promise(r => setTimeout(r, 200));
        await new Promise(r => setTimeout(r, 2500));
        const life = rt.ui.get().life;
        const plant = await rt.act({type: 'plant', plot: 0, seed: 'turnip-seed'}).then(() => null).catch(e => String(e));
        return {scene: rt.ui.get().scene, plots: life.plots.length, plant, gardening: rt.ui.get().life.hobbies.gardening.unlocked, targets: [...rt.targets.keys()].slice(0, 12)};
      });
      step('went home', home);
      await shot('home-yard');
      // Walk-in cottage: same scene, through the doorway, camera zooms in.
      const door = await run(async () => {
        const rt = window.__willow;
        const path = [];
        for (let z = 1; z >= -6; z -= 0.25) path.push(rt.walkable(0, z));
        const wall = rt.walkable(2.5, -2.85);
        rt.player.pos.set(0, rt.height(0, -0.4), -0.4); rt.player.angle = Math.PI; rt.camera.yaw = 0;
        rt.input.z = -1;
        const t0 = performance.now();
        while (!rt.ui.get().indoors && performance.now() - t0 < 30000) await new Promise(r => setTimeout(r, 100));
        await new Promise(r => setTimeout(r, 1200));
        rt.input.z = 0;
        return {pathOpen: path.every(Boolean), wallBlocks: !wall, indoors: rt.ui.get().indoors, scene: rt.ui.get().scene, z: rt.player.pos.z, y: rt.player.pos.y, cam: rt.camera.distance};
      });
      step('walked indoors', door);
      await page.waitForTimeout(2500);
      await shot('home-room');
      await run(() => window.__willow.ui.set({decorating: true}));
      await page.waitForTimeout(800);
      await shot('home-decorate');
      await run(() => window.__willow.ui.set({decorating: false, panel: null}));
      const out = await run(async () => {
        const rt = window.__willow;
        rt.player.angle = 0; rt.camera.yaw = Math.PI; rt.input.z = -1; // forward, with the camera turned to face the door
        const t0 = performance.now();
        while (rt.ui.get().indoors && performance.now() - t0 < 30000) await new Promise(r => setTimeout(r, 100));
        rt.input.z = 0;
        return {indoors: rt.ui.get().indoors, z: rt.player.pos.z, cam: rt.camera.distance};
      });
      step('walked back outside', out);
      // Renovation: restyle the cottage outside, preview live, save.
      await run(async () => {const rt = window.__willow; await new Promise(r => setTimeout(r, 500)); rt.player.pos.set(0, 0, 4); rt.player.angle = Math.PI; rt.camera.yaw = 0; rt.camera.distance = 9; rt.openPanel('renovate');});
      await page.waitForTimeout(1500);
      await shot('renovate-before');
      for (const label of ['Brick', 'Barn', 'Arched', 'Save']) {
        await page.getByRole('button', {name: label, exact: true}).first().click();
        await page.waitForTimeout(700);
      }
      await page.waitForTimeout(1500);
      await shot('renovate-after');
      const saved = await run(() => JSON.parse(localStorage.getItem('willow-preview-house-v1') ?? 'null'));
      step('renovated home', {saved});
    }
    await context.close();
  }
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`errors: ${report.errors.length}`);
  for (const e of report.errors.slice(0, 20)) console.log('  ✗', e);
}
