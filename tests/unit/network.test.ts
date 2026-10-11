import {describe,it,expect,afterEach,vi} from 'vitest';
import {networkFor,type PublicNetwork} from '@/config/network';
import {handleApi} from '@/server/api';
describe('network boundary',()=>{
 afterEach(()=>vi.unstubAllEnvs());
 it('separates mainnet and testnet explicitly',()=>{expect(networkFor(46630).testnet).toBe(true);expect(networkFor(46630).id).not.toBe(networkFor(4663).id);expect(()=>networkFor(1)).toThrow('UNSUPPORTED_CHAIN');});
 it('returns public configuration without RPC credentials or signers',async()=>{const r=await handleApi(new Request('http://localhost:3000/api/network'),['network']);expect(r.status).toBe(200);const n=await r.json() as PublicNetwork;expect(n.chainId).toBe(Number(process.env.CTRL_CHAIN_ID||46630));expect(Object.keys(n).sort()).toEqual(['chainId','explorer','faucetEnabled','name','testnet','token','walletConnectProjectId']);});
 it('reads the public pairing ID at request time without exposing server credentials',async()=>{
  const read=async()=>await (await handleApi(new Request('http://localhost:3000/api/network'),['network'])).json() as PublicNetwork;
  vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID','a'.repeat(32));
  vi.stubEnv('ORBIO_API_KEY','private-test-credential');
  expect((await read()).walletConnectProjectId).toBe('a'.repeat(32));
  vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID','b'.repeat(32));
  expect((await read()).walletConnectProjectId).toBe('b'.repeat(32));
  expect(JSON.stringify(await read())).not.toContain('private-test-credential');
  vi.stubEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID','invalid');
  expect((await read()).walletConnectProjectId).toBeNull();
 });
});
