#!/usr/bin/env node
// CLI integration on localhost Ganache with throwaway keys and temp files only.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import ganache from 'ganache';
import {createPublicClient,createWalletClient,http,defineChain,keccak256} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {compileToken} from './compile.mjs';

const execFileAsync=promisify(execFile);
const deployScript=fileURLToPath(new URL('./world-keys-deploy.mjs',import.meta.url));
const verifyScript=fileURLToPath(new URL('./world-keys-verify.mjs',import.meta.url));
const workspace=await mkdtemp(join(tmpdir(),'ctrl-keys-offline-'));
const server=ganache.server({chain:{chainId:46630},miner:{defaultGasPrice:100000000},logging:{quiet:true}});
let otherServer=null;
try {
  await server.listen(0,'127.0.0.1');
  const url='http://127.0.0.1:'+server.address().port;
  const chain=defineChain({id:46630,name:'Isolated localhost testnet',nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18},rpcUrls:{default:{http:[url]}}});
  const reader=createPublicClient({chain,transport:http(url)});
  const walletData=Object.values(server.provider.getInitialAccounts());
  const account=privateKeyToAccount(walletData[0].secretKey);
  const treasury=privateKeyToAccount(walletData[1].secretKey);
  const writer=createWalletClient({account,chain,transport:http(url)});
  const fixture=await compileToken();
  const receipt=await reader.waitForTransactionReceipt({hash:await writer.deployContract({abi:fixture.abi,bytecode:fixture.bytecode}),pollingInterval:100});
  assert.equal(receipt.status,'success');
  const tokenAddress=receipt.contractAddress;
  await mkdir(join(workspace,'deployments'));
  const fixturePath=join(workspace,'deployments/robinhood-testnet.json');
  const goodFixture=JSON.stringify({chainId:46630,testnetOnly:true,token:tokenAddress});
  await writeFile(fixturePath,goodFixture);
  const walletPath=join(workspace,'test-wallet.json');
  await writeFile(walletPath,JSON.stringify({address:account.address,privateKey:walletData[0].secretKey}),{mode:0o600});
  const env={...process.env,CTRL_TESTNET_RPC_URL:url,CTRL_TESTNET_WALLET_FILE:walletPath,CTRL_KEYS_TREASURY:treasury.address,CTRL_KEYS_CURVE_UNIT_WEI:'1000000000000000',CTRL_KEYS_DEBUG:'1'};
  async function invoke(file,args=[],extra={}) {
    try {
      const r=await execFileAsync(process.execPath,[file,...args],{cwd:workspace,env:{...env,...extra},timeout:60000,maxBuffer:1000000});
      return {ok:true,stdout:r.stdout,stderr:r.stderr};
    } catch(e) {return {ok:false,stdout:e.stdout??'',stderr:e.stderr??'',error:e.message};}
  }
  async function rejectWith(file,args,reason,extra={}) {
    const result=await invoke(file,args,extra);
    assert.equal(result.ok,false,'Expected rejection '+reason);
    assert.match(result.stderr,new RegExp(reason),'unexpected failure reason '+result.stderr);
  }
  await rejectWith(deployScript,['--broadcast'],'BROADCAST_CONFIRMATION_REQUIRED');
  await rejectWith(deployScript,['--unknown-flag'],'INVALID_ARGUMENTS');
  await rejectWith(deployScript,[],'CTRL_TESTNET_WALLET_FILE_REQUIRED',{CTRL_TESTNET_WALLET_FILE:''});
  await writeFile(fixturePath,JSON.stringify({chainId:46630,testnetOnly:true,token:'0x0000000000000000000000000000000000001234'}));
  await rejectWith(deployScript,[],'TOKEN_CONTRACT_NOT_FOUND');
  await writeFile(fixturePath,goodFixture);
  otherServer=ganache.server({chain:{chainId:4663},logging:{quiet:true}});
  await otherServer.listen(0,'127.0.0.1');
  const wrongUrl='http://127.0.0.1:'+otherServer.address().port;
  await rejectWith(deployScript,[],'WRONG_CHAIN',{CTRL_TESTNET_RPC_URL:wrongUrl});
  console.log('PASS broadcast guard, unknown args, absent wallet, missing token code, wrong chain');

  const before=await reader.getTransactionCount({address:account.address});
  const dry=await invoke(deployScript,['--dry-run']);
  assert.equal(dry.ok,true,dry.stderr);
  assert.match(dry.stdout,/DRY_RUN_OK: no transaction sent/);
  assert.equal(await reader.getTransactionCount({address:account.address}),before);
  await assert.rejects(()=>readFile(join(workspace,'deployments/robinhood-worldkeys-pending.json')),{code:'ENOENT'});
  console.log('PASS dry-run with a genuine local RPC, zero transactions sent');

  const result=await invoke(deployScript,['--broadcast'],{CTRL_KEYS_BROADCAST_CONFIRM:'TESTNET_ONLY'});
  assert.equal(result.ok,true,result.stderr);
  assert.match(result.stdout,/"verified":true/);
  const record=JSON.parse(await readFile(join(workspace,'deployments/robinhood-worldkeys.json'),'utf8'));
  const pending=JSON.parse(await readFile(join(workspace,'deployments/robinhood-worldkeys-pending.json'),'utf8'));
  assert.equal(pending.transactionHash,record.transactionHash);
  assert.equal(record.token.toLowerCase(),tokenAddress.toLowerCase());
  assert.equal(record.treasury.toLowerCase(),treasury.address.toLowerCase());
  assert.equal(record.curveUnitWei,env.CTRL_KEYS_CURVE_UNIT_WEI);
  assert.equal(record.codeHash,keccak256(await reader.getCode({address:record.worldKeys})));
  await assert.rejects(()=>readFile(join(workspace,'deployments/.worldkeys-deploy.lock')),{code:'ENOENT'});
  assert.equal(await reader.getTransactionCount({address:account.address}),before+1);
  console.log('PASS broadcast to LOCALHOST GANACHE ONLY, constructor, code hash, pending/final records, release lock');

  const verified=await invoke(verifyScript);
  assert.equal(verified.ok,true,verified.stderr);
  const report=JSON.parse(verified.stdout);
  assert.equal(report.verified,true);
  assert.equal(report.readOnly,true);
  assert.equal(report.worldKeys.toLowerCase(),record.worldKeys.toLowerCase());
  assert.equal(await reader.getTransactionCount({address:account.address}),before+1);
  await rejectWith(deployScript,[],'DEPLOYMENT_ALREADY_RECORDED');
  const recordPath=join(workspace,'deployments/robinhood-worldkeys.json');
  await writeFile(recordPath,JSON.stringify({...record,treasury:'0x0000000000000000000000000000000000005678'}));
  await rejectWith(verifyScript,[],'TREASURY_MISMATCH');
  await writeFile(recordPath,JSON.stringify({...record,codeHash:'0x'+'ee'.repeat(32)}));
  await rejectWith(verifyScript,[],'KEYS_CODE_HASH_MISMATCH');
  await writeFile(recordPath,JSON.stringify(record));
  await rejectWith(verifyScript,[],'WRONG_CHAIN',{CTRL_TESTNET_RPC_URL:wrongUrl});
  console.log('PASS read-only verifier, no writes, duplicate deployment blocked, tampered treasury and code hash rejected, wrong chain rejected');
  console.log('WORLDKEYS_CLI_OFFLINE_GREEN: all chain requests limited to localhost');
} finally {
  if(otherServer)await otherServer.close().catch(()=>{});
  await server.close().catch(()=>{});
  await rm(workspace,{recursive:true,force:true});
}
