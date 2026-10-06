import {z} from 'zod';
const address=z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const agent=z.object({agentId:z.string(),token:address,owner:address,agentWallet:address,launchTx:z.string().regex(/^0x[0-9a-fA-F]{64}$/)});
export function verifyAgentRegistration(value:unknown,token:string){const result=agent.safeParse(value);return result.success&&result.data.token.toLowerCase()===token.toLowerCase()?result.data:null;}
export function healthyHeartbeat(value:unknown,now=Date.now()){if(!value||typeof value!=='object'||!('healthy' in value)||value.healthy!==true||!('at' in value)||typeof value.at!=='string')return false;const age=now-Date.parse(value.at);return age>=0&&age<180000;}
