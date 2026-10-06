import {verifyAgentRegistration,healthyHeartbeat} from './validation';
import {one} from '@/db';
import {settings} from '@/server/env';
import {orbioPublic} from '@/server/providers';
import {createPublicClient,http,isAddress,erc20Abi} from 'viem';
export async function launchStatus(){
 const s=settings(),provider=orbioPublic();
 const chainCheck=async()=>{if(s.chainId!==4663||!isAddress(s.token)||!s.rpc)return false;const rpc=createPublicClient({transport:http(s.rpc,{timeout:8000,retryCount:0})});const [id,code,decimals,supply]=await Promise.all([rpc.getChainId(),rpc.getCode({address:s.token}),rpc.readContract({address:s.token,abi:erc20Abi,functionName:'decimals'}),rpc.readContract({address:s.token,abi:erc20Abi,functionName:'totalSupply'})]);return id===4663&&!!code&&code!=='0x'&&decimals<=36&&supply>BigInt(0);};
 const [balance,terms,models,chain,registration]=await Promise.allSettled([s.orbioKey?provider.balance():Promise.reject(new Error('missing')),provider.terms(),provider.models(),chainCheck(),s.agentId?provider.agent(s.agentId):Promise.reject(new Error("Agent ID required"))]);
 const heartbeat=await one<{value:string}>('SELECT value FROM system_config WHERE key=?','worker.heartbeat');let lastSeen:string|null=null;let heartbeatValue:unknown=null;try{const value:unknown=heartbeat?JSON.parse(heartbeat.value):null;heartbeatValue=value;if(value&&typeof value==='object'&&'at' in value&&typeof value.at==='string')lastSeen=value.at;}catch{/* Invalid health data stays unknown. */}
 const workerRecent=healthyHeartbeat(heartbeatValue);const agent=registration.status==='fulfilled'?verifyAgentRegistration(registration.value,s.token):null;
 const modelLive=models.status==='fulfilled'&&models.value.some(m=>m.id===s.orbioModel);
 const checks=[
 {id:'provider',name:'Orbio gateway',ready:s.mode!=='mock'&&balance.status==='fulfilled'&&Number(balance.value.available)>0,detail:balance.status==='fulfilled'?`${balance.value.available} USD available`:'Gateway balance unavailable'},
 {id:'model',name:'Model routing',ready:modelLive,detail:modelLive?s.orbioModel:s.orbioModel?'Configured model not verified in current catalogue':'Model not configured'},
 {id:'chain',name:'CTRL mainnet token',ready:chain.status==='fulfilled'&&chain.value,detail:s.chainId===46630?'Robinhood testnet / tCTRL':isAddress(s.token)?'Configured address; mainnet bytecode check must pass':'Mainnet CTRL address required'},
 {id:'registration',name:'Orbio agent registration',ready:!!agent,detail:agent?`Agent ${agent.agentId} / token match verified`:'Register CTRL on Orbio, then configure its agent ID and actual mainnet token'},
 {id:'budget',name:'Resource ceiling',ready:Number.isFinite(s.dailyCompute)&&s.dailyCompute>0,detail:`Daily compute limit: ${s.dailyCompute} USD`},
 {id:'runtime',name:'Production runtime',ready:s.mode==='production'&&s.workerSecret.length>=32&&s.origin.startsWith('https://'),detail:'Requires production mode, trusted HTTPS origin and worker authentication'},
 {id:'worker',name:'Queue service',ready:workerRecent,detail:lastSeen?`Last heartbeat ${lastSeen}`:'No external worker heartbeat. On-demand execution is available.'},
 {id:'terms',name:'Launchpad terms',ready:terms.status==='fulfilled'&&terms.value.live&&!terms.value.paused&&terms.value.pairApproved===true,detail:terms.status==='fulfilled'?(terms.value.paused?'Launchpad paused':'Current terms available'):'Terms unavailable'},
 {id:'release',name:'Public release',ready:s.publicRelease,detail:s.publicRelease?'Public release configured; verify hosting audience separately':'Preview release. Mainnet launch has not been announced.'}];
 return {mode:s.mode,chainId:s.chainId,token:isAddress(s.token)?s.token:null,checks,ready:checks.every(c=>c.ready),terms:terms.status==='fulfilled'?terms.value:null,lastWorkerHeartbeat:lastSeen,execution:workerRecent?'worker-connected':'on-demand',registration:agent,launchpadUrl:'https://www.orbio.so/launchpad',updatedAt:new Date().toISOString()};
}
