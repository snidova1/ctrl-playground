import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ganache from 'ganache';
import {
  createPublicClient, createWalletClient, defineChain, http, decodeFunctionData,
  getAddress, keccak256, toHex, maxUint256, zeroAddress, zeroHash,
  type Hex,
} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {compileToken} from '../../scripts/testnet/compile.mjs';
import {compileWorldKeys} from '../../scripts/testnet/world-keys-artifact.mjs';
import {AppError} from '../../server/errors';
import {worldKeysAbi} from '../../server/keys/abi';
import {
  worldKeyId, readWorldKeys, prepareOwnerClaim, verifyOwnerClaim, type KeysConfig,
} from '../../server/keys/service';

// Real HTTP RPC only on an ephemeral localhost Ganache server. No configured credentials.
const server = ganache.server({chain: {chainId: 46630}, logging: {quiet: true}});
const solc = createRequire(import.meta.url)('solc');
const uuid = 'a4f2cc10-3855-47dd-8588-b38b08a61ca6';
const otherUuid = 'f62983b7-afd5-4272-9e54-9ef5c5405af5';
async function fails(action: () => unknown, code: string, status: number) {
  await assert.rejects(async () => action(), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}
try {
  await server.listen(0, '127.0.0.1');
  const location = server.address();
  assert.ok(location && typeof location !== 'string');
  const rpcUrl = `http://127.0.0.1:${location.port}`;
  const chain = defineChain({id: 46630, name: 'Keys service local checks', nativeCurrency: {name: 'ETH', symbol: 'ETH', decimals: 18}, rpcUrls: {default: {http: [rpcUrl]}}});
  const reader = createPublicClient({chain, transport: http(rpcUrl), cacheTime: 0});
  const [owner, trader, treasury] = Object.values(server.provider.getInitialAccounts()).slice(0, 3)
    .map(value => privateKeyToAccount(value.secretKey as Hex));
  const ownerWriter = createWalletClient({account: owner, chain, transport: http(rpcUrl)});
  const traderWriter = createWalletClient({account: trader, chain, transport: http(rpcUrl)});
  const expectedId = keccak256(`${toHex('CTRL_WORLD_V1')}${owner.address.slice(2)}`);
  assert.equal(worldKeyId(owner.address), expectedId);
  assert.equal(worldKeyId(owner.address.toLowerCase()), expectedId);
  assert.notEqual(worldKeyId(trader.address), expectedId);
  await fails(() => worldKeyId(uuid), 'KEYS_INVALID_OWNER_WALLET', 422);
  await fails(() => worldKeyId(zeroAddress), 'KEYS_INVALID_OWNER_WALLET', 422);
  await fails(() => readWorldKeys(null, 'not-uuid', owner.address, trader.address), 'KEYS_INVALID_WORLD_ID', 422);
  await fails(() => readWorldKeys(null, uuid, zeroAddress, trader.address), 'KEYS_INVALID_OWNER_WALLET', 422);
  await fails(() => readWorldKeys(null, uuid, owner.address, zeroAddress), 'KEYS_INVALID_WALLET', 422);
  const disabled = await readWorldKeys(null, uuid.toUpperCase(), owner.address, trader.address);
  assert.deepEqual(disabled, {worldId: uuid, keyWorldId: expectedId, ownerWallet: owner.address, wallet: trader.address, status: 'not-deployed', isOwner: false});
  await fails(() => prepareOwnerClaim(null, uuid, owner.address, trader.address), 'KEYS_NOT_WORLD_OWNER', 403);
  await fails(() => verifyOwnerClaim(null, uuid, owner.address, trader.address, zeroHash), 'KEYS_NOT_WORLD_OWNER', 403);
  await fails(() => prepareOwnerClaim(null, uuid, owner.address, owner.address), 'KEYS_NOT_DEPLOYED', 503);
  console.log('PASS service ID matches independent packed encoding, no UUID-only hash, owner/trader roles enforced before RPC');

  const token = await compileToken();
  const keys = await compileWorldKeys();
  async function mined(hash: Hex, status = 'success') {
    const result = await reader.waitForTransactionReceipt({hash, pollingInterval: 50});
    assert.equal(result.status, status);
    return result;
  }
  const tokenAddress = (await mined(await ownerWriter.deployContract({abi: token.abi, bytecode: token.bytecode as Hex}))).contractAddress!;
  const contractAddress = (await mined(await ownerWriter.deployContract({abi: keys.abi, bytecode: keys.bytecode as Hex, args: [tokenAddress, treasury.address, 101n]}))).contractAddress!;
  const config: KeysConfig = {rpcUrl, chainId: chain.id, tokenAddress, contractAddress, treasuryAddress: treasury.address, confirmations: 2};
  await server.provider.request({method: 'evm_mine', params: []});
  const request = {address: contractAddress, abi: keys.abi};
  const empty = await readWorldKeys(config, uuid, owner.address, trader.address);
  assert.equal(empty.status, 'ready');
  if (empty.status !== 'ready') throw new Error('Expected deployment');
  assert.equal(empty.exists, false);
  assert.equal(empty.ownerWorldId, null);
  assert.equal(empty.balance, '0');
  assert.equal(empty.keyWorldId, expectedId);
  await fails(() => readWorldKeys({...config, chainId: 1}, uuid, owner.address, trader.address), 'KEYS_CHAIN_MISMATCH', 503);
  await fails(() => readWorldKeys({...config, confirmations: 0}, uuid, owner.address, trader.address), 'KEYS_INVALID_CONFIG', 503);
  await fails(() => readWorldKeys({...config, contractAddress: trader.address}, uuid, owner.address, trader.address), 'KEYS_CONTRACT_NOT_DEPLOYED', 503);
  await fails(() => readWorldKeys({...config, treasuryAddress: trader.address}, uuid, owner.address, trader.address), 'KEYS_TREASURY_MISMATCH', 503);
  const source = readFileSync(new URL('./OwnerBindingFixture.sol', import.meta.url), 'utf8');
  const compiled = JSON.parse(solc.compile(JSON.stringify({language: 'Solidity', sources: {'fixture.sol': {content: source}}, settings: {
    optimizer: {enabled: true, runs: 200}, evmVersion: 'paris', outputSelection: {'*': {'*': ['abi', 'evm.bytecode.object']}},
  }})));
  assert.deepEqual((compiled.errors ?? []).filter((entry: {severity: string}) => entry.severity === 'error'), []);
  for (const [name, code] of [['OwnerBindingFixture', 'KEYS_OWNER_ID_MISMATCH'], ['LegacyKeysFixture', 'KEYS_RPC_UNAVAILABLE']]) {
    const artifact = compiled.contracts['fixture.sol'][name];
    const fakeAddress = (await mined(await ownerWriter.deployContract({abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}`, args: [tokenAddress, treasury.address]}))).contractAddress!;
    const fakeConfig = {...config, contractAddress: fakeAddress, confirmations: 1};
    await fails(() => readWorldKeys(fakeConfig, uuid, owner.address, trader.address), code, 503);
    await fails(() => prepareOwnerClaim(fakeConfig, uuid, owner.address, owner.address), code, 503);
  }
  console.log('PASS deployment checks fail closed on wrong chain/config/treasury, legacy ABI and mismatched onchain owner ID derivation');

  const prepared = await prepareOwnerClaim(config, uuid, owner.address, owner.address);
  assert.equal(prepared.transaction.from, owner.address);
  assert.equal(prepared.ownerWallet, owner.address);
  assert.equal(prepared.transaction.value, '0');
  assert.deepEqual(decodeFunctionData({abi: worldKeysAbi, data: prepared.transaction.data}), {functionName: 'createWorld', args: [expectedId]});
  const attackHash = await traderWriter.sendTransaction({to: contractAddress, data: prepared.transaction.data, gas: 200000n});
  const attack = await mined(attackHash, 'reverted');
  assert.equal(attack.logs.length, 0);
  assert.deepEqual(await reader.readContract({...request, functionName: 'worlds', args: [expectedId]}), [zeroAddress, 0n, 0n]);
  await fails(() => verifyOwnerClaim(config, uuid, owner.address, owner.address, attackHash), 'KEYS_CLAIM_REVERTED', 409);
  const ownerHash = await ownerWriter.sendTransaction({to: contractAddress, data: prepared.transaction.data});
  await mined(ownerHash);
  await fails(() => verifyOwnerClaim(config, uuid, owner.address, owner.address, ownerHash), 'KEYS_CLAIM_UNCONFIRMED', 409);
  await server.provider.request({method: 'evm_mine', params: []});
  const verified = await verifyOwnerClaim(config, uuid, owner.address, owner.address, ownerHash);
  assert.equal(verified.isOwner, true);
  assert.equal(verified.ownerAddress, owner.address);
  assert.equal(verified.keyWorldId, expectedId);
  assert.equal(verified.txHash, ownerHash);
  assert.equal(verified.confirmations, '2');
  await fails(() => verifyOwnerClaim(config, uuid, trader.address, trader.address, ownerHash), 'KEYS_CLAIM_TRANSACTION_MISMATCH', 422);
  await fails(() => verifyOwnerClaim(config, uuid, owner.address, owner.address, 'bad'), 'KEYS_INVALID_TX_HASH', 422);
  await fails(() => verifyOwnerClaim(config, uuid, owner.address, owner.address, zeroHash), 'KEYS_CLAIM_UNCONFIRMED', 409);
  await fails(() => prepareOwnerClaim(config, uuid, owner.address, owner.address), 'KEYS_WORLD_ALREADY_CLAIMED', 409);
  await fails(() => prepareOwnerClaim(config, otherUuid, owner.address, owner.address), 'KEYS_WORLD_ALREADY_CLAIMED', 409);
  console.log('PASS real prepared calldata: attacker copy mined/reverted, owner confirmed receipt verified, wrong/reverted/missing/unconfirmed receipts rejected');

  // Trader has a separate personal owner key. Reading/buying victim membership must not
  // switch keyWorldId or ownerWorldId to the trader's own world.
  const traderId = worldKeyId(trader.address);
  const traderClaimHash = await traderWriter.writeContract({...request, functionName: 'createWorld', args: [traderId]});
  await mined(traderClaimHash);
  await mined(await traderWriter.writeContract({address: tokenAddress, abi: token.abi, functionName: 'claim'}));
  await mined(await traderWriter.writeContract({address: tokenAddress, abi: token.abi, functionName: 'approve', args: [contractAddress, maxUint256]}));
  const quote = await reader.readContract({...request, functionName: 'quoteBuy', args: [expectedId, 2n]}) as [bigint, bigint, bigint];
  const block = await reader.getBlock();
  const buyHash = await traderWriter.writeContract({...request, functionName: 'buy', args: [expectedId, 2n, quote[2], block.timestamp + 3600n]});
  await mined(buyHash);
  await server.provider.request({method: 'evm_mine', params: []});
  await fails(() => verifyOwnerClaim(config, uuid, trader.address, trader.address, buyHash), 'KEYS_CLAIM_TRANSACTION_MISMATCH', 422);
  const member = await readWorldKeys(config, uuid, owner.address.toLowerCase(), trader.address.toLowerCase());
  assert.equal(member.status, 'ready');
  if (member.status !== 'ready') throw new Error('Expected deployment');
  assert.equal(member.ownerWallet, getAddress(owner.address));
  assert.equal(member.wallet, getAddress(trader.address));
  assert.equal(member.keyWorldId, expectedId);
  assert.equal(member.ownerWorldId, expectedId);
  assert.equal(member.ownerAddress, owner.address);
  assert.equal(member.isOwner, false);
  assert.equal(member.balance, '2');
  assert.equal(member.memberBalance, '2');
  assert.equal(member.supply, '3');
  assert.equal(member.reserve, '505');
  const ownerRead = await readWorldKeys(config, uuid, owner.address, owner.address);
  assert.equal(ownerRead.status, 'ready');
  if (ownerRead.status !== 'ready') throw new Error('Expected deployment');
  assert.equal(ownerRead.isOwner, true);
  assert.equal(ownerRead.balance, '1');
  assert.equal(ownerRead.memberBalance, '0');
  const alias = await readWorldKeys(config, otherUuid, owner.address, trader.address);
  assert.equal(alias.keyWorldId, expectedId); // UUID is metadata only; parent enforces one durable home.
  assert.equal(await reader.readContract({...request, functionName: 'ownerWorld', args: [trader.address]}), traderId);
  const sellQuote = await reader.readContract({...request, functionName: 'quoteSell', args: [expectedId, 2n]}) as [bigint, bigint, bigint];
  await mined(await traderWriter.writeContract({...request, functionName: 'sell', args: [expectedId, 2n, sellQuote[2], block.timestamp + 3600n]}));
  await server.provider.request({method: 'evm_mine', params: []});
  const redeemed = await readWorldKeys(config, uuid, owner.address, trader.address);
  assert.equal(redeemed.status, 'ready');
  if (redeemed.status !== 'ready') throw new Error('Expected deployment');
  assert.equal(redeemed.memberBalance, '0');
  assert.equal(redeemed.reserve, '0');
  assert.equal(redeemed.supply, '1');
  console.log('PASS ownerWallet vs trader wallet with separate homes: member balances, confirmed snapshots, full redemption, duplicate UUID cannot mint another owner key');
  console.log('KEYS_SERVICE_OFFLINE_GREEN: real Ganache HTTP only; no public RPC or credentials');
} finally {
  await server.close();
}
