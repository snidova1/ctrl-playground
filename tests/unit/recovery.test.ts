import {it,expect} from 'vitest';
import {exec,one} from '@/db';
import {quarantineExpiredMissions} from '@/server/missions/recovery';
it('quarantines expired execution without refunding or redispatching unknown paid work',async()=>{
 const owner=crypto.randomUUID(),id=`CTRL-${crypto.randomUUID().slice(0,8)}`,now=Date.now();
 await exec('INSERT INTO users(id,demo,created_at) VALUES(?,0,?)',owner,new Date(now).toISOString());
 await exec("INSERT INTO missions(id,command,owner_id,creator,created_at,status,kind,visibility,budget,feasibility,lease_owner,lease_until,consumed) VALUES(?,?,?,?,?,'REASONING','research','public',.2,'READY','lost-worker',?,.01)",id,'Find a public archive of old maps.',owner,'TEST',new Date(now).toISOString(),now-300000);
 await exec("INSERT INTO compute_reservations(mission_id,period,budget,state) VALUES(?,'.test',.2,'held')",id);
 expect(await quarantineExpiredMissions(now)).toContain(id);
 expect(await one('SELECT status,error FROM missions WHERE id=?',id)).toMatchObject({status:'FAILED',error:'EXECUTION_INTERRUPTED_SETTLEMENT_REQUIRED'});
 expect(await one('SELECT cost,state FROM compute_reservations WHERE mission_id=?',id)).toEqual({cost:null,state:'unknown'});
 expect(await quarantineExpiredMissions(now)).not.toContain(id);
});
