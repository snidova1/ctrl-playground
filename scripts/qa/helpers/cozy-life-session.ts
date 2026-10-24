import assert from 'node:assert/strict';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';

/** Fresh unfunded wallet, off-chain session only. Never use owner credentials or send transactions. */
export async function createCozyLifeQaSession(origin:string){
 const account=privateKeyToAccount(generatePrivateKey());
 const post=async(path:string,body:unknown,cookie='')=>fetch(`${origin}/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 const nonceResponse=await post('auth/nonce',{address:account.address});
 assert.equal(nonceResponse.status,200,`nonce: ${await nonceResponse.clone().text()}`);
 const nonce=await nonceResponse.json() as {nonce:string;message:string};
 const signature=await account.signMessage({message:nonce.message});
 const verified=await post('auth/verify',{address:account.address,nonce:nonce.nonce,signature});
 assert.equal(verified.status,200,`verify: ${await verified.clone().text()}`);
 const cookie=verified.headers.get('set-cookie')?.split(';')[0];assert(cookie,'signed wallet session cookie');
 return {address:account.address,cookie,
  get:(path:string)=>fetch(`${origin}/api/${path}`,{headers:{Cookie:cookie},signal:AbortSignal.timeout(30000)}),
  post:(path:string,body:unknown)=>post(path,body,cookie),
  async logout(){const response=await post('auth/logout',{},cookie);assert.equal(response.status,200);},
 };
}
