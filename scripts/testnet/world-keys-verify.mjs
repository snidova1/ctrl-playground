#!/usr/bin/env node
// Read-only onchain verification for an explicitly recorded testnet WorldKeys deploy.
// Never reads a private key or sends a transaction.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPublicClient,http,getAddress,keccak256} from 'viem';
import {compileWorldKeys,assertMatchingKeysRuntime} from './world-keys-artifact.mjs';

export async function verifyWorldKeys(options={}) {
  const path=options.recordPath??'deployments/robinhood-worldkeys.json';
  const fixturePath=options.fixturePath??'deployments/robinhood-testnet.json';
  const d=JSON.parse(await readFile(path,'utf8'));
  const tokenFixture=JSON.parse(await readFile(fixturePath,'utf8'));
  if (d.chainId!==46630 || d.testnetOnly!==true || tokenFixture.chainId!==46630 || tokenFixture.testnetOnly!==true) {
    throw new Error('ONLY_VERIFIED_TESTNET_FIXTURES_ALLOWED');
  }
  const address=getAddress(d.worldKeys);
  const token=getAddress(d.token);
  const treasury=getAddress(d.treasury);
  const deployer=getAddress(d.deployer);
  if (getAddress(tokenFixture.token)!==token) throw new Error('TOKEN_FIXTURE_MISMATCH');
  if (!/^[0-9]+$/.test(d.curveUnitWei??'')) throw new Error('BAD_CURVE_UNIT');
  const curveUnit=BigInt(d.curveUnitWei);
  if(curveUnit<1n || curveUnit>10n**30n) throw new Error('BAD_CURVE_UNIT');

  const url=options.url??process.env.CTRL_TESTNET_RPC_URL??'https://robinhood-sepolia-rpc.publicnode.com';
  const client=options.client??createPublicClient({transport:http(url,{timeout:15000,retryCount:0})});
  if (await client.getChainId()!==46630) throw new Error('WRONG_CHAIN');
  const artifact=await compileWorldKeys();
  if (d.compiler!==artifact.compiler) throw new Error('COMPILER_VERSION_MISMATCH');
  const [receipt,code,tokenCode,blockNumber] = await Promise.all([
    client.getTransactionReceipt({hash:d.transactionHash}),
    client.getCode({address}),
    client.getCode({address:token}),
    client.getBlockNumber()
  ]);
  if(!tokenCode || tokenCode==='0x' || !/^0x[0-9a-fA-F]{64}$/.test(tokenFixture.codeHash??'') || keccak256(tokenCode).toLowerCase()!==tokenFixture.codeHash.toLowerCase()) throw new Error('TOKEN_FIXTURE_CODE_HASH_MISMATCH');
  assert.equal(receipt.status,'success','FAILED_DEPLOYMENT_RECEIPT');
  assert.equal(getAddress(receipt.contractAddress??'0x0000000000000000000000000000000000000000'),address,'DEPLOYMENT_ADDRESS_MISMATCH');
  assert.equal(getAddress(receipt.from),deployer,'DEPLOYER_MISMATCH');
  assert.equal(receipt.blockNumber.toString(),String(d.block),'BLOCK_NUMBER_MISMATCH');
  if(blockNumber<receipt.blockNumber) throw new Error('INCONSISTENT_CHAIN_HEAD');
  if(!code || code==='0x') throw new Error('KEYS_CONTRACT_CODE_MISSING');
  assertMatchingKeysRuntime(code,artifact);
  if(keccak256(code)!==d.codeHash) throw new Error('KEYS_CODE_HASH_MISMATCH');
  const read=(functionName)=>client.readContract({address,abi:artifact.abi,functionName});
  const [actualToken,actualTreasury,actualUnit,fee,maxSupply]=await Promise.all([
    read('ctrl'),read('developmentTreasury'),read('curveUnit'),read('FEE_BPS'),read('MAX_SUPPLY')
  ]);
  assert.equal(getAddress(actualToken),token,'TOKEN_ADDRESS_MISMATCH');
  assert.equal(getAddress(actualTreasury),treasury,'TREASURY_MISMATCH');
  assert.equal(actualUnit,curveUnit,'CURVE_UNIT_MISMATCH');
  assert.equal(fee,300n,'FEE_MISMATCH');
  assert.equal(maxSupply,10000n,'MAX_SUPPLY_MISMATCH');
  return {verified:true,chainId:46630,worldKeys:address,token,treasury,curveUnitWei:curveUnit.toString(),transactionHash:d.transactionHash,block:receipt.blockNumber.toString(),confirmations:(blockNumber-receipt.blockNumber+1n).toString(),codeHash:d.codeHash,feeBps:Number(fee),maxSupply:Number(maxSupply),readOnly:true};
}

if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href) {
  verifyWorldKeys().then((result)=>console.log(JSON.stringify(result))).catch((error)=>{console.error(error.shortMessage||error.message);process.exitCode=1;});
}
