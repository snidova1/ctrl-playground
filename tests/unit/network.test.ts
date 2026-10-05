import {describe,it,expect} from 'vitest';
import {networkFor,type PublicNetwork} from '@/config/network';
import {handleApi} from '@/server/api';
describe('network boundary',()=>{
 it('separates mainnet and testnet explicitly',()=>{expect(networkFor(46630).testnet).toBe(true);expect(networkFor(46630).id).not.toBe(networkFor(4663).id);expect(()=>networkFor(1)).toThrow('UNSUPPORTED_CHAIN');});
 it('returns public configuration without RPC credentials or signers',async()=>{const r=await handleApi(new Request('http://localhost:3000/api/network'),['network']);expect(r.status).toBe(200);const n=await r.json() as PublicNetwork;expect(n.chainId).toBe(Number(process.env.CTRL_CHAIN_ID||46630));expect(Object.keys(n).sort()).toEqual(['chainId','explorer','faucetEnabled','name','testnet','token']);});
});
