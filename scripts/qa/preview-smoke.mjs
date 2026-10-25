// Post-deploy smoke for the wallet-free /preview route and the Common Ground landing.
// Runs in CI against CTRL_STAGING_ORIGIN after `cloudflare-staging.mjs deploy`.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const origin = process.env.CTRL_STAGING_ORIGIN;
assert(origin && (/^https:\/\/ctrl-staging\.[\w.-]+$/.test(origin) || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)), 'Staging or loopback preview origin required');
await mkdir('test-results', {recursive: true});
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']});
const results = [];
try {
  for (const mobile of [false, true]) {
    const label = mobile ? 'phone' : 'desktop';
    const context = await browser.newContext({viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 900}, hasTouch: mobile, isMobile: mobile});
    const page = await context.newPage();
    page.setDefaultTimeout(240000);
    const errors = [], privateApi = [], assetFailures = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {if (m.type() === 'error' && /shader|webglprogram|validate_status/i.test(m.text())) errors.push(m.text());});
    page.on('request', r => {const p = new URL(r.url()).pathname; if (p.startsWith('/api/') && !['/api/network', '/api/session'].includes(p)) privateApi.push(p);});
    page.on('response', r => {if (r.status() >= 400 && /\.(glb|vrm|png|webp)(\?|$)/.test(r.url())) assetFailures.push(r.url());});

    // Common Ground: open-air landing with a guest avatar and the wallet card.
    let res = await page.goto(`${origin}/`, {waitUntil: 'domcontentloaded'});
    assert.equal(res.status(), 200);
    await page.getByText('Willow Common', {exact: true}).first().waitFor();
    await page.waitForFunction(() => document.documentElement.dataset.sceneReady === 'true');
    await page.waitForTimeout(4000);
    await page.screenshot({path: `test-results/willow-${label}-common-ground.png`});

    // Offline demo: full gameplay loop with no wallet.
    res = await page.goto(`${origin}/preview?hour=11`, {waitUntil: 'domcontentloaded'});
    assert.equal(res.status(), 200);
    await page.getByPlaceholder('Your name').fill(mobile ? 'Kai' : 'Momo');
    await page.getByRole('button', {name: 'Move in!'}).click();
    await page.waitForFunction(() => window.__willow?.ui.get().life && window.__willow.targets.size > 20);
    await page.waitForTimeout(3000);
    await page.screenshot({path: `test-results/willow-${label}-town.png`});
    const flow = await page.evaluate(async () => {
      const rt = window.__willow, sleep = ms => new Promise(r => setTimeout(r, ms));
      const marlo = rt.targets.get('npc-marlo');
      rt.player.pos.set(marlo.x, 0.5, marlo.z - 1.3);
      marlo.run();
      await sleep(1500);
      const unlocked = rt.ui.get().life.hobbies.fishing.unlocked;
      rt.ui.set({dialog: null});
      const node = [...rt.targets.values()].find(t => t.id.startsWith('forage-'));
      rt.player.pos.set(node.x, 0, node.z + 0.8);
      node.run();
      await sleep(1800);
      await rt.act({type: 'buy', item: 'carrot-seed', quantity: 1});
      return {unlocked, foraged: rt.ui.get().life.foraged.ids.length, coins: rt.ui.get().life.coins};
    });
    assert.equal(flow.unlocked, true, 'Mentor teaches fishing');
    assert.equal(flow.foraged, 1, 'Foraging works');
    assert(flow.coins < 500, 'Shop purchase works');
    for (const panel of ['bag', 'shop', 'collection']) {
      await page.evaluate(p => window.__willow.openPanel(p), panel);
      await page.waitForTimeout(600);
      await page.screenshot({path: `test-results/willow-${label}-panel-${panel}.png`});
    }
    await page.evaluate(() => window.__willow.openPanel(null));
    assert.deepEqual(errors, [], 'No browser runtime errors');
    assert.deepEqual(assetFailures, [], 'No missing visual assets');
    assert.deepEqual(privateApi, [], 'Preview never calls wallet/private APIs');
    results.push({device: label, flow});
    await context.close();
  }
  await writeFile('test-results/preview-smoke.json', JSON.stringify({url: origin, browser: browser.version(), devices: results}, null, 2));
  console.log('Willow Common landing + offline gameplay smoke passed on desktop and phone.');
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({path: 'test-results/willow-failure.png'}).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
