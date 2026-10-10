import {test, expect, type Page, type Locator} from '@playwright/test';
import {generatePrivateKey, privateKeyToAccount} from 'viem/accounts';
import type {HabitatState} from '@/domain/habitat';

// Only the isolated browser test provides this wallet. The real nonce and
// signature endpoints validate every session; no auth or application routes are mocked.
async function installWallet(page: Page) {
  const account = privateKeyToAccount(generatePrivateKey());
  await page.exposeBinding('__ctrlWalletSign', async (_source, raw: `0x${string}`) => account.signMessage({message: {raw}}));
  await page.addInitScript(({wallet}) => {
    const provider = {
      isMetaMask: true,
      on() {}, removeListener() {},
      async request({method, params}: {method: string; params?: string[]}) {
        if (method === 'eth_chainId') return '0xb626';
        if (method === 'net_version') return '46630';
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [wallet];
        if (method === 'wallet_requestPermissions') return [{parentCapability: 'eth_accounts'}];
        if (method === 'wallet_getPermissions') return [{parentCapability: 'eth_accounts'}];
        if (method === 'personal_sign') return (window as unknown as {__ctrlWalletSign: (raw: string) => Promise<string>}).__ctrlWalletSign(params![0]);
        throw new Error(`Unsupported test-wallet method: ${method}`);
      },
    };
    Object.defineProperty(window, 'ethereum', {value: provider, configurable: true});
  }, {wallet: account.address});
  return account;
}
async function pointer(page: Page, locator: Locator) {
  if (await page.evaluate(() => matchMedia('(pointer:coarse)').matches)) await locator.tap();
  else await locator.click();
}
async function openWorld(page: Page) {
  await installWallet(page);
  await page.goto('/worlds/editor');
  await expect(page.locator('.hb-stage canvas')).toBeVisible({timeout: 60000});
  await pointer(page, page.getByRole('button', {name: /INJECTED|METAMASK/i}));
  await pointer(page, page.getByRole('button', {name: 'SIGN SESSION CHALLENGE'}));
  await expect(page.getByRole('button', {name: 'Enter my world draft'})).toBeVisible({timeout: 30000});
  await page.getByRole('textbox', {name: 'Name', exact: true}).fill('CTRL Browser Builder');
  await pointer(page, page.getByRole('button', {name: 'Male', exact: true}));
  await pointer(page, page.getByRole('button', {name: 'Enter my world draft'}));
  await expect(page.getByRole('button', {name: 'Build my world +'})).toBeVisible({timeout: 30000});
  const response = await page.request.get('/api/habitat/state');
  expect(response.status()).toBe(200);
  const state = await response.json() as HabitatState;
  expect(state.wallet).toMatch(/^0x/);
  expect(state.profile?.character).toBe('male');
  return state;
}
async function build(page: Page) {
  await pointer(page, page.getByRole('button', {name: 'Build my world +'}));
  await expect(page.getByRole('toolbar', {name: '3D world tools'})).toBeVisible();
}
async function inspector(page: Page) {
  const tab = page.getByRole('button', {name: /^Inspector ·/});
  if (await tab.isVisible()) await pointer(page, tab);
}
async function catalog(page: Page) {
  const tab = page.getByRole('button', {name: /^Catalog ·/});
  if (await tab.isVisible()) await pointer(page, tab);
}

test('Verified wallet opens the original VRM Habitat canvas; guests stay in Common Ground', async ({page}) => {
  await page.goto('/worlds/editor');
  await expect(page.getByRole('button', {name: 'Enter Common Ground'})).toBeVisible({timeout: 60000});
  expect((await page.request.post('/api/habitat/profile', {headers: {Origin: new URL(page.url()).origin}, data: {name: 'Unsigned', character: 'female'}})).status()).toBe(401);
  await pointer(page, page.getByRole('button', {name: 'Enter Common Ground'}));
  await expect(page).toHaveURL(/\/courtyard$/, {timeout: 30000});
  expect((await page.request.get('/api/habitat/state')).status()).toBe(401);
  await openWorld(page);
  await build(page);
  await expect(page.locator('.hb-stage canvas')).toHaveCount(1);
  await expect(page.getByRole('heading', {name: 'Build inside your world.'})).toBeVisible();
  await page.screenshot({path: test.info().outputPath('integrated-builder.png')});
});

test('Real pointer catalog, transforms, duplicate/delete, Undo/Redo, Save & Play and reload persist', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const initial = await openWorld(page);
  await build(page);
  await pointer(page, page.getByRole('button', {name: 'Architecture', exact: true}));
  await page.getByRole('textbox', {name: 'Search world assets'}).fill('wall');
  await pointer(page, page.locator('.hb-advanced-assets button').first());
  await inspector(page);
  await expect(page.getByRole('combobox', {name: 'Placed objects'})).toContainText('wall', {ignoreCase: true});
  await page.getByRole('textbox', {name: 'Selected object name'}).fill('Browser Wall');
  for (const [axis, value] of [['x', '4'], ['y', '1'], ['z', '3'], ['rotation', '1'], ['scale', '2']]) {
    await page.getByRole('spinbutton', {name: `Object ${axis}`, exact: true}).fill(value);
    await page.getByRole('spinbutton', {name: `Object ${axis}`, exact: true}).blur();
  }
  await pointer(page, page.getByRole('button', {name: 'Duplicate', exact: true}));
  await expect(page.getByRole('combobox', {name: 'Placed objects'}).locator('option')).toHaveCount(3);
  await pointer(page, page.getByRole('button', {name: 'Undo', exact: true}));
  await expect(page.getByRole('combobox', {name: 'Placed objects'}).locator('option')).toHaveCount(2);
  await pointer(page, page.getByRole('button', {name: 'Redo', exact: true}));
  await expect(page.getByRole('combobox', {name: 'Placed objects'}).locator('option')).toHaveCount(3);
  const select = page.getByRole('combobox', {name: 'Placed objects'});
  await select.selectOption({index: 2});
  await pointer(page, page.getByRole('button', {name: 'Delete', exact: true}));
  await expect(select.locator('option')).toHaveCount(2);
  await catalog(page);
  await pointer(page, page.getByRole('button', {name: 'Furniture', exact: true}));
  await page.getByRole('textbox', {name: 'Search world assets'}).fill('');
  await pointer(page, page.locator('.hb-advanced-assets button').first());
  await pointer(page, page.getByRole('button', {name: 'Save & Play', exact: true}));
  await expect(page.getByRole('button', {name: 'Build my world +'})).toBeVisible({timeout: 20000});
  let saved = await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  expect(saved.world?.id).toBe(initial.world?.id);
  expect(saved.world?.objects).toHaveLength(2);
  expect(saved.world?.objects.find(o => o.name === 'Browser Wall')).toMatchObject({x: 4, y: 1, z: 3, rotation: 1, scale: 2});
  const profile = saved.profile;
  await page.reload();
  await expect(page.getByRole('button', {name: 'Build my world +'})).toBeVisible({timeout: 20000});
  saved = await (await page.request.get('/api/habitat/state')).json() as HabitatState;
  expect(saved.profile).toEqual(profile);
  expect(saved.world?.objects).toHaveLength(2);
  await build(page);
  await inspector(page);
  await expect(page.getByRole('combobox', {name: 'Placed objects'}).locator('option')).toHaveCount(3);
  expect(errors).toEqual([]);
  await page.screenshot({path: test.info().outputPath('persisted-world.png')});
});

test('Two verified wallets visit, exercise member permissions, leave and reconnect', async ({page, browser}) => {
  const owner = await openWorld(page);
  const sharedName = `Browser Shared ${owner.homeId!.slice(0, 8)}`;
  await pointer(page, page.getByRole('button', {name: 'Settings', exact: true}));
  await page.getByRole('textbox', {name: 'World name'}).fill(sharedName);
  await pointer(page, page.getByRole('button', {name: 'Save public', exact: true}));
  await pointer(page, page.getByRole('button', {name: 'Close', exact: true}));
  const mobile = test.info().project.name.includes('mobile');
  const otherContext = await browser.newContext({baseURL: new URL(page.url()).origin,
    viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 900}, isMobile: mobile, hasTouch: mobile});
  try {
    const visitorPage = await otherContext.newPage();
    const visitor = await openWorld(visitorPage);
    await pointer(visitorPage, visitorPage.getByRole('button', {name: 'Worlds', exact: true}));
    await pointer(visitorPage, visitorPage.getByRole('button', {name: new RegExp(sharedName)}));
    await expect(visitorPage.getByRole('heading', {name: sharedName, exact: true})).toBeVisible();
    await expect(visitorPage.getByRole('button', {name: 'Build my world +'})).toHaveCount(0);
    const worldId = owner.homeId!;
    const origin = new URL(page.url()).origin;
    const grant = await page.request.post(`/api/habitat/worlds/${worldId}/members`, {
      headers: {Origin: origin}, data: {wallet: visitor.wallet, role: 'editor'},
    });
    expect(grant.status()).toBe(200);
    await expect(visitorPage.getByRole('button', {name: 'Build my world +'})).toBeVisible({timeout: 15000});
    const denied = await visitorPage.request.post(`/api/habitat/worlds/${worldId}/settings`, {
      headers: {Origin: origin}, data: {name: 'Unauthorized', visibility: 'private'},
    });
    expect(denied.status()).toBe(403);
    await expect.poll(async () => {
      const state = await (await page.request.get(`/api/habitat/worlds/${worldId}`)).json() as HabitatState;
      return state.players.some(p => p.id === visitor.profile!.id);
    }).toBe(true);
    await visitorPage.goto('/courtyard');
    await expect.poll(async () => {
      const state = await (await page.request.get(`/api/habitat/worlds/${worldId}`)).json() as HabitatState;
      return state.players.some(p => p.id === visitor.profile!.id);
    }).toBe(false);
    await visitorPage.goto('/worlds/editor');
    await expect(visitorPage.getByRole('button', {name: 'Build my world +'})).toBeVisible();
    await pointer(visitorPage, visitorPage.getByRole('button', {name: 'Worlds', exact: true}));
    await pointer(visitorPage, visitorPage.getByRole('button', {name: new RegExp(sharedName)}));
    await expect.poll(async () => {
      const state = await (await page.request.get(`/api/habitat/worlds/${worldId}`)).json() as HabitatState;
      return state.players.some(p => p.id === visitor.profile!.id);
    }).toBe(true);
    const revoked = await page.request.delete(`/api/habitat/worlds/${worldId}/members/${visitor.profile!.id}`, {headers: {Origin: origin}, data: {}});
    expect(revoked.status()).toBe(200);
    await expect(visitorPage.getByRole('button', {name: 'Build my world +'})).toHaveCount(0, {timeout: 15000});
  } finally {await otherContext.close();}
});
