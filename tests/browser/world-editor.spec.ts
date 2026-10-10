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
async function openWorld(page: Page, route = '/worlds/editor') {
  await installWallet(page);
  await page.goto(route);
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

test('Homepage editor enables Redo after Undo and persists the restored draft', async ({page}) => {
  const initial = await openWorld(page, '/');
  await pointer(page, page.getByRole('button', {name: 'Build my world +'}));
  const placed = page.getByRole('combobox', {name: 'Placed objects'});
  const undo = page.getByRole('button', {name: 'Undo', exact: true});
  const redo = page.getByRole('button', {name: 'Redo', exact: true});
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await pointer(page, page.getByRole('button', {name: 'Building block +', exact: true}));
  await expect(placed.locator('option')).toHaveCount(2);
  await pointer(page, undo);
  await expect(placed.locator('option')).toHaveCount(1);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();
  await pointer(page, redo);
  await expect(placed.locator('option')).toHaveCount(2);
  await expect(redo).toBeDisabled();
  await pointer(page, page.getByRole('button', {name: 'Save & play', exact: true}));
  await expect(page.getByRole('button', {name: 'Build my world +'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', {name: 'Build my world +'})).toBeVisible();
  const response = await page.request.get('/api/habitat/state');
  expect(response.status()).toBe(200);
  const saved = await response.json() as HabitatState;
  expect(saved.world?.id).toBe(initial.world?.id);
  expect(saved.world?.objects).toHaveLength(1);
  expect(saved.world?.objects[0]).toMatchObject({assetId: 'ctrl-block', behavior: 'solid'});
});

test('Two verified wallets visit, exercise member permissions, leave and reconnect', async ({page, browser}) => {
  // CI 38059466918 took 2.8m for the original desktop two-canvas flow. This
  // journey now also exercises settings CAS and persisted member management
  // via real UI. Budget the complete journey; keep individual bounded waits.
  test.setTimeout(240000);
  const owner = await openWorld(page);
  const sharedName = `Browser Shared ${owner.homeId!.slice(0, 8)}`;
  await pointer(page, page.getByRole('button', {name: 'Settings', exact: true}));
  await page.getByRole('textbox', {name: 'World name'}).fill(sharedName);
  // A genuine second signed request changes settings after this form opened.
  // The stale form must send its captured revision, not the latest heartbeat's.
  const anotherName = `Other tab ${owner.homeId!.slice(0, 8)}`;
  const otherSave = await page.request.post(`/api/habitat/worlds/${owner.homeId}/settings`, {
    headers: {Origin: new URL(page.url()).origin},
    data: {name: anotherName, visibility: 'public', revision: owner.world!.revision},
  });
  expect(otherSave.status()).toBe(200);
  const conflictResponse = page.waitForResponse(response => response.url().endsWith('/api/habitat/settings') && response.request().method() === 'POST');
  await pointer(page, page.getByRole('button', {name: 'Save public', exact: true}));
  expect((await conflictResponse).status()).toBe(409);
  await expect(page.locator('.hb-alert')).toBeVisible();
  expect((await (await page.request.get(`/api/habitat/worlds/${owner.homeId}`)).json()).world.name).toBe(anotherName);
  await pointer(page, page.getByRole('button', {name: 'Dismiss', exact: true}));
  await pointer(page, page.getByRole('button', {name: 'Close', exact: true}));
  await expect(page.getByRole('heading', {name: anotherName, exact: true})).toBeVisible({timeout: 20000});
  await pointer(page, page.getByRole('button', {name: 'Settings', exact: true}));
  await page.getByRole('textbox', {name: 'World name'}).fill(sharedName);
  const retriedSave = page.waitForResponse(response => response.url().endsWith('/api/habitat/settings') && response.request().method() === 'POST');
  await pointer(page, page.getByRole('button', {name: 'Save public', exact: true}));
  expect((await retriedSave).status()).toBe(200);
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
    await pointer(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await page.getByRole('textbox', {name: 'Member wallet', exact: true}).fill(visitor.wallet!);
    await page.getByRole('combobox', {name: 'Member role', exact: true}).selectOption('editor');
    await pointer(page, page.getByRole('button', {name: 'Save member access', exact: true}));
    await expect(page.getByText('Saved editor access.', {exact: true})).toBeVisible({timeout: 20000});
    await pointer(page, page.getByRole('button', {name: 'Close', exact: true}));
    // Reopening fetches persisted members, not the component's optimistic state.
    await pointer(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await expect(page.getByRole('button', {name: `Revoke access for ${visitor.wallet}`})).toBeVisible({timeout: 20000});
    await page.screenshot({path: test.info().outputPath('persisted-member-access.png')});
    await pointer(page, page.getByRole('button', {name: 'Close', exact: true}));
    await expect(visitorPage.getByRole('button', {name: 'Build my world +'})).toBeVisible({timeout: 15000});
    await pointer(visitorPage, visitorPage.getByRole('button', {name: 'Settings', exact: true}));
    await expect(visitorPage.getByRole('textbox', {name: 'World name', exact: true})).toHaveCount(0);
    await expect(visitorPage.getByRole('textbox', {name: 'Member wallet', exact: true})).toHaveCount(0);
    await pointer(visitorPage, visitorPage.getByRole('button', {name: 'Close', exact: true}));
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
    // CI 38059466918: the restored state returned HTTP 200 and the final DOM
    // contained this button, but two SwiftShader canvases exceeded the default
    // 5s hydration wait. Use the same bounded readiness budget as reload above.
    await expect(visitorPage.getByRole('button', {name: 'Build my world +'})).toBeVisible({timeout: 20000});
    const restoredResponse = await visitorPage.request.get('/api/habitat/state');
    expect(restoredResponse.status()).toBe(200);
    const restored = await restoredResponse.json() as HabitatState;
    expect(restored.wallet).toBe(visitor.wallet);
    expect(restored.world?.id).toBe(visitor.homeId);
    await pointer(visitorPage, visitorPage.getByRole('button', {name: 'Worlds', exact: true}));
    await pointer(visitorPage, visitorPage.getByRole('button', {name: new RegExp(sharedName)}));
    await expect.poll(async () => {
      const state = await (await page.request.get(`/api/habitat/worlds/${worldId}`)).json() as HabitatState;
      return state.players.some(p => p.id === visitor.profile!.id);
    }).toBe(true);
    await build(visitorPage);
    await pointer(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await pointer(page, page.getByRole('button', {name: `Revoke access for ${visitor.wallet}`}));
    await expect(page.getByText('Member access revoked.', {exact: true})).toBeVisible({timeout: 20000});
    const memberResponse = await page.request.get(`/api/habitat/worlds/${worldId}/members`);
    expect(memberResponse.status()).toBe(200);
    expect((await memberResponse.json()).members).toEqual([]);
    await pointer(page, page.getByRole('button', {name: 'Close', exact: true}));
    await expect(visitorPage.getByRole('button', {name: 'Build my world +'})).toHaveCount(0, {timeout: 15000});
    await expect(visitorPage.getByRole('toolbar', {name: '3D world tools'})).toHaveCount(0, {timeout: 15000});
  } finally {await otherContext.close();}
});

test('Revoking a private-world editor clears the active tools and inaccessible scene', async ({page, browser}) => {
  test.setTimeout(180000);
  const owner = await openWorld(page);
  const privateName = `Private ACL ${owner.homeId!.slice(0, 8)}`;
  await pointer(page, page.getByRole('button', {name: 'Settings', exact: true}));
  await page.getByRole('textbox', {name: 'World name', exact: true}).fill(privateName);
  await pointer(page, page.getByRole('button', {name: 'Save private', exact: true}));
  await pointer(page, page.getByRole('button', {name: 'Close', exact: true}));
  const mobile = test.info().project.name.includes('mobile');
  const otherContext = await browser.newContext({baseURL: new URL(page.url()).origin,
    viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 900}, isMobile: mobile, hasTouch: mobile});
  try {
    const visitorPage = await otherContext.newPage();
    const visitor = await openWorld(visitorPage);
    await pointer(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await page.getByRole('textbox', {name: 'Member wallet', exact: true}).fill(visitor.wallet!);
    await page.getByRole('combobox', {name: 'Member role', exact: true}).selectOption('editor');
    await pointer(page, page.getByRole('button', {name: 'Save member access', exact: true}));
    await expect(page.getByText('Saved editor access.', {exact: true})).toBeVisible({timeout: 20000});
    await pointer(visitorPage, visitorPage.getByRole('button', {name: 'Worlds', exact: true}));
    await pointer(visitorPage, visitorPage.getByRole('button', {name: new RegExp(privateName)}));
    await expect(visitorPage.getByRole('heading', {name: privateName, exact: true})).toBeVisible({timeout: 20000});
    await build(visitorPage);
    await pointer(page, page.getByRole('button', {name: `Revoke access for ${visitor.wallet}`}));
    await expect(page.getByText('Member access revoked.', {exact: true})).toBeVisible({timeout: 20000});
    await expect(visitorPage.getByRole('toolbar', {name: '3D world tools'})).toHaveCount(0, {timeout: 20000});
    await expect(visitorPage.getByRole('heading', {name: privateName, exact: true})).toHaveCount(0);
    await expect(visitorPage.getByRole('button', {name: 'Go home', exact: true})).toBeVisible({timeout: 20000});
    expect((await visitorPage.request.get(`/api/habitat/worlds/${owner.homeId}`)).status()).toBe(404);
    await pointer(visitorPage, visitorPage.getByRole('button', {name: 'Go home', exact: true}));
    await expect(visitorPage.getByRole('button', {name: 'Build my world +'})).toBeVisible({timeout: 20000});
    const restored = await (await visitorPage.request.get('/api/habitat/state')).json() as HabitatState;
    expect(restored.world?.id).toBe(visitor.homeId);
    await visitorPage.screenshot({path: test.info().outputPath('private-revocation-home.png')});
    const logout = await visitorPage.request.post('/api/auth/logout', {
      headers: {Origin: new URL(visitorPage.url()).origin}, data: {},
    });
    expect(logout.status()).toBe(200);
    await expect(visitorPage.getByRole('button', {name: 'Enter Common Ground', exact: true})).toBeVisible({timeout: 20000});
    await expect(visitorPage.getByRole('button', {name: 'Build my world +'})).toHaveCount(0);
    expect((await visitorPage.request.get('/api/habitat/state')).status()).toBe(401);
  } finally {await otherContext.close();}
});
