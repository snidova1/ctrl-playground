import {defineChain} from 'viem';
import {robinhood} from 'viem/chains';
export const robinhoodTestnet=defineChain({id:46630,name:'Robinhood Chain Testnet',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:['https://robinhood-sepolia-rpc.publicnode.com','https://rpc.testnet.chain.robinhood.com']}},blockExplorers:{default:{name:'Blockscout',url:'https://explorer.testnet.chain.robinhood.com'}},testnet:true});
export function networkFor(id:number){if(id===46630)return robinhoodTestnet;if(id===4663)return robinhood;throw new Error('UNSUPPORTED_CHAIN');}
export interface PublicNetwork {chainId:number;name:string;testnet:boolean;token:`0x${string}`|null;explorer:string;faucetEnabled:boolean}
