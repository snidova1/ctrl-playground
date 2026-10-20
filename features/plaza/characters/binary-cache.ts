import {characterBudgets} from './catalog';
/** Share immutable bytes, never mutable VRM/skeleton instances. Each caller can cancel independently. */
export function createCharacterBinaryCache(fetcher:typeof fetch=fetch){
 const cache=new Map<string,Promise<ArrayBuffer>>();
 return async (url:string,signal?:AbortSignal):Promise<ArrayBuffer>=>{
  if(!url.startsWith('/plaza/characters/')||url.includes('..')||url.includes('?'))throw new Error('Character source is not approved.');
  signal?.throwIfAborted();let pending=cache.get(url);
  if(!pending){pending=(async()=>{const response=await fetcher(url);if(!response.ok)throw new Error('Character file is unavailable.');if(Number(response.headers.get('content-length'))>characterBudgets.maxAssetBytes)throw new Error('Character exceeds the file budget.');const b=await response.arrayBuffer();if(b.byteLength>characterBudgets.maxAssetBytes)throw new Error('Character exceeds the file budget.');return b;})();cache.set(url,pending);pending.catch(()=>cache.delete(url));}
  if(!signal)return pending;
  let cancel:()=>void=()=>{};const aborted=new Promise<ArrayBuffer>((_,reject)=>{cancel=()=>reject(signal.reason??new DOMException('Aborted','AbortError'));signal.addEventListener('abort',cancel,{once:true});});
  try{return await Promise.race([pending,aborted]);}finally{signal.removeEventListener('abort',cancel);}
 };
}
