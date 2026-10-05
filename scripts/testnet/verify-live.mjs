import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPublicClient,http,erc20Abi,formatUnits,verifyMessage,keccak256} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
const d=JSON.parse(await readFile('deployments/robinhood-testnet.json','utf8'));
const url=process.env.CTRL_TESTNET_RPC_URL||'https://robinhood-sepolia-rpc.publicnode.com';
const client=createPublicClient({transport:http(url,{timeout:15000,retryCount:0})});
try {
 assert.equal(await client.getChainId(),46630);
 const [code,balance,receipt]=await Promise.all([client.getCode({address:d.token}),client.readContract({address:d.token,abi:erc20Abi,functionName:'balanceOf',args:[d.deployer]}),client.getTransactionReceipt({hash:d.transactionHash})]);
 assert.equal(keccak256(code),d.codeHash);assert.equal(receipt.status,'success');assert.equal(receipt.contractAddress.toLowerCase(),d.token.toLowerCase());
 const result={chainId:46630,token:d.token,deployer:d.deployer,tokenBalance:formatUnits(balance,18),deploymentVerified:true,checkedAt:new Date().toISOString()};
 if(process.env.CTRL_TESTNET_WALLET_FILE){const w=JSON.parse(await readFile(process.env.CTRL_TESTNET_WALLET_FILE,'utf8'));const a=privateKeyToAccount(w.privateKey);assert.equal(a.address,d.deployer);const message='CTRL testnet integration '+Date.now();const signature=await a.signMessage({message});assert.equal(await verifyMessage({address:a.address,message,signature}),true);result.signatureVerified=true;
 if(process.env.CTRL_TEST_APP_ORIGIN){const base=process.env.CTRL_TEST_APP_ORIGIN;const post=(route,data,cookie)=>fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
 const nonceResponse=await post('auth/nonce',{address:a.address});assert.equal(nonceResponse.status,200);const challenge=await nonceResponse.json();assert.match(challenge.message,/Chain ID: 46630/);
 const verified=await post('auth/verify',{address:a.address,nonce:challenge.nonce,signature:await a.signMessage({message:challenge.message})});assert.equal(verified.status,200);const cookie=verified.headers.get('set-cookie').split(';')[0];
 const credential=await fetch(base+'/api/account',{headers:{Cookie:cookie}});assert.equal(credential.status,200);const account=await credential.json();assert.equal(account.demo,false);assert.equal(account.chainId,46630);assert.equal(account.balance,Number(result.tokenBalance));assert.equal(account.tier,'ARCHITECT');result.accountVerified=true;result.controlCapacity=account.capacity;
 }
 }
 await writeFile('deployments/robinhood-testnet-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(e){console.error(e.shortMessage||e.message);process.exitCode=1;}
