#!/usr/bin/env node
// Deliberately testnet-only. Default is dry-run; no transaction is sent without
// BOTH --broadcast and CTRL_KEYS_BROADCAST_CONFIRM=TESTNET_ONLY.
import {readFile, writeFile, mkdir, open, unlink} from 'node:fs/promises';
import {createPublicClient, createWalletClient, defineChain, http, encodeDeployData, erc20Abi, formatEther, keccak256, parseEther, getAddress} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {compileWorldKeys, assertMatchingKeysRuntime} from './world-keys-artifact.mjs';

const chainId = 46630;
const instructions = [
  'CTRL World Keys testnet deployment',
  'Dry run (no transaction): CTRL_TESTNET_WALLET_FILE=/private/wallet.json CTRL_KEYS_TREASURY=0x... CTRL_KEYS_CURVE_UNIT_WEI=1000000000000000 node scripts/testnet/world-keys-deploy.mjs',
  'Broadcast: same environment, add CTRL_KEYS_BROADCAST_CONFIRM=TESTNET_ONLY and --broadcast',
  'Token is read from deployments/robinhood-testnet.json. Chain must be 46630. No mainnet support.',
].join('\n');

function requireAddress(value, name) {
  if (!value) throw new Error(name + '_REQUIRED');
  try {return getAddress(value);} catch {throw new Error(name + '_INVALID');}
}
function requireCurveUnit(value) {
  if (!/^[0-9]+$/.test(value ?? '')) throw new Error('CTRL_KEYS_CURVE_UNIT_WEI_REQUIRED_INTEGER');
  const unit = BigInt(value);
  if (unit < 1n || unit > 10n ** 30n) throw new Error('INVALID_CURVE_UNIT');
  return unit;
}
async function requireAbsent(path) {
  try {await readFile(path); throw new Error('DEPLOYMENT_ALREADY_RECORDED: ' + path);} catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {console.log(instructions); return;}
  if (args.some((arg) => arg !== '--broadcast' && arg !== '--dry-run') || (args.includes('--dry-run') && args.includes('--broadcast'))) {
    throw new Error('INVALID_ARGUMENTS: use --dry-run (default) or --broadcast');
  }
  const broadcast = args.includes('--broadcast');
  if (broadcast && process.env.CTRL_KEYS_BROADCAST_CONFIRM !== 'TESTNET_ONLY') {
    throw new Error('BROADCAST_CONFIRMATION_REQUIRED');
  }
  const treasury = requireAddress(process.env.CTRL_KEYS_TREASURY, 'CTRL_KEYS_TREASURY');
  const curveUnit = requireCurveUnit(process.env.CTRL_KEYS_CURVE_UNIT_WEI);
  const walletFile = process.env.CTRL_TESTNET_WALLET_FILE;
  if (!walletFile) throw new Error('CTRL_TESTNET_WALLET_FILE_REQUIRED: keep it outside repository');
  const secret = JSON.parse(await readFile(walletFile, 'utf8'));
  const account = privateKeyToAccount(secret.privateKey);
  if (getAddress(secret.address) !== account.address) throw new Error('WALLET_MISMATCH');
  const tokenFixture = JSON.parse(await readFile('deployments/robinhood-testnet.json', 'utf8'));
  if (tokenFixture.chainId !== chainId || tokenFixture.testnetOnly !== true) throw new Error('WRONG_TOKEN_FIXTURE');
  const token = requireAddress(tokenFixture.token, 'TOKEN');
  await requireAbsent('deployments/robinhood-worldkeys-pending.json');
  await requireAbsent('deployments/robinhood-worldkeys.json');

  const url = process.env.CTRL_TESTNET_RPC_URL || 'https://robinhood-sepolia-rpc.publicnode.com';
  const chain = defineChain({id:chainId, name:'Robinhood Chain Testnet', nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18}, rpcUrls:{default:{http:[url]}}});
  const transport = http(url, {timeout: 15000, retryCount: 0});
  const client = createPublicClient({chain, transport});
  if (await client.getChainId() !== chainId) throw new Error('WRONG_CHAIN: refusing non-testnet execution');
  const tokenCode=await client.getCode({address:token});
  if (!tokenCode || tokenCode==='0x') throw new Error('TOKEN_CONTRACT_NOT_FOUND');
  if(!/^0x[0-9a-fA-F]{64}$/.test(tokenFixture.codeHash??'')||keccak256(tokenCode).toLowerCase()!==tokenFixture.codeHash.toLowerCase()) throw new Error('TOKEN_FIXTURE_CODE_HASH_MISMATCH');
  if (await client.readContract({address:token, abi:erc20Abi, functionName:'symbol'}) !== 'tCTRL') {
    throw new Error('UNEXPECTED_TOKEN_SYMBOL: disposable tCTRL fixture required');
  }

  const artifact = await compileWorldKeys();
  const argsForConstructor = [token, treasury, curveUnit];
  const deployData = encodeDeployData({abi:artifact.abi, bytecode:artifact.bytecode, args:argsForConstructor});
  const [gas, gasPrice, balance] = await Promise.all([
    client.estimateGas({account:account.address, data:deployData}),
    client.getGasPrice(),
    client.getBalance({address:account.address})
  ]);
  const latestBlock=await client.getBlock({blockTag:'latest'});
  if(latestBlock.baseFeePerGas!==null && latestBlock.baseFeePerGas!==undefined && gasPrice<latestBlock.baseFeePerGas) throw new Error('RPC_GAS_PRICE_BELOW_BASE_FEE');
  const gasLimit = gas * 12n / 10n;
  const maxCost = gasLimit * gasPrice;
  if (maxCost > parseEther('0.002') || balance < maxCost) throw new Error('GAS_BUDGET_EXCEEDED_OR_WALLET_UNFUNDED');
  const preview = {mode:broadcast?'broadcast':'dry-run',chainId,token,treasury,curveUnitWei:curveUnit.toString(),deployer:account.address,gasEstimate:gas.toString(),estimatedMaxGasETH:formatEther(maxCost),balanceETH:formatEther(balance)};
  console.log(JSON.stringify(preview));
  if (!broadcast) {console.log('DRY_RUN_OK: no transaction sent');return;}

  // Single-operator interlock. A crash after broadcast deliberately leaves a lock
  // requiring manual onchain transaction reconciliation before any retry.
  await mkdir('deployments', {recursive:true});
  const lockPath = 'deployments/.worldkeys-deploy.lock';
  const lock = await open(lockPath, 'wx');
  await lock.close();
  let sent = false;
  let complete = false;
  try {
    await requireAbsent('deployments/robinhood-worldkeys-pending.json');
    await requireAbsent('deployments/robinhood-worldkeys.json');
    const wallet = createWalletClient({account,chain,transport:http(url,{timeout:15000,retryCount:0})});
    const transactionHash = await wallet.deployContract({abi:artifact.abi,bytecode:artifact.bytecode,args:argsForConstructor,gas:gasLimit,gasPrice});
    sent = true;
    await writeFile('deployments/robinhood-worldkeys-pending.json',JSON.stringify({chainId,transactionHash,deployer:account.address,token,treasury,curveUnitWei:curveUnit.toString()},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({transactionHash,pending:true}));
    const receipt = await client.waitForTransactionReceipt({hash:transactionHash,timeout:120000});
    if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('WORLDKEYS_DEPLOYMENT_FAILED');
    const address = receipt.contractAddress;
    const code = await client.getCode({address});
    assertMatchingKeysRuntime(code, artifact);
    const [actualToken,actualTreasury,actualUnit,fee,maxSupply] = await Promise.all([
      client.readContract({address,abi:artifact.abi,functionName:'ctrl'}),
      client.readContract({address,abi:artifact.abi,functionName:'developmentTreasury'}),
      client.readContract({address,abi:artifact.abi,functionName:'curveUnit'}),
      client.readContract({address,abi:artifact.abi,functionName:'FEE_BPS'}),
      client.readContract({address,abi:artifact.abi,functionName:'MAX_SUPPLY'})
    ]);
    if (getAddress(actualToken) !== token || getAddress(actualTreasury) !== treasury || actualUnit !== curveUnit || fee !== 300n || maxSupply !== 10000n) {
      throw new Error('WORLDKEYS_CONSTRUCTOR_OR_CONSTANTS_MISMATCH');
    }
    const record = {chainId,worldKeys:address,token,treasury,curveUnitWei:curveUnit.toString(),transactionHash,block:receipt.blockNumber.toString(),deployer:account.address,compiler:artifact.compiler,codeHash:keccak256(code),gasUsed:receipt.gasUsed.toString(),testnetOnly:true};
    await writeFile('deployments/robinhood-worldkeys.json',JSON.stringify(record,null,2)+'\n',{flag:'wx'});
    complete = true;
    console.log(JSON.stringify({verified:true,...record}));
  } finally {
    // Never clear lock on an ambiguous broadcast. Operator must inspect tx hash.
    if (!sent || complete) await unlink(lockPath);
  }
}
main().catch((error) => {console.error(error.shortMessage || error.message);if(process.env.CTRL_KEYS_DEBUG==='1')console.error(error.stack||error);process.exitCode=1;});
