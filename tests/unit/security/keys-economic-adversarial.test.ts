import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ganache from 'ganache';
import {createPublicClient,createWalletClient,custom,defineChain,parseEther,stringToHex,erc20Abi} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';

const require=createRequire(import.meta.url);
const solc=require('solc');
function compile(path:string,name:string){
 const source=readFileSync(path,'utf8');
 const output=JSON.parse(solc.compile(JSON.stringify({
  language:'Solidity',sources:{[name+'.sol']:{content:source}},
  settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',
   outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}
 })));
 const errors=(output.errors??[]).filter((e:{severity:string})=>e.severity==='error');
 if(errors.length)throw new Error(errors.map((e:{formattedMessage:string})=>e.formattedMessage).join('\n'));
 const contract=output.contracts[name+'.sol'][name];
 return {abi:contract.abi,bytecode:(`0x${contract.evm.bytecode.object}`) as `0x${string}`};
}
const chain=defineChain({id:46630,name:'CTRL offline Ganache',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:['http://127.0.0.1']}}});
describe('security: offline CTRL key curve invariants (no public network)',()=>{
 it('keeps owner key reserved, all buys redeemable, reserves solvent, fees 3% each way, no replay free ownership',async()=>{
  const provider=ganache.provider({chain:{chainId:46630},logging:{quiet:true}});
  try{
   const [a,b,t]=Object.values(provider.getInitialAccounts()).slice(0,3).map(v=>privateKeyToAccount(v.secretKey as `0x${string}`));
   const transport=custom(provider as any);
   const reader=createPublicClient({chain,transport});
   const owner=createWalletClient({account:a,chain,transport});
   const buyer=createWalletClient({account:b,chain,transport});
   const token=compile('contracts/CTRLTestToken.sol','CTRLTestToken');
   const keys=compile('contracts/keys/CTRLWorldKeys.sol','CTRLWorldKeys');
   async function mined(tx:Promise<`0x${string}`>){const hash=await tx;expect((await reader.waitForTransactionReceipt({hash})).status).toBe('success');}
   const tokenHash=await owner.deployContract({abi:token.abi,bytecode:token.bytecode});
   const tokenAddr=(await reader.waitForTransactionReceipt({hash:tokenHash})).contractAddress!;
   const keysHash=await owner.deployContract({abi:keys.abi,bytecode:keys.bytecode,args:[tokenAddr,t.address,parseEther('1')]});
   const keysAddr=(await reader.waitForTransactionReceipt({hash:keysHash})).contractAddress!;
   const worldId=stringToHex('security-fixture',{size:32});
   await mined(owner.writeContract({address:keysAddr,abi:keys.abi,functionName:'createWorld',args:[worldId]}));
   await expect(reader.simulateContract({account:a,address:keysAddr,abi:keys.abi,functionName:'createWorld',args:[stringToHex('second-world',{size:32})]})).rejects.toThrow();
   expect(await reader.readContract({address:keysAddr,abi:keys.abi,functionName:'balanceOf',args:[worldId,a.address]})).toBe(1n);
   await expect(reader.simulateContract({account:a,address:keysAddr,abi:keys.abi,functionName:'sell',args:[worldId,1n,0n,BigInt(Math.floor(Date.now()/1000)+3600)]})).rejects.toThrow();
   await mined(buyer.writeContract({address:tokenAddr,abi:token.abi,functionName:'claim'}));
   await mined(buyer.writeContract({address:tokenAddr,abi:erc20Abi,functionName:'approve',args:[keysAddr,parseEther('100')]}));
   const [principal,buyFee,total]=await reader.readContract({address:keysAddr,abi:keys.abi,functionName:'quoteBuy',args:[worldId,2n]}) as [bigint,bigint,bigint];
   expect(principal).toBe(parseEther('5')); // 1^2 + 2^2
   expect(buyFee).toBe(principal*300n/10000n);
   expect(total).toBe(principal+buyFee);
   const deadline=BigInt(Math.floor(Date.now()/1000)+3600);
   await mined(buyer.writeContract({address:keysAddr,abi:keys.abi,functionName:'buy',args:[worldId,2n,total,deadline]}));
   const afterBuy=await reader.readContract({address:keysAddr,abi:keys.abi,functionName:'worlds',args:[worldId]}) as [string,bigint,bigint];
   expect(afterBuy[1]).toBe(3n);
   expect(afterBuy[2]).toBe(principal);
   expect(await reader.readContract({address:tokenAddr,abi:erc20Abi,functionName:'balanceOf',args:[keysAddr]})).toBe(principal);
   const [sellPrincipal,sellFee,payout]=await reader.readContract({address:keysAddr,abi:keys.abi,functionName:'quoteSell',args:[worldId,2n]}) as [bigint,bigint,bigint];
   expect(sellPrincipal).toBe(principal);
   expect(sellFee).toBe(principal*300n/10000n);
   expect(payout).toBe(principal-sellFee);
   await mined(buyer.writeContract({address:keysAddr,abi:keys.abi,functionName:'sell',args:[worldId,2n,payout,deadline]}));
   const afterSell=await reader.readContract({address:keysAddr,abi:keys.abi,functionName:'worlds',args:[worldId]}) as [string,bigint,bigint];
   expect(afterSell[1]).toBe(1n);
   expect(afterSell[2]).toBe(0n);
   expect(await reader.readContract({address:tokenAddr,abi:erc20Abi,functionName:'balanceOf',args:[keysAddr]})).toBe(0n);
   expect(await reader.readContract({address:tokenAddr,abi:erc20Abi,functionName:'balanceOf',args:[t.address]})).toBe(buyFee+sellFee);
   expect(await reader.readContract({address:keysAddr,abi:keys.abi,functionName:'balanceOf',args:[worldId,a.address]})).toBe(1n);
   await expect(reader.simulateContract({account:b,address:keysAddr,abi:keys.abi,functionName:'quoteBuy',args:[worldId,101n]})).rejects.toThrow();
  }finally{await provider.disconnect();}
 },120000);
});
