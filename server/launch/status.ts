import {one} from '@/db';
import {settings} from '@/server/env';
import {orbioPublic} from '@/server/providers';
import {createPublicClient,http,isAddress} from 'viem';
export async function launchStatus(){
 const s=settings(),provider=orbioPublic();
 const chainCheck=async()=>{if(s.chainId!==4663||!isAddress(s.token)||!s.rpc)return false;const rpc=createPublicClient({transport:http(s.rpc,{timeout:8000,retryCount:0})});const [id,code]=await Promise.all([rpc.getChainId(),rpc.getCode({address:s.token})]);return id===4663&&!!code&&code!=='0x';};
 const [balance,terms,models,chain]=await Promise.allSettled([s.orbioKey?provider.balance():Promise.reject(new Error('missing')),provider.terms(),provider.models(),chainCheck()]);
 const heartbeat=await one<{value:string}>('SELECT value FROM system_config WHERE key=?','worker.heartbeat');let lastSeen:string|null=null;try{const value:unknown=heartbeat?JSON.parse(heartbeat.value):null;if(value&&typeof value==='object'&&'at' in value&&typeof value.at==='string')lastSeen=value.at;}catch{/* Invalid health data stays unknown. */}
 const age=lastSeen?Date.now()-Date.parse(lastSeen):Infinity,workerRecent=age>=0&&age<90000;
 const modelLive=models.status==='fulfilled'&&models.value.some(m=>m.id===s.orbioModel);
 const checks=[
 {id:'provider',name:'Orbio gateway',ready:s.mode!=='mock'&&balance.status==='fulfilled'&&Number(balance.value.available)>0,detail:balance.status==='fulfilled'?`${balance.value.available} USD available`:'Gateway balance unavailable'},
 {id:'model',name:'Model routing',ready:modelLive,detail:modelLive?s.orbioModel:s.orbioModel?'Configured model not verified in current catalogue':'Model not configured'},
 {id:'chain',name:'CTRL mainnet token',ready:chain.status==='fulfilled'&&chain.value,detail:s.chainId===46630?'Robinhood testnet / tCTRL':isAddress(s.token)?'Configured address; mainnet bytecode check must pass':'Mainnet CTRL address required'},
 {id:'worker',name:'Queue service',ready:workerRecent,detail:lastSeen?`Last heartbeat ${lastSeen}`:'No external worker heartbeat. On-demand execution is available.'},
 {id:'terms',name:'Launchpad terms',ready:terms.status==='fulfilled'&&terms.value.live&&!terms.value.paused,detail:terms.status==='fulfilled'?(terms.value.paused?'Launchpad paused':'Current terms available'):'Terms unavailable'},
 {id:'release',name:'Public release',ready:s.publicRelease,detail:s.publicRelease?'Public release configured; verify hosting audience separately':'Preview release. Mainnet launch has not been announced.'}];
 return {mode:s.mode,chainId:s.chainId,token:isAddress(s.token)?s.token:null,checks,ready:checks.every(c=>c.ready),terms:terms.status==='fulfilled'?terms.value:null,lastWorkerHeartbeat:lastSeen,execution:'on-demand',launchpadUrl:'https://www.orbio.so/launchpad',updatedAt:new Date().toISOString()};
}
