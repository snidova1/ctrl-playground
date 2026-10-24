import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {PublicNetwork} from '@/config/network';
import {reownProjectId, walletConfig} from '@/features/wallet/reown-config';
import {chooseWalletConnector, verifyWalletIdentity} from '@/features/wallet/wallet-actions';
import WalletConnection from '@/features/wallet/wallet-connect';
import {protectReownModal} from '@/features/wallet/reown-modal';

const state = vi.hoisted(() => ({
  createConfig: vi.fn((options: unknown) => options),
  injected: vi.fn(() => ({id: 'injected'})),
  walletConnect: vi.fn((options: unknown) => ({id: 'walletConnect', options})),
  mutate: vi.fn(), sign: vi.fn(), connect: vi.fn(),
  address: undefined as `0x${string}` | undefined,
  connectors: [] as {id: string; uid: string; name: string; getProvider: () => Promise<unknown>}[],
  network: {} as PublicNetwork,
}));
vi.mock('wagmi', () => ({
  createConfig: state.createConfig, http: (url: string) => ({url}),
  WagmiProvider: ({children}: {children: unknown}) => children,
  useConnection: () => ({address: state.address, chainId: 4663}),
  useConnectors: () => state.connectors,
  useConnect: () => ({isPending: false, mutateAsync: state.connect}),
  useSignMessage: () => ({mutateAsync: state.sign}),
  useDisconnect: () => ({mutate: vi.fn()}), useSwitchChain: () => ({mutate: vi.fn()}),
  useWriteContract: () => ({mutateAsync: vi.fn()}), usePublicClient: () => undefined,
}));
vi.mock('wagmi/connectors/injected', () => ({injected: state.injected}));
vi.mock('wagmi/connectors/walletConnect', () => ({walletConnect: state.walletConnect}));
vi.mock('@/lib/use-resource', () => ({useResource: () => ({data: state.network})}));
vi.mock('@/lib/api-client', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/api-client')>(), mutate: state.mutate,
}));

const projectId = 'e1703181bc42b7be7b2054f2348099ae';
const address = '0x0000000000000000000000000000000000000001' as const;
const network: PublicNetwork = {chainId: 4663, name: 'Robinhood', testnet: false,
  token: null, explorer: 'https://explorer.robinhood.com', faucetEnabled: false};
const connector = (id: string, provider: unknown = {}) => ({
  id, uid: id, name: id === 'io.rabby' ? 'Rabby' : id,
  getProvider: vi.fn(async () => provider),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', '');
  state.network = {...network}; state.address = undefined; state.connectors = [];
  state.mutate.mockReset(); state.sign.mockReset();
});
afterEach(() => {vi.unstubAllEnvs(); vi.unstubAllGlobals();});

describe('Reown public configuration', () => {
  it('uses the supplied public project ID from the build env when runtime is empty', () => {
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', projectId);
    expect(reownProjectId(network)).toBe(projectId);
    expect(reownProjectId({...network, walletConnectProjectId: null})).toBe(projectId);
  });
  it('lets a valid runtime binding override the compiled public setting', () => {
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', projectId);
    expect(reownProjectId({...network, walletConnectProjectId: 'a'.repeat(32)})).toBe('a'.repeat(32));
  });
  it.each(['invalid', '', ' ', 'g'.repeat(32)])('rejects bad runtime value %j and falls back to the build setting', value => {
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', projectId);
    expect(reownProjectId({...network, walletConnectProjectId: value})).toBe(projectId);
  });
  it('normalizes whitespace but never accepts an invalid public build setting', () => {
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', ` ${projectId}\n`);
    expect(reownProjectId(network)).toBe(projectId);
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', 'invalid');
    expect(reownProjectId(network)).toBe('');
  });
  it('enables the installed AppKit bridge, mobile fullscreen, and unfiltered wallet explorer', () => {
    vi.stubGlobal('window', {location: {origin: 'https://wallet-staging.example'}});
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', projectId);
    walletConfig(network);
    expect(state.walletConnect).toHaveBeenCalledWith({
      projectId, showQrModal: true,
      qrModalOptions: {enableExplorer: true, enableMobileFullScreen: true,
        themeVariables: {'--wcm-z-index': '10000'}},
      metadata: {name: 'CTRL', description: expect.stringContaining('Public World'),
        url: 'https://wallet-staging.example', icons: ['https://wallet-staging.example/favicon.svg']},
    });
    const options = state.createConfig.mock.calls.at(-1)![0] as {
      chains: {id: number}[]; connectors: {id: string}[];
      multiInjectedProviderDiscovery: boolean; ssr: boolean; transports: Record<number, {url: string}>;
    };
    expect(options.chains.map(chain => chain.id)).toEqual([4663]);
    expect(options.connectors.map(item => item.id)).toEqual(['injected', 'walletConnect']);
    expect(options.multiInjectedProviderDiscovery).toBe(true);
    expect(options.ssr).toBe(true);
    expect(options.transports[46630].url).toBe('https://robinhood-sepolia-rpc.publicnode.com');
    expect(options.transports[4663].url).toMatch(/^https:/);
  });
  it('keeps missing-ID injected fallback, separates testnet, and caches by origin/ID/chain', () => {
    vi.stubGlobal('window', {location: {origin: 'https://injected.example'}});
    const testnet = {...network, chainId: 46630};
    const first = walletConfig(testnet);
    expect(walletConfig(testnet)).toBe(first);
    expect(state.createConfig).toHaveBeenCalledTimes(1);
    expect(state.walletConnect).not.toHaveBeenCalled();
    expect(state.createConfig).toHaveBeenLastCalledWith(expect.objectContaining({
      chains: [expect.objectContaining({id: 46630})], connectors: [{id: 'injected'}],
    }));
    vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', projectId);
    expect(walletConfig(testnet)).not.toBe(first);
    expect(walletConfig(network)).not.toBe(first);
    vi.stubGlobal('window', {location: {origin: 'https://other.example'}});
    walletConfig(network);
    expect(state.createConfig).toHaveBeenCalledTimes(4);
  });
  it('rejects unsupported chains instead of silently connecting another chain', () => {
    expect(() => walletConfig({...network, chainId: 1})).toThrow('UNSUPPORTED_CHAIN');
  });
});

describe('AppKit-first connection and explicit browser fallback', () => {
  it('selects AppKit even when an injected browser wallet is available', async () => {
    const injected = connector('injected'), pairing = connector('walletConnect');
    expect(await chooseWalletConnector([injected, pairing])).toBe(pairing);
    expect(injected.getProvider).not.toHaveBeenCalled();
    expect(pairing.getProvider).not.toHaveBeenCalled();
    expect(state.mutate).not.toHaveBeenCalled();
    expect(state.sign).not.toHaveBeenCalled();
  });
  it('explicit browser choice bypasses AppKit and supports EIP-6963 providers', async () => {
    const missing = connector('injected', undefined), announced = connector('io.rabby');
    // Explicitly return undefined (the helper factory defaults to a provider).
    missing.getProvider.mockResolvedValue(undefined);
    expect(await chooseWalletConnector([connector('walletConnect'), missing, announced], true)).toBe(announced);
  });
  it('uses legacy injected wallets without requiring a public pairing ID', async () => {
    const injected = connector('injected');
    expect(await chooseWalletConnector([injected])).toBe(injected);
  });
  it('ignores a broken extension and continues to another installed wallet', async () => {
    const broken = connector('broken'), working = connector('io.rabby');
    broken.getProvider.mockRejectedValue(new Error('extension unavailable'));
    expect(await chooseWalletConnector([broken, working], true)).toBe(working);
  });
  it('reports no available provider without falling through to AppKit in browser-only mode', async () => {
    expect(await chooseWalletConnector([], true)).toBeUndefined();
    expect(await chooseWalletConnector([connector('walletConnect')], true)).toBeUndefined();
  });
});

describe('signed server authentication remains the only verification boundary', () => {
  it('requests a nonce, signs its exact message, verifies server-side, then calls onVerified', async () => {
    const order: string[] = [];
    state.mutate.mockImplementation(async path => {
      order.push(path);
      return path === 'auth/nonce' ? {nonce: 'server-nonce', message: 'Exact server challenge'} : {};
    });
    const sign = vi.fn(async () => {order.push('sign'); return '0xabcd' as const;});
    const verified = vi.fn(() => {order.push('verified');});
    await verifyWalletIdentity(address, sign, verified);
    expect(order).toEqual(['auth/nonce', 'sign', 'auth/verify', 'verified']);
    expect(sign).toHaveBeenCalledWith('Exact server challenge');
    expect(state.mutate).toHaveBeenNthCalledWith(1, 'auth/nonce', {address});
    expect(state.mutate).toHaveBeenNthCalledWith(2, 'auth/verify', {address, nonce: 'server-nonce', signature: '0xabcd'});
    expect(verified).toHaveBeenCalledTimes(1);
  });
  it('never verifies a rejected signature', async () => {
    state.mutate.mockResolvedValue({nonce: 'n', message: 'm'});
    const sign = vi.fn().mockRejectedValue(new Error('User rejected'));
    const verified = vi.fn();
    await expect(verifyWalletIdentity(address, sign, verified)).rejects.toThrow('User rejected');
    expect(state.mutate).toHaveBeenCalledTimes(1);
    expect(verified).not.toHaveBeenCalled();
  });
  it('never verifies a failed server nonce request', async () => {
    state.mutate.mockRejectedValue(new Error('Nonce unavailable'));
    const sign = vi.fn(), verified = vi.fn();
    await expect(verifyWalletIdentity(address, sign, verified)).rejects.toThrow('Nonce unavailable');
    expect(sign).not.toHaveBeenCalled(); expect(verified).not.toHaveBeenCalled();
  });
  it('waits for server verification and never calls the callback on a failed verify', async () => {
    let reject!: (reason: Error) => void;
    state.mutate.mockResolvedValueOnce({nonce: 'n', message: 'm'})
      .mockImplementationOnce(() => new Promise((_, fail) => {reject = fail;}));
    const verified = vi.fn();
    const result = verifyWalletIdentity(address, async () => '0xabcd', verified);
    await vi.waitFor(() => expect(state.mutate).toHaveBeenCalledTimes(2));
    expect(verified).not.toHaveBeenCalled();
    reject(new Error('Invalid signature'));
    await expect(result).rejects.toThrow('Invalid signature');
    expect(verified).not.toHaveBeenCalled();
  });
});

describe('nested account/AppKit modal interaction', () => {
  it('keeps account wallet state mounted while AppKit owns outside interactions/Escape', () => {
    const querySelector = vi.fn(() => ({}));
    vi.stubGlobal('document', {querySelector});
    const preventDefault = vi.fn();
    protectReownModal({preventDefault});
    expect(querySelector).toHaveBeenCalledWith('w3m-modal.open');
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
  it('allows normal account dialog dismissal once AppKit is closed', () => {
    vi.stubGlobal('document', {querySelector: () => null});
    const preventDefault = vi.fn();
    protectReownModal({preventDefault});
    expect(preventDefault).not.toHaveBeenCalled();
  });
  it('is safe outside the browser', () => {
    vi.stubGlobal('document', undefined);
    const preventDefault = vi.fn();
    expect(() => protectReownModal({preventDefault})).not.toThrow();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('wallet UI purpose and connection boundary', () => {
  it('offers mobile/QR AppKit and separate announced/legacy browser choices without authenticating', () => {
    state.connectors = [connector('walletConnect'), connector('injected'), connector('io.rabby')];
    const verified = vi.fn();
    const html = renderToStaticMarkup(createElement(WalletConnection, {onVerified: verified}));
    expect(html).toContain('Connect wallet'); expect(html).toContain('scan the QR code');
    expect(html).toContain('Use browser wallet'); expect(html).toContain('Use Rabby');
    expect(html).not.toContain('Claim test tokens');
    expect(verified).not.toHaveBeenCalled(); expect(state.sign).not.toHaveBeenCalled();
    expect(state.mutate).not.toHaveBeenCalled(); expect(state.connect).not.toHaveBeenCalled();
  });
  it.each(['habitat', 'public-world'] as const)('requires explicit signature after connection for %s', purpose => {
    state.address = address;
    const verified = vi.fn();
    const html = renderToStaticMarkup(createElement(WalletConnection, {onVerified: verified, purpose}));
    expect(html).toContain(purpose === 'habitat' ? 'Sign in to Habitat' : 'Sign in to CTRL');
    expect(html).toContain('No gas or payment.');
    if (purpose === 'public-world') expect(html).not.toContain('Sign in to Habitat');
    expect(verified).not.toHaveBeenCalled(); expect(state.mutate).not.toHaveBeenCalled();
  });
});
