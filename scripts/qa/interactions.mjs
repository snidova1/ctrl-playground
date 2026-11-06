// Every interaction in town and at home, one by one, with a screenshot and a result line each.
// Usage: QA_GPU=1 node scripts/qa/interactions.mjs http://localhost:3000 [outDir]
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.argv[2] ?? 'http://localhost:3000', out = process.argv[3] ?? 'test-results/interactions';
await mkdir(out, {recursive: true});
const browser = await chromium.launch(process.env.QA_GPU ? {channel: 'chrome', headless: false, args: ['--window-position=-2600,0', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling']} : {headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await (await browser.newContext({viewport: {width: 1280, height: 720}})).newPage();
page.setDefaultTimeout(600000);
const errors = [], results = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => {if (m.type() === 'error' && !/favicon|AudioContext|DevTools/.test(m.text())) errors.push(m.text().slice(0, 300));});
let k = 0;
const shot = name => page.screenshot({path: `${out}/${String(k++).padStart(3, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.png`});
const ev = (fn, arg) => page.evaluate(fn, arg);
const wait = ms => page.waitForTimeout(ms);
const log = (name, data) => {results.push({name, ...data}); console.log(data?.ok === false ? '✗' : '✓', name, JSON.stringify(data ?? {}).slice(0, 220));};

await page.goto(`${origin}/preview?hour=11&director=1`);
await page.getByPlaceholder('Your name').fill('Tester');
await page.getByRole('button', {name: 'Move in!'}).click();
await page.waitForFunction(() => window.__willow?.ui.get().life && window.__willow.targets.has('npc-marlo') && window.__willow.targets.has('resident-1') && !/Waking up/.test(document.body.innerText));
await wait(3000);

// Run a target by id or label: stand next to it first so the prompt logic picks it, then activate like a player.
async function use(match, opts = {}) {
  const r = await ev(async ([match, opts]) => {
    const rt = window.__willow;
    rt.ui.set({panel: null, dialog: null, photo: false, catchCard: null});
    if (rt.player.seat) {rt.input.z = -1; await new Promise(r => setTimeout(r, 300)); rt.input.z = 0;}
    const t = [...rt.targets.values()].find(t => t.id === match || t.label === match || (match.startsWith('/') && new RegExp(match.slice(1).replace(/\/$/, '')).test(t.label)));
    if (!t) return {ok: false, why: 'no target'};
    // Stand where a player could: a walkable spot next to the object, on the same side of the cottage wall.
    const wantInside = t.when ? t.when() : null;
    let x = 0, z = 0, found = false;
    for (const r of [0.45, 0.7, 1.0]) {
      for (let k = 0; k < 16 && !found; k++) {
        const a = (k / 16) * Math.PI * 2;
        x = t.x + Math.sin(a) * ((t.hx ?? 0) * Math.abs(Math.sin(a)) + (t.hz ?? 0) * 0 + r) ; z = t.z + Math.cos(a) * ((t.hz ?? 0) * Math.abs(Math.cos(a)) + r);
        if (!rt.walkable(x, z)) continue;
        rt.player.pos.set(x, rt.height(x, z), z);
        if (wantInside === null || t.when() === true) found = true;
      }
      if (found) break;
    }
    if (!found) return {ok: false, why: 'no reachable spot next to it', label: t.label};
    rt.player.pos.set(x, rt.height(x, z), z); rt.player.angle = Math.atan2(t.x - x, t.z - z);
    rt.camera.yaw = rt.player.angle + Math.PI + 0.6; rt.camera.snap = true;
    await new Promise(r => setTimeout(r, 600));
    const prompt = rt.ui.get().prompt;
    const picked = prompt?.id === t.id;
    rt.activate();
    await new Promise(r => setTimeout(r, opts.after ?? 1500));
    const ui = rt.ui.get();
    return {ok: true, label: t.label, picked, prompt: prompt?.label ?? null, panel: ui.panel, dialog: ui.dialog?.line?.slice(0, 50) ?? null, anim: rt.player.motion.current.anim, seated: !!rt.player.seat, toast: ui.toasts.at(-1)?.text ?? null, fishing: ui.fishing?.phase ?? null, card: ui.catchCard?.item ?? null};
  }, [match, opts]);
  // At the store and café doors the shopkeeper may win; their dialog opens the same panel.
  const shopkeeper = (match === 'station-store' && /Juno/.test(r.prompt ?? '')) || (match === 'station-cafe' && /Tomo/.test(r.prompt ?? ''));
  if (r.ok && !r.picked && !shopkeeper) r.ok = false, r.why = `prompt showed "${r.prompt}" instead`;
  log(`use ${match}`, r);
  await shot(match);
  return r;
}

// ---------------- Town ----------------
for (const npc of ['odette', 'juno', 'tomo', 'bea', 'marlo', 'pip', 'wren']) await use(`npc-${npc}`, {after: 1200});
for (const st of ['station-store', 'station-cafe', 'station-florist', 'station-hall']) await use(st, {after: 900});
for (let i = 0; i < 4; i++) await use(`bench-${i}`, {after: 1500});
await ev(() => {const rt = window.__willow; rt.input.z = -1;}); await wait(500); await ev(() => {window.__willow.input.z = 0;});
log('stood up from bench', await ev(() => ({ok: !window.__willow.player.seat})));
await use('/^Pick up', {after: 1500});
await use('/^Catch (Ladybug|Grasshopper|Hermit Crab|Stag Beetle|Cicada)/', {after: 2500, dx: 1.2, dz: 1.2});
if (await ev(() => [...window.__willow.targets.values()].some(t => /^Catch (Cabbage White|Swallowtail|Honeybee|Red Dragonfly|Blue Morpho)/.test(t.label)))) await use('/^Catch (Cabbage White|Swallowtail|Honeybee|Red Dragonfly|Blue Morpho)/', {after: 2500});
else log('flying bugs', {note: 'none spawned this hour'});
// Fishing from the pier with a full reel.
log('fishing', await ev(async () => {
  const rt = window.__willow; rt.ui.set({panel: null, dialog: null});
  rt.player.pos.set(12, 0.55, 44); rt.player.angle = 0;
  await new Promise(r => setTimeout(r, 800));
  const prompt = rt.ui.get().prompt?.label;
  rt.activate();
  const start = performance.now();
  while (performance.now() - start < 20000) {const life = rt.ui.get().life; if (life?.fishing && Date.now() + rt.ui.get().clockOffset >= life.fishing.biteAt) break; await new Promise(r => setTimeout(r, 20));}
  rt.ui.set({fishing: null});
  const events = await rt.act({type: 'reel', success: true}); rt.player.locked = false;
  return {ok: !!events, prompt, events: events?.map(e => e.type)};
}));
await wait(1200); await shot('fishing-catch');
// Fishing prompt must not steal a nearby NPC.
log('npc beats water prompt', await ev(async () => {
  const rt = window.__willow; const t = rt.targets.get('npc-marlo'); rt.ui.set({catchCard: null});
  rt.player.pos.set(t.x, 0.55, t.z - 1.2); rt.player.angle = 0; await new Promise(r => setTimeout(r, 700));
  return {ok: rt.ui.get().prompt?.id === 'npc-marlo', prompt: rt.ui.get().prompt?.label};
}));
// Camera: first person, selfie, snap.
log('photo modes', await ev(async () => {
  const rt = window.__willow; rt.player.pos.set(0, 0, 7); rt.ui.set({photo: true, photoView: 'first'}); await new Promise(r => setTimeout(r, 1200));
  rt.snap(); await new Promise(r => setTimeout(r, 600)); const first = !!rt.ui.get().lastPhoto;
  rt.ui.set({photoView: 'selfie', lastPhoto: null}); await new Promise(r => setTimeout(r, 1200)); rt.snap(); await new Promise(r => setTimeout(r, 600));
  return {ok: first && !!rt.ui.get().lastPhoto};
}));
await shot('selfie'); await ev(() => window.__willow.ui.set({photo: false, lastPhoto: null}));
// AI residents: hang out, follow, say bye.
log('resident hang out', await ev(async () => {
  const rt = window.__willow; const t = rt.targets.get('resident-0');
  rt.player.pos.set(t.x + 1.2, 0, t.z + 1.2); await new Promise(r => setTimeout(r, 700));
  const prompt = rt.ui.get().prompt?.label; t.run();
  rt.player.pos.set(3, 0, 8); await new Promise(r => setTimeout(r, 9000));
  const d = Math.hypot(t.x - 3, t.z - 8);
  return {ok: d < 3, prompt, distance: d.toFixed(1), label: t.label};
}));
await shot('resident-following');
await ev(() => window.__willow.targets.get('resident-0').run());
for (const id of ['station-gate', 'station-home']) log(`target exists ${id}`, await ev(id => ({ok: window.__willow.targets.has(id)}), id));

// ---------------- Home ----------------
await ev(() => window.__willow.goto('home'));
await page.waitForFunction(() => window.__willow.ui.get().scene === 'home');
await wait(5000);
await ev(() => {
  const d = window.__director, rt = window.__willow; const layout = d.getLayout();
  const R = (assetId, x, z, rotation = 0) => ({id: crypto.randomUUID(), assetId, x, z, rotation, room: true});
  const Y = (assetId, x, z, rotation = 0) => ({id: crypto.randomUUID(), assetId, x, z, rotation, room: false});
  d.setLayout([...layout.filter(o => !o.room), R('bed-single', -3, -1.9), R('sofa', -1.2, 2.2, 2), R('lounge-chair', 0.9, 1.0, 2), R('chair', 2, 0.3, 2), R('table-round', 2, -0.8),
    R('radio', 0.6, -2.6), R('tv', -0.6, -2.6), R('lamp-floor', 3.5, -2.5), R('fridge', 3.5, 2.6, 2), R('stove', 2.5, 2.6, 2), R('teddy', -3.5, 0.6, 1), R('desk', -3.2, 2.4, 1), R('bookcase', 1.6, -2.6), R('coat-rack', -2, -2.6),
    Y('campfire', 5, 7.4), Y('lantern', 3, 11), Y('log-seat', 6.6, 7.4, 1)]);
  rt.ui.set({panel: null});
});
await wait(1500);
for (const id of ['workbench', 'mailbox', 'pond-0', 'bus']) if (id !== 'bus') await use(id, {after: 1200});
await use('/^(Plant seeds|Water the plot|Harvest)/', {after: 1200});
await use('/Warm up by the fire/', {after: 1500});
await use('/Turn (off|on) the Garden Lantern/', {after: 800});
await use('/Sit on the Log Seat/', {after: 1500});
// Indoor targets must not answer from outside.
log('indoor gated outside', await ev(async () => {
  const rt = window.__willow; rt.player.pos.set(0, 0, 0.5); await new Promise(r => setTimeout(r, 600));
  const indoor = [...rt.targets.values()].filter(t => /Sofa|radio|TV|fridge|Cook at the stove/.test(t.label)).map(t => t.when?.());
  return {ok: indoor.length > 0 && indoor.every(v => v === false), n: indoor.length};
}));
// Walk in through the door.
log('walk inside', await ev(async () => {
  const rt = window.__willow; rt.player.seat = null; rt.setAnim('idle', 'none'); rt.player.pos.set(0, rt.height(0, -0.4), -0.4); rt.player.angle = Math.PI; rt.camera.yaw = 0; rt.input.z = -1;
  const t0 = performance.now(); while (!rt.ui.get().indoors && performance.now() - t0 < 20000) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 900)); rt.input.z = 0; return {ok: rt.ui.get().indoors};
}));
for (const m of ['/Nap on the Cozy Bed', '/Sit on the Lounge Sofa', '/Sit on the Lounge Chair', '/Sit on the Wooden Chair', '/Play the radio', '/Watch TV', '/Turn (off|on) the Floor Lamp', '/Open the fridge', '/Cook at the stove', '/Hug the teddy', '/Write a letter', '/Read a book', '/^Change outfit']) {
  await use(m, {after: 1600});
}
await ev(() => {const rt = window.__willow; rt.ui.set({panel: null});});
// Decorate + renovate open.
log('decorate mode', await ev(async () => {const rt = window.__willow; rt.ui.set({decorating: true, panel: 'home'}); await new Promise(r => setTimeout(r, 1200)); const ok = /Decorating/.test(document.body.innerText); rt.ui.set({decorating: false, panel: null}); return {ok};}));
await shot('decorate');
await ev(async () => {const rt = window.__willow; rt.player.angle = 0; rt.camera.yaw = Math.PI; rt.input.z = -1; const t0 = performance.now(); while (rt.ui.get().indoors && performance.now() - t0 < 20000) await new Promise(r => setTimeout(r, 100)); rt.input.z = 0; rt.player.pos.set(0, 0, 4); rt.player.angle = Math.PI; rt.camera.yaw = 0;});
await wait(800);
await ev(() => window.__willow.openPanel('renovate')); await wait(1500); await shot('renovate');
for (const label of ['Brick', 'Stucco', 'Log cabin', 'Steep', 'Barn']) {
  const b = page.getByRole('button', {name: label, exact: true}).first();
  if (await b.count()) {await b.click(); await wait(500);} else log(`renovate ${label}`, {ok: false, why: 'missing button'});
}
await shot('renovate-after');
await ev(() => window.__willow.ui.set({panel: null}));

// ---------------- Economy, social, decorating by hand ----------------
log('economy', await ev(async () => {
  const rt = window.__willow; const r = {};
  const life = () => rt.ui.get().life;
  r.buyChair = !!(await rt.act({type: 'buy', item: 'chair', quantity: 1})); r.chairs = life().inventory.chair ?? 0;
  const fish = Object.keys(life().inventory).find(id => /sardine|carp|bream|flounder|minnow|trout|koi|perch|goby|crab|tuna|puffer|mackerel|salmon/.test(id));
  r.fish = fish ?? null; if (fish) {const c = life().coins; r.sell = !!(await rt.act({type: 'sell', item: fish, quantity: 1})); r.coinsUp = life().coins > c;}
  const mush = Object.keys(life().inventory).find(id => /mushroom/.test(id) && life().inventory[id] > 0);
  if (mush) r.gift = !!(await rt.act({type: 'gift', npc: 'bea', item: mush}));
  await rt.act({type: 'forage', nodeId: 'x'}).catch(() => {});
  r.craftErr = await rt.act({type: 'craft', furniture: 'box'}).then(() => 'ok', e => String(e)); // may need wood
  rt.emote('wave', 'wave', 1200); r.emote = rt.player.motion.current.emote === 'wave';
  return {ok: r.buyChair && r.chairs > 0 && (r.sell !== false) && r.emote, ...r};
}));
log('decorate place by click', await ev(async () => {
  const rt = window.__willow; rt.ui.set({panel: null});
  rt.player.pos.set(0, rt.height(0, -0.4), -0.4); rt.player.angle = Math.PI; rt.camera.yaw = 0; rt.input.z = -1;
  const t0 = performance.now(); while (!rt.ui.get().indoors && performance.now() - t0 < 20000) await new Promise(r => setTimeout(r, 100));
  rt.input.z = 0; await new Promise(r => setTimeout(r, 900));
  rt.ui.set({decorating: true, panel: 'home'}); await new Promise(r => setTimeout(r, 1200));
  const before = window.__director.getLayout().length; window.__before = before;
  const slot = [...document.querySelectorAll('.wc-slot')].find(b => !b.classList.contains('locked'));
  slot?.click(); await new Promise(r => setTimeout(r, 500));
  return {ok: !!slot, before, slot: !!slot};
}));
{
  // Tap the floor in front of the camera to drop the chair.
  const box = await page.locator('canvas').first().boundingBox();
  for (const [fx, fy] of [[0.5, 0.62], [0.45, 0.7], [0.55, 0.55]]) await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  await wait(800);
  log('decorate placed', await ev(async () => {const d = window.__director; const after = d.getLayout().length; const rt = window.__willow; rt.ui.set({decorating: false, panel: null}); return {ok: after > window.__before, before: window.__before, after};}));
  await shot('decorate-placed');
}

await writeFile(`${out}/results.json`, JSON.stringify({results, errors}, null, 1));
const bad = results.filter(r => r.ok === false);
console.log(`\n${results.length} checks, ${bad.length} failed, ${errors.length} page errors`);
for (const b of bad) console.log('  ✗', b.name, b.why ?? '', JSON.stringify(b).slice(0, 160));
for (const e of errors.slice(0, 10)) console.log('  ! ', e);
await browser.close();
