import {afterEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ganache from 'ganache';
import {createPublicClient, createWalletClient, defineChain, http, type Abi, type Hex} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {one} from '@/db';
import {keysConfig} from '@/server/keys/config';
import {worldKeyId} from '@/server/keys/service';
import {actor, api, cookieFrom, error, signedWallet} from './security/habitat-fixtures';

afterEach(() => vi.unstubAllEnvs());

describe('Habitat UUID to verified-wallet World Keys boundary', () => {
  it('requires a signed wallet and conceals private UUIDs before returning key metadata', async () => {
    vi.stubEnv('CTRL_KEYS_ENABLED', 'false');
    const owner = await actor('Key Owner'), stranger = await actor('Key Stranger');
    const path = `habitat/worlds/${owner.worldId}/keys`;
    await error(await api(path), 401, 'WALLET_SESSION_REQUIRED');
    const guest = await api('plaza/join', {name: 'Key Guest'});
    await error(await api(path, undefined, cookieFrom(guest)), 401);
    await error(await api(path, undefined, stranger.cookie), 404, 'WORLD_NOT_FOUND');
    const result = await api(path, undefined, owner.cookie);
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({status: 'not-deployed', worldId: owner.worldId,
      keyWorldId: worldKeyId(owner.wallet), ownerWallet: expect.stringMatching(/^0x/), isOwner: false});
    expect(result.headers.get('cache-control')).toBe('no-store');
  });

  it('public visitors resolve the owner ID, not their own; editor membership cannot prepare or verify owner claims', async () => {
    vi.stubEnv('CTRL_KEYS_ENABLED', 'false');
    const owner = await actor('Public Key Owner'), visitor = await actor('Key Editor');
    const base = `habitat/worlds/${owner.worldId}`;
    expect((await api(base + '/settings', {name: 'Public Keys', visibility: 'public', revision: 0}, owner.cookie)).status).toBe(200);
    expect((await api(base + '/members', {wallet: visitor.wallet, role: 'editor'}, owner.cookie)).status).toBe(200);
    const result = await api(base + '/keys', undefined, visitor.cookie);
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({keyWorldId: worldKeyId(owner.wallet), isOwner: false});
    for (const [suffix, payload] of [['prepare', {}], ['verify', {txHash: '0x' + '1'.repeat(64)}]] as const) {
      await error(await api(`${base}/keys/${suffix}`, payload, visitor.cookie), 403, 'OWNER_REQUIRED');
    }
    expect(await one('SELECT role FROM habitat_members WHERE world_id=? AND profile_id=?', owner.worldId, visitor.id)).toEqual({role: 'editor'});
  });

  it('rejects caller-supplied owner/RPC/config fields, wrong origin, oversized bodies and unsupported methods', async () => {
    vi.stubEnv('CTRL_KEYS_ENABLED', 'false');
    const owner = await actor('Strict Key Owner');
    const base = `habitat/worlds/${owner.worldId}/keys`;
    for (const payload of [{ownerWallet: owner.wallet}, {worldId: owner.worldId}, {rpcUrl: 'http://attacker.invalid'}, {config: {}}]) {
      await error(await api(base + '/prepare', payload, owner.cookie), 422);
    }
    await error(await api(base + '/verify', {txHash: '0x' + '1'.repeat(64), wallet: owner.wallet}, owner.cookie), 422);
    await error(await api(base + '/prepare', {}, owner.cookie, 'POST', {Origin: 'http://attacker.invalid'}), 403, 'ORIGIN_NOT_ALLOWED');
    await error(await api(base + '/prepare', {junk: 'x'.repeat(81000)}, owner.cookie), 413);
    await error(await api(base, {}, owner.cookie, 'POST'), 404, 'ROUTE_NOT_FOUND');
    await error(await api(base + '/prepare', undefined, owner.cookie), 404);
    await error(await api(base + '/prepare', {}, owner.cookie), 503, 'KEYS_NOT_DEPLOYED');
    await error(await api(base + '/verify', {txHash: '0x' + '1'.repeat(64)}, owner.cookie), 503, 'KEYS_NOT_DEPLOYED');
    expect(await one('SELECT revision FROM habitat_worlds WHERE id=?', owner.worldId)).toEqual({revision: 0});
  });

  it('fails closed on incomplete server-only deployment settings without returning RPC details', async () => {
    vi.stubEnv('CTRL_KEYS_ENABLED', 'false');
    expect(keysConfig()).toBeNull();
    vi.stubEnv('CTRL_KEYS_ENABLED', 'true');
    vi.stubEnv('CTRL_KEYS_RPC_URL', 'file:///sensitive');
    const owner = await actor('Config Key Owner');
    const response = await api(`habitat/worlds/${owner.worldId}/keys`, undefined, owner.cookie);
    await error(response, 503, 'KEYS_INVALID_CONFIG');
  });

  it('exercises the real signed-wallet API, SQLite owner binding, localhost EVM claim and confirmed receipt', async () => {
    const server = ganache.server({chain: {chainId: 46630}, logging: {quiet: true}});
    try {
      await server.listen(0, '127.0.0.1');
      const location = server.address();
      if (!location || typeof location === 'string') throw new Error('Local RPC unavailable');
      const rpcUrl = `http://127.0.0.1:${location.port}`;
      const chain = defineChain({id: 46630, name: 'Isolated keys API fixture', nativeCurrency: {name: 'ETH', symbol: 'ETH', decimals: 18}, rpcUrls: {default: {http: [rpcUrl]}}});
      const [owner, treasury] = Object.values(server.provider.getInitialAccounts()).slice(0, 2)
        .map(value => privateKeyToAccount(value.secretKey as Hex));
      const writer = createWalletClient({account: owner, chain, transport: http(rpcUrl)});
      const reader = createPublicClient({chain, transport: http(rpcUrl), cacheTime: 0});
      const solc = createRequire(import.meta.url)('solc');
      const output = JSON.parse(solc.compile(JSON.stringify({language: 'Solidity', sources: {
        'keys.sol': {content: readFileSync('contracts/keys/CTRLWorldKeys.sol', 'utf8')},
        'token.sol': {content: readFileSync('tests/keys/CTRLTokenFixture.sol', 'utf8')},
      }, settings: {optimizer: {enabled: true, runs: 200}, evmVersion: 'paris', outputSelection: {'*': {'*': ['abi', 'evm.bytecode.object']}}}})));
      expect((output.errors ?? []).filter((entry: {severity: string}) => entry.severity === 'error')).toEqual([]);
      const token = output.contracts['token.sol'].CTRLTokenFixture as {abi: Abi; evm: {bytecode: {object: string}}};
      const keys = output.contracts['keys.sol'].CTRLWorldKeys as typeof token;
      async function mined(hash: Hex) {
        return reader.waitForTransactionReceipt({hash, pollingInterval: 25});
      }
      const tokenAddress = (await mined(await writer.deployContract({abi: token.abi, bytecode: `0x${token.evm.bytecode.object}`}))).contractAddress!;
      const contractAddress = (await mined(await writer.deployContract({abi: keys.abi, bytecode: `0x${keys.evm.bytecode.object}`, args: [tokenAddress, treasury.address, 101n]}))).contractAddress!;
      for (const [key, value] of Object.entries({CTRL_KEYS_ENABLED: 'true', CTRL_KEYS_RPC_URL: rpcUrl, CTRL_KEYS_CHAIN_ID: '46630',
        CTRL_KEYS_CONTRACT_ADDRESS: contractAddress, CTRL_KEYS_TOKEN_ADDRESS: tokenAddress, CTRL_KEYS_TREASURY_ADDRESS: treasury.address, CTRL_KEYS_CONFIRMATIONS: '2'})) vi.stubEnv(key, value);
      await server.provider.request({method: 'evm_mine', params: []});
      const challenge = await api('auth/nonce', {address: owner.address});
      const {nonce, message} = await challenge.json() as {nonce: string; message: string};
      const verified = await api('auth/verify', {address: owner.address, nonce, signature: await owner.signMessage({message})});
      expect(verified.status).toBe(200);
      const cookie = cookieFrom(verified);
      const profile = await api('habitat/profile', {name: 'EVM API Owner', character: 'male'}, cookie);
      expect(profile.status).toBe(200);
      const {homeId} = await profile.json() as {homeId: string};
      const base = `habitat/worlds/${homeId}/keys`;
      const ready = await api(base, undefined, cookie);
      expect(ready.status).toBe(200);
      expect(await ready.json()).toMatchObject({status: 'ready', exists: false, keyWorldId: worldKeyId(owner.address)});
      const prepared = await api(base + '/prepare', {}, cookie);
      expect(prepared.status).toBe(200);
      const {transaction} = await prepared.json() as {transaction: {to: Hex; data: Hex; value: string}};
      expect(transaction.value).toBe('0');
      const txHash = await writer.sendTransaction({to: transaction.to, data: transaction.data});
      expect((await mined(txHash)).status).toBe('success');
      await error(await api(base + '/verify', {txHash}, cookie), 409, 'KEYS_CLAIM_UNCONFIRMED');
      await server.provider.request({method: 'evm_mine', params: []});
      const receipt = await api(base + '/verify', {txHash}, cookie);
      expect(receipt.status).toBe(200);
      expect(await receipt.json()).toMatchObject({status: 'verified', isOwner: true, ownerAddress: owner.address, worldId: homeId, txHash});
      await error(await api(base + '/prepare', {}, cookie), 409, 'KEYS_WORLD_ALREADY_CLAIMED');
      await error(await api(base + '/verify', {txHash: '0x' + '0'.repeat(64)}, cookie), 409, 'KEYS_CLAIM_UNCONFIRMED');
      const outsider = await signedWallet();
      await error(await api(base + '/verify', {txHash}, outsider.cookie), 404);
      // Successful key receipts never turn traders into offchain administrators.
      expect(await one('SELECT COUNT(*) AS count FROM habitat_members WHERE world_id=?', homeId)).toEqual({count: 0});
    } finally {await server.close();}
  }, 60000);
});
