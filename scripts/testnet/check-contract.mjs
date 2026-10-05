import ganache from 'ganache';
import assert from 'node:assert/strict';
import {createPublicClient,createWalletClient,custom,defineChain,parseEther,erc20Abi} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {compileToken} from './compile.mjs';
const provider=ganache.provider({chain:{chainId:46630},logging:{quiet:true}});
try{
 const chain=defineChain({id:46630,name:'Local test fixture',nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18},rpcUrls:{default:{http:[]}}});
 const accounts=Object.values(provider.getInitialAccounts()).slice(0,2).map(a=>privateKeyToAccount(a.secretKey));
 const read=createPublicClient({chain,transport:custom(provider)});const wallet=createWalletClient({account:accounts[0],chain,transport:custom(provider)});const other=createWalletClient({account:accounts[1],chain,transport:custom(provider)});
 const c=await compileToken();const tx=await wallet.deployContract({abi:c.abi,bytecode:c.bytecode});const receipt=await read.waitForTransactionReceipt({hash:tx});assert.equal(receipt.status,'success');const address=receipt.contractAddress;
 const balance=who=>read.readContract({address,abi:erc20Abi,functionName:'balanceOf',args:[who]});
 assert.equal(await balance(accounts[0].address),parseEther('64000'));
 await other.writeContract({address,abi:c.abi,functionName:'claim'});assert.equal(await balance(accounts[1].address),parseEther('64000'));
 await assert.rejects(()=>read.simulateContract({account:accounts[1],address,abi:c.abi,functionName:'claim'}));
 await wallet.writeContract({address,abi:erc20Abi,functionName:'transfer',args:[accounts[1].address,parseEther('1000')]});assert.equal(await balance(accounts[0].address),parseEther('63000'));
 await assert.rejects(()=>read.simulateContract({account:accounts[0],address,abi:erc20Abi,functionName:'transfer',args:[accounts[1].address,parseEther('999999')]}));
 await wallet.writeContract({address,abi:erc20Abi,functionName:'approve',args:[accounts[1].address,parseEther('500')]});await other.writeContract({address,abi:erc20Abi,functionName:'transferFrom',args:[accounts[0].address,accounts[1].address,parseEther('500')]});assert.equal(await balance(accounts[0].address),parseEther('62500'));
 assert.equal(await read.readContract({address,abi:erc20Abi,functionName:'totalSupply'}),parseEther('128000'));
 console.log('PASS: deploy, initial balance, claim, repeat-claim rejection, transfer, insufficient balance, allowance, supply');
}finally{await provider.disconnect();}
const mainnet=ganache.provider({chain:{chainId:4663},logging:{quiet:true}});
try{const c=await compileToken();const a=privateKeyToAccount(Object.values(mainnet.getInitialAccounts())[0].secretKey);const p=createPublicClient({transport:custom(mainnet)});await assert.rejects(()=>p.estimateGas({account:a,data:c.bytecode}));console.log('PASS: mainnet deployment rejected');}finally{await mainnet.disconnect();}
