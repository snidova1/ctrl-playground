import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createPublicClient,createWalletClient,http,defineChain,formatEther,parseEther,keccak256} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {compileToken} from './compile.mjs';
const url=process.env.CTRL_TESTNET_RPC_URL||'https://rpc.testnet.chain.robinhood.com';
const chain=defineChain({id:46630,name:'Robinhood Chain Testnet',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:[url]}}});
const client=createPublicClient({chain,transport:http(url,{timeout:12000,retryCount:0})});
try {
 if(await client.getChainId()!==46630)throw new Error('WRONG_CHAIN: only Robinhood testnet is permitted');
 const file=process.env.CTRL_TESTNET_WALLET_FILE;if(!file)throw new Error('CTRL_TESTNET_WALLET_FILE required (outside repository)');
 const secret=JSON.parse(await readFile(file,'utf8'));const account=privateKeyToAccount(secret.privateKey);
 if(account.address.toLowerCase()!==secret.address.toLowerCase())throw new Error('WALLET_MISMATCH');
 const balance=await client.getBalance({address:account.address});console.log(JSON.stringify({chainId:46630,address:account.address,balanceETH:formatEther(balance)}));
 try{await readFile('deployments/robinhood-testnet-pending.json');throw new Error('DEPLOYMENT_ALREADY_RECORDED: inspect existing transaction before deploying again');}catch(e){if(e.code!=='ENOENT')throw e;}
 const artifact=await compileToken();
 const gasPrice=await client.getGasPrice();const gas=await client.estimateGas({account,data:artifact.bytecode});
 const maxCost=gas*gasPrice*2n;const ceiling=parseEther('0.002');
 if(maxCost>ceiling||balance<maxCost)throw new Error('DEPLOY_BUDGET_EXCEEDED_OR_UNFUNDED');
 const wallet=createWalletClient({account,chain,transport:http(url,{timeout:12000,retryCount:0})});
 // Store the hash immediately. Never automatically retry a possibly broadcast transaction.
 const transactionHash=await wallet.deployContract({abi:artifact.abi,bytecode:artifact.bytecode,gas:gas*12n/10n,gasPrice});
 await mkdir('deployments',{recursive:true});
 await writeFile('deployments/robinhood-testnet-pending.json',JSON.stringify({chainId:46630,transactionHash,deployer:account.address},null,2));
 console.log(JSON.stringify({transactionHash}));
 const receipt=await client.waitForTransactionReceipt({hash:transactionHash,timeout:120000});
 if(receipt.status!=='success'||!receipt.contractAddress)throw new Error('DEPLOYMENT_FAILED');
 const code=await client.getCode({address:receipt.contractAddress});if(code!==artifact.runtime)throw new Error('BYTECODE_MISMATCH');
 const record={chainId:46630,token:receipt.contractAddress,transactionHash,block:receipt.blockNumber.toString(),deployer:account.address,compiler:artifact.compiler,codeHash:keccak256(code),gasUsed:receipt.gasUsed.toString(),testnetOnly:true};
 await writeFile('deployments/robinhood-testnet.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
} catch(error){console.error(error.shortMessage||error.message);process.exitCode=1;}
