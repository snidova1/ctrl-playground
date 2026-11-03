import {test, expect, type Page, type Locator} from '@playwright/test';
import type {HabitatState} from '@/domain/habitat';
import {installSignedWallet} from './helpers/wallet';

async function press(page: Page, locator: Locator) {
  if (await page.evaluate(() => matchMedia('(pointer:coarse)').matches)) await locator.tap();
  else await locator.click();
}

async function signIn(page: Page) {
  const nonce = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/nonce' && response.request().method() === 'POST');
  const verified = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/verify' && response.request().method() === 'POST');
  await press(page, page.getByRole('button', {name: 'Sign in to Habitat', exact: true}));
  expect((await nonce).status(), 'Sign-in must obtain a real server nonce').toBe(200);
  expect((await verified).status(), 'The backend must verify the isolated wallet signature').toBe(200);
}

for (const route of ['/', '/habitat', '/worlds/editor']) {
  test(`${route} keeps wallet entry reachable without a browser wallet`, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    expect(await page.evaluate(() => 'ethereum' in window)).toBe(false);
    expect((await page.request.get('/api/network')).status()).toBe(200);
    expect((await page.request.get('/api/habitat/state')).status()).toBe(401);

    const entry = page.locator('.hb-entry');
    const headerConnect = page.locator('.hb-top').getByRole('button', {name: 'Connect wallet', exact: true});
    const connect = entry.locator('.wallet-options').getByRole('button', {name: 'Connect wallet', exact: true});
    await expect(entry).toBeVisible({timeout: 30000});
    await expect(headerConnect).toBeVisible();
    await expect(connect).toBeVisible();
    await expect(page.locator('.hb-brand')).toContainText('HABITAT');
    for (const name of ['Worlds', 'Character', 'Keys']) {
      await expect(page.locator('.hb-top').getByRole('button', {name, exact: true})).toHaveCount(0);
    }

    await press(page, connect);
    await expect(entry.getByRole('status')).toContainText('No browser wallet found');
    await expect(entry.getByRole('link', {name: 'Open in MetaMask'})).toHaveAttribute('href', /^https:\/\/metamask\.app\.link\/dapp\//);
    await page.keyboard.press('Escape');
    await expect(entry).toBeVisible();
    await press(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await expect(page.getByRole('combobox', {name: 'Graphics', exact: true})).toBeVisible();
    await expect(headerConnect).toBeVisible();
    await press(page, headerConnect);
    await expect(connect).toBeVisible();

    await press(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await press(page, page.getByRole('button', {name: 'Close', exact: true}));
    await expect(connect).toBeVisible();
    await press(page, page.getByRole('button', {name: 'Settings', exact: true}));
    await page.keyboard.press('Escape');
    await expect(connect).toBeVisible();

    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.request.get('/api/habitat/state')).status()).toBe(401);
    expect(errors, 'Wallet entry must not produce unhandled browser errors').toEqual([]);
    await page.screenshot({path: test.info().outputPath('wallet-entry.png'), fullPage: true});
  });
}

test('a signed wallet completes setup and signs back into the same Habitat without repeating character creation', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const wallet = await installSignedWallet(page, 1);
  await page.goto('/habitat');
  await press(page, page.locator('.wallet-options').getByRole('button', {name: 'Connect wallet', exact: true}));
  await signIn(page);

  const creator = page.getByRole('region', {name: '3D character creator'});
  await expect(creator).toBeVisible({timeout: 30000});
  await page.keyboard.press('Escape');
  await expect(creator).toBeVisible();
  await press(page, page.getByRole('button', {name: 'Settings', exact: true}));
  await press(page, page.getByRole('button', {name: 'Close', exact: true}));
  await expect(creator).toBeVisible();
  await page.getByRole('textbox', {name: 'Name', exact: true}).fill('Returning Habitat');
  await press(page, page.getByRole('button', {name: 'Enter my world draft', exact: true}));
  await expect(page.getByRole('button', {name: 'Build my world +', exact: true})).toBeVisible({timeout: 30000});

  const initialResponse = await page.request.get('/api/habitat/state');
  expect(initialResponse.status()).toBe(200);
  const initial = await initialResponse.json() as HabitatState;
  expect(initial.wallet?.toLowerCase()).toBe(wallet.address.toLowerCase());
  expect(initial.profile?.name).toBe('Returning Habitat');
  expect(initial.world?.id).toBe(initial.homeId);
  expect(initial.world?.objects.length).toBeGreaterThan(20);
  await expect(page.locator('.hb-top').getByRole('button', {name: 'Worlds', exact: true})).toBeVisible();
  await expect(page.locator('.hb-top').getByRole('button', {name: 'Character', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Keys', exact: true})).toHaveCount(0);

  const logout = await page.request.post('/api/auth/logout', {
    headers: {Origin: new URL(page.url()).origin}, data: {},
  });
  expect(logout.status()).toBe(200);
  expect((await page.request.get('/api/habitat/state')).status()).toBe(401);
  await expect(page.locator('.hb-entry')).toBeVisible({timeout: 30000});
  const rejoined = page.waitForResponse(response => new URL(response.url()).pathname === '/api/habitat/join' && response.request().method() === 'POST');
  await signIn(page);
  expect((await rejoined).status()).toBe(200);
  const heartbeat = await page.waitForResponse(response => new URL(response.url()).pathname === '/api/habitat/presence' && response.status() === 200);
  expect((await heartbeat.json()).presenceSession.worldId).toBe(initial.homeId);

  await expect(page.getByRole('button', {name: 'Build my world +', exact: true})).toBeVisible({timeout: 30000});
  await expect(creator).toHaveCount(0);
  await expect(page.locator('.hb-entry')).toHaveCount(0);
  const restoredResponse = await page.request.get('/api/habitat/state');
  expect(restoredResponse.status()).toBe(200);
  const restored = await restoredResponse.json() as HabitatState;
  expect(restored.homeId).toBe(initial.homeId);
  expect(restored.world?.id).toBe(initial.world?.id);
  expect(restored.world?.objects).toEqual(initial.world?.objects);
  expect(restored.profile).toEqual(initial.profile);
  expect(errors, 'Wallet sign-in and restoration must not produce unhandled browser errors').toEqual([]);
  await page.screenshot({path: test.info().outputPath('returning-wallet-habitat.png'), fullPage: true});
});
