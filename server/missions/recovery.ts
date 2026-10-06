import {exec,query} from '@/db';
import {event} from './repository';
import {settleCompute} from './budget';
/** Never retry paid work after an unknown interruption. Retain its reservation. */
export async function quarantineExpiredMissions(now=Date.now()){
 const cutoff=now-120000;
 const rows=await query<{id:string;consumed:number}>("SELECT id,consumed FROM missions WHERE lease_owner IS NOT NULL AND lease_until>0 AND lease_until<? AND status NOT IN ('COMPLETE','FAILED','OPEN','REVIEW') LIMIT 20",cutoff);
 const recovered:string[]=[];
 for(const row of rows){const changed=await exec("UPDATE missions SET status='FAILED',error='EXECUTION_INTERRUPTED_SETTLEMENT_REQUIRED',finished_at=?,lease_until=0 WHERE id=? AND lease_until>0 AND lease_until<? AND status NOT IN ('COMPLETE','FAILED')",new Date(now).toISOString(),row.id,cutoff);if(!changed.meta.changes)continue;await settleCompute(row.id,row.consumed,false);await event(row.id,'mission.failed','FAILED','Execution lease expired. Reservation retained; inspect provider settlement before submitting again.');recovered.push(row.id);}
 await exec('DELETE FROM sessions WHERE expires_at<?',now);await exec('DELETE FROM nonces WHERE expires_at<?',now);await exec('DELETE FROM rate_limits WHERE expires_at<?',now-60000);
 return recovered;
}
