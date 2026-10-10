#!/usr/bin/env node
// Deterministic, provider-isolated contract test. Never calls a public RPC.
import assert from 'node:assert/strict';
import ganache from 'ganache';
import {createPublicClient,createWalletClient,custom,defineChain,erc20Abi,parseEther,keccak256,encodePacked,zeroHash,zeroAddress} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {compileToken} from './compile.mjs';
import {compileWorldKeys,assertMatchingKeysRuntime} from './world-keys-artifact.mjs';

const provider = ganache.provider({chain:{chainId:46630},logging:{quiet:true}});
const chain = defineChain({id:46630,name:'CTRL offline-only test chain',nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18},rpcUrls:{default:{http:['http://127.0.0.1:8545']}}});
const transport = custom(provider);
const reader = createPublicClient({chain,transport});
const accounts = Object.values(provider.getInitialAccounts()).slice(0,4).map((a)=>privateKeyToAccount(a.secretKey));
const [ownerA,ownerB,buyer,treasury] = accounts;
const writer = (account) => createWalletClient({account,chain,transport});
const sumSquares = (n) => n*(n+1n)*(2n*n+1n)/6n;
const curveUnit = parseEther('0.001');
const worldIdFor = (owner) => keccak256(encodePacked(['string','address'],['CTRL_WORLD_V1',owner]));
const worldIds = [worldIdFor(ownerA.address),worldIdFor(ownerB.address)];
const worldOwners = [ownerA,ownerB];
let expectedFees = 0n;
let tokenAddr;
let keysAddr;
let token;
let keys;
async function mined(hash) {
  const receipt = await reader.waitForTransactionReceipt({hash,pollingInterval:150,timeout:30000});
  assert.equal(receipt.status,'success');
  return receipt;
}
async function tokenRead(method,args=[]) {return reader.readContract({address:tokenAddr,abi:token.abi,functionName:method,args});}
async function keysRead(method,args=[]) {return reader.readContract({address:keysAddr,abi:keys.abi,functionName:method,args});}
async function keysWrite(account,method,args) {
  return mined(await writer(account).writeContract({address:keysAddr,abi:keys.abi,functionName:method,args}));
}
async function rejected(account,method,args,reason) {
  await assert.rejects(() => reader.simulateContract({account,address:keysAddr,abi:keys.abi,functionName:method,args}),reason ? new RegExp(reason) : undefined);
}
async function assertSolvent(label) {
  let reserves = 0n;
  for (let i=0;i<worldIds.length;i++) {
    const [registeredOwner,supply,reserve] = await keysRead('worlds',[worldIds[i]]);
    assert.equal(registeredOwner.toLowerCase(),worldOwners[i].address.toLowerCase(),label+' owner');
    assert.ok(supply>=1n,label+' permanent owner key');
    assert.equal(reserve,sumSquares(supply-1n)*curveUnit,label+' exact mathematical reserve');
    reserves += reserve;
  }
  assert.equal(await tokenRead('balanceOf',[keysAddr]),reserves,label+' all reserves backed by actual CTRL');
  assert.equal(await tokenRead('balanceOf',[treasury.address]),expectedFees,label+' exact fee destination');
}
async function buy(worldIndex,account,amount,deadline) {
  const id=worldIds[worldIndex];
  const [,supplyBefore] = await keysRead('worlds',[id]);
  const [principal,fee,total] = await keysRead('quoteBuy',[id,amount]);
  assert.equal(principal,(sumSquares(supplyBefore+amount-1n)-sumSquares(supplyBefore-1n))*curveUnit,'buy curve');
  assert.equal(fee,principal*300n/10000n,'3% buy fee');
  assert.equal(total,principal+fee);
  const oldBalance=await keysRead('balanceOf',[id,account.address]);
  await keysWrite(account,'buy',[id,amount,total,deadline]);
  expectedFees+=fee;
  assert.equal(await keysRead('balanceOf',[id,account.address]),oldBalance+amount,'buyer keys');
  await assertSolvent('after buy');
}
async function sell(worldIndex,account,amount,deadline) {
  const id=worldIds[worldIndex];
  const [,supplyBefore] = await keysRead('worlds',[id]);
  const [principal,fee,payout] = await keysRead('quoteSell',[id,amount]);
  assert.equal(principal,(sumSquares(supplyBefore-1n)-sumSquares(supplyBefore-amount-1n))*curveUnit,'sell curve');
  assert.equal(fee,principal*300n/10000n,'3% sell fee');
  assert.equal(payout,principal-fee);
  const oldBalance=await keysRead('balanceOf',[id,account.address]);
  await keysWrite(account,'sell',[id,amount,payout,deadline]);
  expectedFees+=fee;
  assert.equal(await keysRead('balanceOf',[id,account.address]),oldBalance-amount,'seller keys');
  await assertSolvent('after sell');
}
async function main() {
  token=await compileToken();
  keys=await compileWorldKeys();
  const tokenTx = await writer(ownerA).deployContract({abi:token.abi,bytecode:token.bytecode});
  tokenAddr=(await mined(tokenTx)).contractAddress;
  assert.ok(tokenAddr);
  const keysTx = await writer(ownerA).deployContract({abi:keys.abi,bytecode:keys.bytecode,args:[tokenAddr,treasury.address,curveUnit]});
  keysAddr=(await mined(keysTx)).contractAddress;
  assert.ok(keysAddr);
  const deployedCode = await reader.getCode({address:keysAddr});
  assertMatchingKeysRuntime(deployedCode,keys);
  const mutatedCode = deployedCode.slice(0,-2) + (deployedCode.endsWith('00') ? '01' : '00');
  assert.throws(()=>assertMatchingKeysRuntime(mutatedCode,keys),/KEYS_BYTECODE_MISMATCH/);
  assert.equal((await keysRead('ctrl')).toLowerCase(),tokenAddr.toLowerCase());
  assert.equal((await keysRead('developmentTreasury')).toLowerCase(),treasury.address.toLowerCase());
  assert.equal(await keysRead('curveUnit'),curveUnit);
  assert.equal(await keysRead('FEE_BPS'),300n);
  assert.equal(await keysRead('MAX_SUPPLY'),10000n);
  console.log('PASS compiler viaIR, actual deployed bytecode with masked immutables, constructor and constants');

  for(let i=0;i<2;i++) {
    assert.equal(await keysRead('worldIdFor',[worldOwners[i].address]),worldIds[i]);
    await rejected(buyer,'createWorld',[worldIds[i]],'OWNER_WORLD_ID_MISMATCH');
    const failedHash=await writer(buyer).writeContract({address:keysAddr,abi:keys.abi,functionName:'createWorld',args:[worldIds[i]],gas:200000n});
    const failedReceipt=await reader.waitForTransactionReceipt({hash:failedHash,pollingInterval:150});
    assert.equal(failedReceipt.status,'reverted');
    assert.equal(failedReceipt.logs.length,0);
    assert.deepEqual(await keysRead('worlds',[worldIds[i]]),[zeroAddress,0n,0n]);
    assert.equal(await keysRead('ownerWorld',[buyer.address]),zeroHash);
    await keysWrite(worldOwners[i],'createWorld',[worldIds[i]]);
  }
  await rejected(ownerA,'createWorld',[worldIds[0]],'OWNER_ALREADY_CREATED');
  await rejected(ownerA,'createWorld',[worldIdFor(buyer.address)],'OWNER_WORLD_ID_MISMATCH');
  await rejected(buyer,'createWorld',[worldIds[0]],'OWNER_WORLD_ID_MISMATCH');
  await rejected(buyer,'createWorld',[zeroHash],'OWNER_WORLD_ID_MISMATCH');
  await rejected(ownerA,'sell',[worldIds[0],1n,0n,BigInt(Math.floor(Date.now()/1000)+7200)]);
  assert.equal(await keysRead('balanceOf',[worldIds[0],ownerA.address]),1n);
  await assertSolvent('after world setup');
  console.log('PASS owner-derived IDs: mined attacker squatting reverts before victim registration; one permanent free key per wallet, duplicate and zero rejected');

  await mined(await writer(ownerB).writeContract({address:tokenAddr,abi:token.abi,functionName:'claim'}));
  await mined(await writer(buyer).writeContract({address:tokenAddr,abi:token.abi,functionName:'claim'}));
  const block = await reader.getBlock();
  const deadline = block.timestamp+7200n;
  await rejected(buyer,'buy',[worldIds[0],1n,parseEther('10'),deadline]);
  const [p,f,total]=await keysRead('quoteBuy',[worldIds[0],1n]);
  assert.equal(p,curveUnit);assert.equal(f,p*300n/10000n);assert.equal(total,p+f);
  await rejected(buyer,'buy',[worldIds[0],1n,total,block.timestamp-1n]);
  await rejected(buyer,'buy',[worldIds[0],1n,total-1n,deadline]);
  await rejected(buyer,'buy',[worldIds[0],0n,total,deadline]);
  await rejected(buyer,'buy',[worldIds[0],101n,parseEther('100000'),deadline]);
  await rejected(buyer,'buy',[worldIdFor(treasury.address),1n,total,deadline]);
  await rejected(buyer,'sell',[worldIds[0],1n,0n,deadline]);
  await assert.rejects(()=>keysRead('curve',[10000n,1n]));
  assert.equal(await keysRead('curve',[9999n,1n]),9999n*9999n*curveUnit);
  await assertSolvent('after failed attempts');
  console.log('PASS allowance, expiry, slippage, zero/over-limit purchases, nonexistent world, supply cap (no mutation)');

  for(const account of [ownerA,ownerB,buyer]) {
    await mined(await writer(account).writeContract({address:tokenAddr,abi:erc20Abi,functionName:'approve',args:[keysAddr,parseEther('1000')]}));
  }
  await buy(0,buyer,3n,deadline);
  const [, ,expectedPayout] = await keysRead('quoteSell',[worldIds[0],2n]);
  await rejected(buyer,'sell',[worldIds[0],2n,expectedPayout+1n,deadline]);
  await rejected(buyer,'sell',[worldIds[0],2n,0n,block.timestamp-1n]);
  await sell(0,buyer,2n,deadline);
  await buy(0,ownerA,2n,deadline);
  await rejected(ownerA,'sell',[worldIds[0],3n,0n,deadline]);
  await sell(0,ownerA,2n,deadline);
  await buy(1,buyer,2n,deadline);
  await rejected(ownerB,'sell',[worldIds[1],1n,0n,deadline]);
  await rejected(buyer,'sell',[worldIds[1],3n,0n,deadline]);
  console.log('PASS slippage and expiry sell, owner purchases then sells extras only, independent worlds');

  let seed=0x6c5c12;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let step=0;step<28;step++) {
    const i=random()%2;
    const account=accounts[random()%3];
    const holding=await keysRead('balanceOf',[worldIds[i],account.address]);
    const floor=account.address===worldOwners[i].address?1n:0n;
    const maxSell=holding-floor;
    const wantsSell=(random()%3===0) && maxSell>0n;
    const amount=BigInt(random()%3+1);
    if(wantsSell) await sell(i,account,amount<maxSell?amount:maxSell,deadline);
    else await buy(i,account,amount,deadline);
  }
  for(let i=0;i<2;i++) {
    for(const account of [ownerA,ownerB,buyer]) {
      const holding=await keysRead('balanceOf',[worldIds[i],account.address]);
      const floor=account.address===worldOwners[i].address?1n:0n;
      if(holding>floor) await sell(i,account,holding-floor,deadline);
    }
  }
  for(let i=0;i<2;i++) {
    const [,supply,reserve]=await keysRead('worlds',[worldIds[i]]);
    assert.equal(supply,1n,'only one permanent owner key remains');
    assert.equal(reserve,0n,'every purchased unit redeemable');
  }
  assert.equal(await tokenRead('balanceOf',[keysAddr]),0n);
  assert.equal(await tokenRead('balanceOf',[treasury.address]),expectedFees);
  const targetedId=worldIdFor(treasury.address);
  await rejected(buyer,'createWorld',[targetedId],'OWNER_WORLD_ID_MISMATCH');
  await keysWrite(buyer,'createWorld',[worldIdFor(buyer.address)]);
  await rejected(buyer,'createWorld',[targetedId],'OWNER_WORLD_ID_MISMATCH');
  await keysWrite(treasury,'createWorld',[targetedId]);
  assert.equal((await keysRead('worlds',[targetedId]))[0].toLowerCase(),treasury.address.toLowerCase());
  console.log('PASS attacker with its own permanent key cannot claim victim ID; victim can still register');
  console.log('PASS 28 deterministic mixed world trades, reserve formula after every mutation, treasury fee accounting and full redemption');
  console.log('WORLD_KEYS_OFFLINE_READY: no public RPC, no external wallet and no testnet or production transaction');
}
try {await main();} catch(error) {console.error(error);process.exitCode=1;} finally {await provider.disconnect();}
