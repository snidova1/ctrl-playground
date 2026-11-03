import type {Page} from '@playwright/test';
import {generatePrivateKey, privateKeyToAccount} from 'viem/accounts';
import type {Hex} from 'viem';

// Only the isolated browser test provides this wallet. The real nonce and
// signature endpoints validate every session; application routes are not mocked.
export async function installSignedWallet(page: Page, chainId = 46630) {
  const account = privateKeyToAccount(generatePrivateKey());
  await page.exposeBinding('__ctrlWalletSign', async (_source, raw: Hex) => account.signMessage({message: {raw}}));
  await page.addInitScript(({wallet,chainId}) => {
    const provider = {
      isMetaMask: true,
      on() {}, removeListener() {},
      async request({method, params}: {method: string; params?: string[]}) {
        if (method === 'eth_chainId') return `0x${chainId.toString(16)}`;
        if (method === 'net_version') return String(chainId);
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [wallet];
        if (method === 'wallet_requestPermissions') return [{parentCapability: 'eth_accounts'}];
        if (method === 'wallet_getPermissions') return [{parentCapability: 'eth_accounts'}];
        if (method === 'personal_sign') return (window as unknown as {__ctrlWalletSign: (raw: string) => Promise<string>}).__ctrlWalletSign(params![0]);
        throw new Error(`Unsupported isolated wallet method: ${method}`);
      },
    };
    Object.defineProperty(window, 'ethereum', {value: provider, configurable: true});
  }, {wallet: account.address,chainId});
  return account;
}
