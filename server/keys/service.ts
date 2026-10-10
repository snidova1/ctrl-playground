import {
  createPublicClient, decodeEventLog, encodeFunctionData, getAddress, http,
  isAddress, keccak256, toHex, TransactionReceiptNotFoundError, zeroAddress, zeroHash,
  type Address, type Hex,
} from 'viem';
import {AppError} from '../errors';
import {worldKeysAbi} from './abi';

/** Only the parent server may supply this configuration, never a request body. */
export interface KeysConfig {
  rpcUrl: string;
  chainId: number;
  contractAddress: string;
  tokenAddress: string;
  treasuryAddress: string;
  /** Inclusion block counts as one confirmation. Default: 2. */
  confirmations?: number;
}

interface Identity {
  worldId: string;
  keyWorldId: Hex;
  wallet: Address;
}
interface DeploymentSnapshot {
  chainId: number;
  contractAddress: Address;
  tokenAddress: Address;
  treasuryAddress: Address;
  feeBps: 300;
  blockNumber: string;
  blockHash: Hex;
}
export interface KeysNotDeployed extends Identity {
  status: 'not-deployed';
  isOwner: false;
}
export interface WorldKeysReady extends Identity, DeploymentSnapshot {
  status: 'ready';
  exists: boolean;
  ownerAddress: Address | null;
  ownerWorldId: Hex | null;
  isOwner: boolean;
  /** Includes the locked owner key; memberBalance excludes it. */
  balance: string;
  memberBalance: string;
  supply: string;
  reserve: string;
}
export type WorldKeysRead = KeysNotDeployed | WorldKeysReady;
export interface PreparedOwnerClaim extends Identity, DeploymentSnapshot {
  status: 'prepared';
  transaction: {chainId: number; from: Address; to: Address; data: Hex; value: '0'};
}
export interface VerifiedOwnerClaim extends Identity, DeploymentSnapshot {
  status: 'verified';
  isOwner: true;
  ownerAddress: Address;
  txHash: Hex;
  confirmations: string;
}

const ZERO = BigInt(0);
const ONE = BigInt(1);
const CREATED_TOPIC = keccak256(toHex('WorldCreated(bytes32,address)'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function reject(code: string, status = 503): never {throw new AppError(code, status);}
function canonicalWorldId(worldId: string): string {
  if (typeof worldId !== 'string' || !UUID.test(worldId)) reject('KEYS_INVALID_WORLD_ID', 422);
  return worldId.toLowerCase();
}
/** Stable, domain-separated hash of the canonical personal-world UUID's UTF-8 text. */
export function worldKeyId(worldId: string): Hex {
  return keccak256(toHex(`ctrl:personal-world:v1:${canonicalWorldId(worldId)}`));
}
function address(value: string, code: string): Address {
  if (typeof value !== 'string' || !isAddress(value) || value.toLowerCase() === zeroAddress) reject(code, 422);
  return getAddress(value);
}
function identity(worldId: string, wallet: string): Identity {
  return {worldId: canonicalWorldId(worldId), keyWorldId: worldKeyId(worldId), wallet: address(wallet, 'KEYS_INVALID_WALLET')};
}
function normalize(config: KeysConfig | null) {
  if (config === null) reject('KEYS_NOT_DEPLOYED');
  const confirmations = config.confirmations ?? 2;
  if (!Number.isSafeInteger(config.chainId) || config.chainId <= 0 ||
      !Number.isSafeInteger(confirmations) || confirmations < 1) reject('KEYS_INVALID_CONFIG');
  try {
    if (typeof config.rpcUrl !== 'string' || !['http:', 'https:'].includes(new URL(config.rpcUrl).protocol)) reject('KEYS_INVALID_CONFIG');
  } catch {reject('KEYS_INVALID_CONFIG');}
  return {
    rpcUrl: config.rpcUrl, chainId: config.chainId, confirmations,
    contractAddress: address(config.contractAddress, 'KEYS_INVALID_CONFIG'),
    tokenAddress: address(config.tokenAddress, 'KEYS_INVALID_CONFIG'),
    treasuryAddress: address(config.treasuryAddress, 'KEYS_INVALID_CONFIG'),
  };
}
function context(config: KeysConfig | null) {
  const deployment = normalize(config);
  const client = createPublicClient({
    transport: http(deployment.rpcUrl, {timeout: 8000, retryCount: 0}), cacheTime: 0,
  });
  return {deployment, client};
}
type Context = ReturnType<typeof context>;

// Never expose RPC URLs, credentials, or upstream error payloads through public errors.
async function rpcGuard<T>(action: () => Promise<T>): Promise<T> {
  try {return await action();}
  catch (error) {
    if (error instanceof AppError) throw error;
    reject('KEYS_RPC_UNAVAILABLE');
  }
}
async function checkChain({client, deployment}: Context) {
  if (await client.getChainId() !== deployment.chainId) reject('KEYS_CHAIN_MISMATCH');
}
async function snapshotBlock(ctx: Context, confirmed: boolean) {
  await checkChain(ctx);
  const latest = await ctx.client.getBlockNumber();
  const depth = confirmed ? BigInt(ctx.deployment.confirmations) - ONE : ZERO;
  if (latest < depth) reject('KEYS_INSUFFICIENT_CONFIRMATIONS', 409);
  const block = await ctx.client.getBlock({blockNumber: latest - depth});
  if (!block.hash) reject('KEYS_BLOCK_UNAVAILABLE');
  return {number: block.number, hash: block.hash};
}
async function assertCanonical(ctx: Context, blockNumber: bigint, blockHash: Hex) {
  const block = await ctx.client.getBlock({blockNumber});
  if (block.hash !== blockHash) reject('KEYS_CHAIN_REORG', 409);
}
async function validateDeployment(ctx: Context, blockNumber: bigint, blockHash: Hex): Promise<DeploymentSnapshot> {
  const {client, deployment} = ctx;
  const {contractAddress, tokenAddress, treasuryAddress, chainId} = deployment;
  const code = await client.getCode({address: contractAddress, blockNumber});
  if (!code || code === '0x') reject('KEYS_CONTRACT_NOT_DEPLOYED');
  const tokenCode = await client.getCode({address: tokenAddress, blockNumber});
  if (!tokenCode || tokenCode === '0x') reject('KEYS_TOKEN_NOT_DEPLOYED');
  const request = {address: contractAddress, abi: worldKeysAbi, blockNumber};
  const token = await client.readContract({...request, functionName: 'ctrl'});
  const treasury = await client.readContract({...request, functionName: 'developmentTreasury'});
  const fee = await client.readContract({...request, functionName: 'FEE_BPS'});
  if (token !== tokenAddress) reject('KEYS_TOKEN_MISMATCH');
  if (treasury !== treasuryAddress) reject('KEYS_TREASURY_MISMATCH');
  if (fee !== BigInt(300)) reject('KEYS_FEE_MISMATCH');
  return {chainId, contractAddress, tokenAddress, treasuryAddress, feeBps: 300, blockNumber: blockNumber.toString(), blockHash};
}
async function ownership(ctx: Context, who: Identity, blockNumber: bigint) {
  const request = {address: ctx.deployment.contractAddress, abi: worldKeysAbi, blockNumber};
  const [ownerAddress, supply, reserve] = await ctx.client.readContract({...request, functionName: 'worlds', args: [who.keyWorldId]});
  const ownerWorldId = await ctx.client.readContract({...request, functionName: 'ownerWorld', args: [who.wallet]});
  const balance = await ctx.client.readContract({...request, functionName: 'balanceOf', args: [who.keyWorldId, who.wallet]});
  const memberBalance = await ctx.client.readContract({...request, functionName: 'memberBalanceOf', args: [who.keyWorldId, who.wallet]});
  const exists = ownerAddress !== zeroAddress;
  const isOwner = exists && ownerAddress === who.wallet;
  if ((isOwner && ownerWorldId !== who.keyWorldId) ||
      (!isOwner && ownerWorldId === who.keyWorldId) ||
      balance !== memberBalance + (isOwner ? ONE : ZERO) ||
      (exists ? supply < ONE || balance > supply : supply !== ZERO || reserve !== ZERO || balance !== ZERO)) {
    reject('KEYS_STATE_MISMATCH');
  }
  if (exists) {
    const registered = await ctx.client.readContract({...request, functionName: 'ownerWorld', args: [ownerAddress]});
    if (registered !== who.keyWorldId) reject('KEYS_STATE_MISMATCH');
  }
  return {
    exists, ownerAddress: exists ? ownerAddress : null, ownerWorldId: ownerWorldId === zeroHash ? null : ownerWorldId,
    isOwner, balance: balance.toString(), memberBalance: memberBalance.toString(), supply: supply.toString(), reserve: reserve.toString(),
  };
}

export async function readWorldKeys(config: KeysConfig | null, worldId: string, wallet: string): Promise<WorldKeysRead> {
  const who = identity(worldId, wallet);
  if (config === null) return {...who, status: 'not-deployed', isOwner: false};
  const ctx = context(config);
  return rpcGuard(async () => {
    const block = await snapshotBlock(ctx, true);
    const deployment = await validateDeployment(ctx, block.number, block.hash);
    const state = await ownership(ctx, who, block.number);
    await assertCanonical(ctx, block.number, block.hash);
    return {...who, ...deployment, ...state, status: 'ready'};
  });
}

export async function prepareOwnerClaim(config: KeysConfig | null, worldId: string, wallet: string): Promise<PreparedOwnerClaim> {
  const ctx = context(config);
  const who = identity(worldId, wallet);
  return rpcGuard(async () => {
    const block = await snapshotBlock(ctx, false);
    const deployment = await validateDeployment(ctx, block.number, block.hash);
    const state = await ownership(ctx, who, block.number);
    if (state.exists) reject('KEYS_WORLD_ALREADY_CLAIMED', 409);
    if (state.ownerWorldId !== null) reject('KEYS_WALLET_ALREADY_CLAIMED', 409);
    const data = encodeFunctionData({abi: worldKeysAbi, functionName: 'createWorld', args: [who.keyWorldId]});
    await ctx.client.simulateContract({
      address: deployment.contractAddress, abi: worldKeysAbi, functionName: 'createWorld',
      args: [who.keyWorldId], account: who.wallet, blockNumber: block.number,
    });
    await assertCanonical(ctx, block.number, block.hash);
    return {...who, ...deployment, status: 'prepared', transaction: {
      chainId: deployment.chainId, from: who.wallet, to: deployment.contractAddress, data, value: '0',
    }};
  });
}

export async function verifyOwnerClaim(config: KeysConfig | null, worldId: string, wallet: string, txHash: string): Promise<VerifiedOwnerClaim> {
  const ctx = context(config);
  const who = identity(worldId, wallet);
  if (typeof txHash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(txHash)) reject('KEYS_INVALID_TX_HASH', 422);
  const hash = txHash.toLowerCase() as Hex;
  return rpcGuard(async () => {
    await checkChain(ctx);
    const receipt = await ctx.client.getTransactionReceipt({hash}).catch((error: unknown) => {
      if (error instanceof TransactionReceiptNotFoundError) reject('KEYS_CLAIM_UNCONFIRMED', 409);
      throw error;
    });
    if (receipt.status !== 'success') reject('KEYS_CLAIM_REVERTED', 409);
    if (receipt.transactionHash !== hash || receipt.from !== who.wallet || receipt.to !== ctx.deployment.contractAddress) {
      reject('KEYS_CLAIM_TRANSACTION_MISMATCH', 422);
    }
    const latest = await ctx.client.getBlockNumber();
    const confirmations = latest - receipt.blockNumber + ONE;
    if (confirmations < BigInt(ctx.deployment.confirmations)) reject('KEYS_CLAIM_UNCONFIRMED', 409);
    await assertCanonical(ctx, receipt.blockNumber, receipt.blockHash);
    const deployment = await validateDeployment(ctx, receipt.blockNumber, receipt.blockHash);
    const transaction = await ctx.client.getTransaction({hash});
    const expectedData = encodeFunctionData({abi: worldKeysAbi, functionName: 'createWorld', args: [who.keyWorldId]});
    if (transaction.hash !== hash || transaction.from !== who.wallet || transaction.to !== deployment.contractAddress ||
        transaction.blockHash !== receipt.blockHash || transaction.blockNumber !== receipt.blockNumber ||
        transaction.transactionIndex !== receipt.transactionIndex || transaction.input !== expectedData || transaction.value !== ZERO ||
        (transaction.chainId !== undefined && transaction.chainId !== deployment.chainId)) {
      reject('KEYS_CLAIM_TRANSACTION_MISMATCH', 422);
    }
    const logs = receipt.logs.filter(log => log.address === deployment.contractAddress && log.topics[0] === CREATED_TOPIC);
    if (logs.length !== 1) reject('KEYS_CLAIM_EVENT_MISMATCH', 422);
    const log = logs[0];
    if (log.removed || log.transactionHash !== hash || log.blockHash !== receipt.blockHash || log.blockNumber !== receipt.blockNumber) {
      reject('KEYS_CLAIM_EVENT_MISMATCH', 422);
    }
    try {
      const event = decodeEventLog({abi: worldKeysAbi, eventName: 'WorldCreated', topics: log.topics, data: log.data, strict: true});
      if (event.args.worldId !== who.keyWorldId || event.args.owner !== who.wallet) reject('KEYS_CLAIM_EVENT_MISMATCH', 422);
    } catch {reject('KEYS_CLAIM_EVENT_MISMATCH', 422);}
    const state = await ownership(ctx, who, receipt.blockNumber);
    if (!state.isOwner || state.ownerWorldId !== who.keyWorldId) reject('KEYS_CLAIM_OWNER_MISMATCH', 422);
    await assertCanonical(ctx, receipt.blockNumber, receipt.blockHash);
    return {...who, ...deployment, status: 'verified', isOwner: true, ownerAddress: who.wallet, txHash: hash, confirmations: confirmations.toString()};
  });
}
